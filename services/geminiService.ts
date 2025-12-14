import { Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews, logSystemError } from "./storageService";
import { generateLocalResponse, isLocalAIReady } from "./localAIService";

// --- RATE LIMIT CONFIGURATION (TRAFFIC CONTROLLER) ---

const RATE_LIMIT_DELAY = 2000; // Reduced delay for 1.5 Flash (higher rate limits)
let lastCallTime = 0;
let queuePromise = Promise.resolve();

// This function ensures requests wait for their turn (Queue System)
const enqueueRequest = <T>(task: () => Promise<T>): Promise<T> => {
    const nextTask = queuePromise.then(async () => {
        const now = Date.now();
        const timeSinceLast = now - lastCallTime;
        
        if (timeSinceLast < RATE_LIMIT_DELAY) {
            const waitTime = RATE_LIMIT_DELAY - timeSinceLast;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        lastCallTime = Date.now();
        return task();
    });

    queuePromise = nextTask.catch(() => {}).then(() => {});
    return nextTask;
};

let isQuotaExhausted = false;
let quotaResetTime = 0;

const checkQuota = () => {
    if (isQuotaExhausted) {
        if (Date.now() > quotaResetTime) {
            isQuotaExhausted = false; 
            return true;
        }
        return false; 
    }
    return true;
};

// --- BACKEND CONNECTION SETUP ---
const BASE_URL = process.env.BACKEND_URL || "";

// --- GEMINI CALL HANDLER (SECURE BACKEND ONLY) ---
const callGeminiBackendRaw = async (params: { model: string, contents: any, config?: any }) => {
  if (!checkQuota()) throw new Error("QUOTA_COOL_DOWN");

  try {
    const endpoint = `${BASE_URL}/api/ai/generate`.replace('//api', '/api'); 
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get("content-type");
    let result;
    
    if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
    } else {
        const text = await response.text();
        console.error("Backend Error Response:", text);
        logSystemError('API_FAIL', 'Backend returned non-JSON response', { status: response.status, text: text.substring(0, 100) });
        throw new Error(`Server Error: Backend unavailable.`);
    }

    if (!result.success) {
      const errorMsg = result.error || 'Unknown AI Error';
      
      if (response.status === 429 || 
          response.status === 503 || 
          errorMsg.includes('429') || 
          errorMsg.includes('Quota') ||
          errorMsg.includes('Resource exhausted')) {
          
          console.warn("⚠️ Quota Exceeded (429/503). Triggering Cool Down.");
          logSystemError('API_FAIL', 'Quota Exceeded (429)', { error: errorMsg });
          isQuotaExhausted = true;
          quotaResetTime = Date.now() + 30000; // 30s Cooldown
          throw new Error("QUOTA_EXCEEDED");
      }
      
      logSystemError('API_FAIL', 'AI Generation Failed', { error: errorMsg });
      throw new Error(errorMsg);
    }
    
    return { text: result.data }; 
  } catch (error: any) {
    if (error.message === "QUOTA_EXCEEDED" || error.message === "QUOTA_COOL_DOWN") throw error;
    console.error("Secure AI Call Failed:", error);
    if (!error.message.includes('Quota')) {
        logSystemError('ERROR', 'Network/Fetch Error in Gemini Service', { msg: error.message });
    }
    throw error;
  }
};

// --- GROQ BACKEND CALL ---
const callGroqBackendRaw = async (promptText: string, isJson: boolean) => {
    const apiKey = localStorage.getItem('groq_api_key');
    const keyToUse = apiKey;

    const messages = [
        { role: 'system', content: isJson ? "You are a helpful assistant. Output JSON only." : "You are a helpful assistant." },
        { role: 'user', content: promptText }
    ];

    if (keyToUse) {
        try {
            const body: any = { 
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: 0.3
            };
            if (isJson) body.response_format = { type: "json_object" };

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${keyToUse}`, "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            return { text: data.choices[0].message.content };
        } catch (e) {
            // Fallthrough
        }
    }

    try {
        const endpoint = `${BASE_URL}/api/ai/groq`.replace('//api', '/api');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                jsonMode: isJson
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Groq Failed");
        
        return { text: result.data.choices[0].message.content };
    } catch (e: any) {
        logSystemError('API_FAIL', 'Groq Call Failed', { msg: e.message });
        throw e;
    }
};

// --- MASTER CONTROLLER (SWITCHER) ---
const generateWithSwitcher = async (contents: any, isJson: boolean = true, temperature: number = 0.3): Promise<any> => {
    const preferredProvider = localStorage.getItem('selected_ai_provider') || 'gemini';
    const hasImage = typeof contents === 'object' && contents.parts && contents.parts.some((p: any) => p.inlineData);

    let promptText = "";
    if (typeof contents === 'string') promptText = contents;
    else if (contents.parts) promptText = contents.parts.map((p: any) => p.text).join('\n');
    else if (Array.isArray(contents)) promptText = contents.map((p: any) => p.parts?.[0]?.text).join('\n');

    // 2. Try Local AI
    if (preferredProvider === 'local' && !hasImage && isLocalAIReady()) {
        try {
            console.log("⚡ Using Local Device AI");
            const localResp = await generateLocalResponse(promptText, isJson);
            if (isJson) return JSON.parse(cleanJson(localResp));
            return localResp;
        } catch (e) {
            console.warn("Local AI failed, falling back to Cloud", e);
        }
    }

    // 3. Try Groq
    if (preferredProvider === 'groq' && !hasImage) {
        try {
            const groqResp = await enqueueRequest(() => callGroqBackendRaw(promptText, isJson));
            const text = groqResp.text || (isJson ? "{}" : "");
            logSystemError('INFO', 'Used Groq (Llama-3)', { mode: 'fast' });
            if (isJson) return JSON.parse(cleanJson(text));
            return text;
        } catch (groqError) {
            console.warn("⚠️ Groq Failed, falling back to Gemini...", groqError);
        }
    }

    // 4. Try Deep Research
    if (preferredProvider === 'deep-research') {
        try {
            let deepContents = contents;
            if (typeof contents === 'string') {
                deepContents = contents + "\n\nIMPORTANT: Return the result in valid JSON format inside a markdown code block.";
            } else if (contents.parts) {
                deepContents = {
                    ...contents,
                    parts: contents.parts.map((p: any) => 
                        p.text ? { ...p, text: p.text + "\n\nIMPORTANT: Return valid JSON inside markdown." } : p
                    )
                };
            }
            const result = await generateWithGemini(deepContents, isJson, temperature, 'gemini-3-pro-preview', 10000);
            logSystemError('INFO', 'Used Deep Research (Gemini 3.0)', { budget: 10000 });
            return result;
        } catch (deepError) {
            console.warn("⚠️ Deep Research Failed, falling back to Standard Gemini...", deepError);
        }
    }

    // 5. Default: Gemini 1.5 Flash (Stable)
    // Switched from 2.5 to 1.5 for stability
    const result = await generateWithGemini(contents, isJson, temperature, 'gemini-1.5-flash');
    logSystemError('INFO', 'Used Gemini 1.5 Flash', { mode: 'standard' });
    return result;
};

const commonConfig = {
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
};

const generateWithGemini = async (
    contents: any, 
    isJson: boolean = true, 
    temperature: number = 0.3,
    model: string = 'gemini-1.5-flash',
    thinkingBudget?: number
): Promise<any> => {
    if (!checkQuota()) throw new Error("QUOTA_EXCEEDED");
    
    const config: any = { 
        ...commonConfig, 
        temperature: temperature, 
        responseMimeType: isJson ? "application/json" : "text/plain" 
    };

    if (thinkingBudget) {
        config.thinkingConfig = { thinkingBudget };
        delete config.responseMimeType;
    }

    const wrappedCall = () => callGeminiBackendRaw({
        model: model,
        contents: contents,
        config: config
    });

    try {
        const response = await enqueueRequest(wrappedCall);

        const text = response.text || (isJson ? "{}" : "");
        if (isJson) {
            try {
                return JSON.parse(cleanJson(text));
            } catch (jsonError) {
                console.warn(`Invalid JSON returned.`, jsonError);
                logSystemError('ERROR', 'Invalid JSON from AI', { textFragment: text.substring(0, 50) });
                throw new Error("Invalid JSON");
            }
        }
        return text;
    } catch (e: any) {
        throw e;
    }
};

// --- HELPER FUNCTIONS ---

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const cleanJson = (text: string) => {
  if (!text) return "[]";
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
      return jsonBlockMatch[1].trim();
  }
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
  else if (firstBrace !== -1) start = firstBrace;
  else start = firstBracket;
  
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  
  if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
  return cleaned.trim();
};

const safeOptions = (opts: any): string[] => {
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') return opts.split(',').map(s => s.trim());
    return ["Option A", "Option B", "Option C", "Option D"];
};

const getSubjectConstraint = (subject: string): string => {
    const s = subject.toLowerCase();
    if (s.includes('history')) return "STRICTLY History (Ancient, Medieval, Modern, Art & Culture).";
    if (s.includes('polity') || s.includes('civics')) return "STRICTLY Polity, Constitution, Governance.";
    return `STRICTLY ${subject}.`;
};

// --- EXPORTS ---

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const needed = count - officialQs.length;
  const requestCount = Math.max(needed, 5); 
  
  const basePrompt = `
      ACT AS A STRICT EXAMINER for ${exam}.
      SUBJECT: ${subject}.
      CONSTRAINT: ${getSubjectConstraint(subject)}
      DIFFICULTY: ${difficulty}.
      ${topics.length > 0 ? `SPECIFIC TOPICS: ${topics.join(', ')}` : ''}
      Create distinct, high-quality MCQs.
      OUTPUT FORMAT (JSON ARRAY ONLY):
      [ { "text": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." } ]
  `;

  let aiQuestions: Question[] = [];

  try {
      const batchData = await generateWithSwitcher(`${basePrompt} \n Generate ${requestCount} questions.`, true, 0.4);
      let items = Array.isArray(batchData) ? batchData : (batchData.questions || []);
      
      aiQuestions = items.map((q: any) => ({
          ...q,
          text: q.text || q.question,
          textHindi: q.text_hi,
          id: generateId('ai-q'),
          source: QuestionSource.PYQ_AI,
          examType: exam as ExamType,
          subject: subject,
          type: QuestionType.MCQ,
          options: safeOptions(q.options),
          correctIndex: q.correctIndex ?? 0
      }));
  } catch (e) {
      console.warn("AI Generation Failed (Quota/Error), using fallback.");
  }

  const finalQuestions = [...officialQs, ...aiQuestions];
  if (finalQuestions.length === 0) {
      return MOCK_QUESTIONS_FALLBACK.map((q, i) => ({
          ...q, id: generateId(`fall-${i}`), examType: exam as ExamType, subject: subject
      })) as unknown as Question[];
  }
  return finalQuestions;
};

export const generateFullPaper = async (exam: string, subject: string, difficulty: string, seed: string, config: any): Promise<QuestionPaper | null> => {
    try {
        const blueprintPromptText = `
            Create Mock Paper Blueprint for ${exam} (${subject}).
            Difficulty: ${difficulty}.
            Config: ${config.mcqCount || 10} MCQs.
            OUTPUT JSON: { "title": "", "totalMarks": 100, "duration": 60, "sections": [{ "title": "Sec A", "questionCount": ${config.mcqCount}, "type": "MCQ" }] }
        `;

        let blueprint = await generateWithSwitcher(blueprintPromptText, true, 0.2);
        if (!blueprint || !blueprint.sections) throw new Error("Invalid Blueprint");

        const filledSections = [];
        for (const [sIdx, sec] of blueprint.sections.entries()) {
            
            // STRICT GENERATION LOGIC
            let qPromptText = "";
            let temperature = 0.3; // Default low temp for accuracy

            if (config.syllabus && config.syllabus.data) {
                // If syllabus provided: VERY STRICT
                qPromptText = `
                    CRITICAL: You are an examiner for ${exam}. 
                    Generate ${sec.questionCount} ${sec.type} questions STRICTLY based ONLY on the provided syllabus document/image.
                    Do not include questions from topics not present in the document.
                    If the document has limited content, create deep conceptual questions from that specific content only.
                    Ensure 100% accuracy. No false generation.
                    Return valid JSON Array.
                `;
                temperature = 0.2; // Lower temp for strictness
            } else {
                // No syllabus: Standard Exam Generation
                qPromptText = `
                    Generate ${sec.questionCount} ${sec.type} questions for ${exam} (${subject}).
                    Follow the standard ${exam} exam pattern and difficulty level (${difficulty}).
                    Verify all facts. Do not generate ambiguous questions.
                    Return valid JSON Array.
                `;
            }

            let questions = [];
            try {
                if (config.syllabus && config.syllabus.data) {
                     const contents = { parts: [
                         { inlineData: { mimeType: config.syllabus.mimeType, data: config.syllabus.data } },
                         { text: qPromptText }
                     ]};
                     questions = await generateWithSwitcher(contents, true, temperature);
                } else {
                    questions = await generateWithSwitcher(qPromptText, true, temperature);
                }
            } catch (e) {
                questions = MOCK_QUESTIONS_FALLBACK.slice(0, sec.questionCount);
            }

            if (!Array.isArray(questions) && (questions as any).questions) questions = (questions as any).questions;

            filledSections.push({
                id: `sec-${sIdx}`,
                title: sec.title,
                instructions: sec.instructions || "Attempt all",
                marksPerQuestion: sec.marksPerQuestion || 1,
                questions: (questions || []).map((q: any, qIdx: number) => ({
                    id: generateId(`p-q-${sIdx}-${qIdx}`),
                    text: q.text || q.question || "Question",
                    options: safeOptions(q.options),
                    correctIndex: 0,
                    answer: q.answer,
                    explanation: q.explanation,
                    type: QuestionType.MCQ,
                    examType: exam as ExamType,
                    source: QuestionSource.PYQ_AI,
                    createdAt: Date.now(),
                    marks: sec.marksPerQuestion
                }))
            });
        }

        return {
            id: generateId('paper'),
            title: blueprint.title || `${exam} Mock`,
            examType: exam as ExamType,
            subject: subject,
            difficulty: difficulty,
            totalMarks: blueprint.totalMarks || 100,
            durationMinutes: blueprint.duration || 60,
            sections: filledSections,
            createdAt: Date.now()
        };
    } catch (e) { 
        return null;
    }
};

export const generateCurrentAffairs = async (exam: string, count: number = 10): Promise<Question[]> => {
  const officialCA = await getOfficialQuestions(exam, 'Current Affairs', count);
  if (officialCA.length >= count) return officialCA;

  try {
      const prompt = `Generate 15 Current Affairs MCQs for ${exam} India (Latest). JSON Array.`;
      const aiData = await generateWithSwitcher(prompt, true, 0.2);
      
      const aiQs = aiData.map((q: any) => ({
          id: generateId('ca-q'),
          text: q.text || q.question,
          options: safeOptions(q.options),
          correctIndex: q.correctIndex || 0,
          explanation: q.explanation,
          source: QuestionSource.PYQ_AI,
          examType: exam as ExamType,
          subject: 'Current Affairs',
          createdAt: Date.now(),
          type: QuestionType.MCQ
      }));
      return [...officialCA, ...aiQs].slice(0, count);
  } catch (e) {
      return officialCA.length > 0 ? officialCA : MOCK_QUESTIONS_FALLBACK as unknown as Question[];
  }
};

export const generateSingleQuestion = async (exam: string, subject: string, topic: string): Promise<Partial<Question> | null> => {
  try {
      const data = await generateWithSwitcher(`Generate 1 MCQ for ${exam} (${subject}: ${topic}). JSON.`, true, 0.2);
      return { ...data, text: data.text || data.question, options: safeOptions(data.options) };
  } catch (e) { return null; }
};

export const parseSmartInput = async (input: string, type: 'text' | 'image', examContext: string, mimeType: string = 'image/jpeg'): Promise<any[]> => {
  try {
    const prompt = `Extract MCQs from this content. Return JSON Array of objects {text, options, correctIndex, explanation}.`;
    const contents = { parts: [] as any[] };
    
    if(type === 'image') {
        contents.parts.push({ inlineData: { mimeType: mimeType, data: input } });
        contents.parts.push({ text: prompt });
        const parsed = await generateWithSwitcher(contents, true, 0.1);
        return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } else {
        const textContent = `${prompt}\n\n${input}`;
        const parsed = await generateWithSwitcher(textContent, true, 0.1);
        return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    }
  } catch (e) { return []; }
};

// New Function for pure syllabus extraction
export const extractSyllabusFromImage = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const prompt = `
            Extract ALL text from this syllabus/document. 
            Format nicely with Markdown (Headings, Bullet points).
            Do NOT generate fake content. Only transcribe what is visible.
            Return plain Markdown text.
        `;
        const contents = { parts: [
            { inlineData: { mimeType: mimeType, data: base64 } },
            { text: prompt }
        ]};
        
        // Use text response, not JSON
        const response = await generateWithSwitcher(contents, false, 0.1); 
        return response; // Text string
    } catch(e) {
        console.error("Extraction Failed", e);
        return "";
    }
};

export const generateNews = async (exam: string, month?: string, year?: number, category?: string): Promise<NewsItem[]> => {
  try {
      const prompt = `News headlines for ${exam} (${month} ${year}). JSON Array {headline, summary}.`;
      const aiData = await generateWithSwitcher(prompt, true, 0.2);
      return aiData.map((n: any) => ({
          id: generateId('news'),
          headline: n.headline,
          summary: n.summary,
          category: category || 'General',
          date: `${month} ${year}`,
          tags: []
      }));
  } catch (e) { return []; }
};

export const generateStudyNotes = async (exam: string, subject?: string): Promise<NewsItem[]> => {
  try {
      const aiData = await generateWithSwitcher(`Formulas for ${exam} ${subject}. JSON Array {headline, summary}.`, true, 0.2);
      return aiData.map((n: any) => ({
          id: generateId('note'),
          headline: n.headline || n.title,
          summary: n.summary || n.content,
          category: subject || 'Notes',
          date: 'Key Concept',
          tags: []
      }));
  } catch (e) { return []; }
};

export const generateQuestionFromImage = async (base64: string, mime: string, exam: string, subject: string): Promise<Partial<Question> | null> => {
  try {
      const contents = { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: `Solve this. Return JSON {text, options, correctIndex, explanation}.` }] };
      const data = await generateWithSwitcher(contents, true, 0.1);
      return { ...data, text: data.text || data.question, options: safeOptions(data.options) };
  } catch (e) { return null; }
};

export const generatePYQList = async (exam: string, subject: string, year: number, topic?: string): Promise<Question[]> => {
    try {
        const aiData = await generateWithSwitcher(`10 questions for ${year} ${exam} (${subject}). JSON.`, true, 0.2);
        return aiData.map((q: any) => ({
            ...q,
            id: generateId(`pyq-${year}`),
            text: q.text || q.question,
            source: QuestionSource.PYQ_AI,
            examType: exam as ExamType,
            subject: subject,
            pyqYear: year,
            type: QuestionType.MCQ,
            options: safeOptions(q.options)
        }));
    } catch(e) { return []; }
};