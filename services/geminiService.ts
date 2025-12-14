import { Type, HarmCategory, HarmBlockThreshold, GoogleGenAI } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";
import { generateLocalResponse, isLocalAIReady } from "./localAIService";

// --- RATE LIMIT CONFIGURATION (TRAFFIC CONTROLLER) ---

const RATE_LIMIT_DELAY = 4000; // Increased safety buffer for free tier
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
// If running on web (dev), BASE_URL is empty to use the proxy in vite.config.ts
// If running on Android/iOS/Prod, process.env.BACKEND_URL will be populated
const BASE_URL = process.env.BACKEND_URL || "";

// --- GEMINI CALL HANDLER (SECURE BACKEND MODE) ---
const callGeminiBackendRaw = async (params: { model: string, contents: any, config?: any }) => {
  if (!checkQuota()) throw new Error("QUOTA_COOL_DOWN");

  // Note: We are using the Node.js backend (server/index.js)
  
  try {
    // Correctly construct URL: If BASE_URL is empty (dev), it becomes "/api/ai/generate" which hits the proxy
    const endpoint = `${BASE_URL}/api/ai/generate`.replace('//api', '/api'); 
    
    // console.log("Calling Node Backend:", endpoint); 

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
        // If html/text returns, it's likely a 404 or 500
        const text = await response.text();
        console.error("Backend Error Response:", text);
        throw new Error(`Server Error: Backend unavailable. Make sure 'node server/index.js' is running.`);
    }

    if (!result.success) {
      if (response.status === 429 || 
          response.status === 503 || 
          result.error?.includes('429') || 
          result.error?.includes('Quota') ||
          result.error?.includes('Resource exhausted')) {
          
          console.warn("⚠️ Quota Exceeded (429/503). Triggering Cool Down.");
          isQuotaExhausted = true;
          quotaResetTime = Date.now() + 45000; // 45s Cooldown
          throw new Error("QUOTA_EXCEEDED");
      }
      
      if (response.status === 500) {
          await new Promise(r => setTimeout(r, 2000));
      }

      throw new Error(result.error || 'Generation failed');
    }
    
    return { text: result.data }; 
  } catch (error: any) {
    if (error.message === "QUOTA_EXCEEDED" || error.message === "QUOTA_COOL_DOWN") throw error;
    console.error("Secure AI Call Failed:", error);
    throw error;
  }
};

// --- GROQ BACKEND CALL ---
const callGroqBackendRaw = async (promptText: string, isJson: boolean) => {
    const apiKey = localStorage.getItem('groq_api_key');
    // For Groq, we still support client-side override if Admin sets it in Settings
    const keyToUse = apiKey;

    const messages = [
        { role: 'system', content: isJson ? "You are a helpful assistant. Output JSON only." : "You are a helpful assistant." },
        { role: 'user', content: promptText }
    ];

    // If User provided their own key in Settings, use direct call (Client Side)
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
            // Fallthrough to proxy
        }
    }

    // Default: Use Secure Backend Proxy
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
    } catch (e) {
        throw e;
    }
};

// --- MASTER CONTROLLER (SWITCHER) ---
const generateWithSwitcher = async (contents: any, isJson: boolean = true, temperature: number = 0.3): Promise<any> => {
    // 1. Check User Preference
    const preferredProvider = localStorage.getItem('selected_ai_provider') || 'gemini';
    const hasImage = typeof contents === 'object' && contents.parts && contents.parts.some((p: any) => p.inlineData);

    // Extract text prompt for text-only models
    let promptText = "";
    if (typeof contents === 'string') promptText = contents;
    else if (contents.parts) promptText = contents.parts.map((p: any) => p.text).join('\n');
    else if (Array.isArray(contents)) promptText = contents.map((p: any) => p.parts?.[0]?.text).join('\n');

    // 2. Try Local AI (Offline/Device Mode)
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
            if (isJson) return JSON.parse(cleanJson(text));
            return text;
        } catch (groqError) {
            console.warn("⚠️ Groq Failed, falling back to Gemini...", groqError);
        }
    }

    // 4. Try Deep Research (Gemini 3.0 Pro + Thinking)
    if (preferredProvider === 'deep-research') {
        try {
            // Force 3.0 Pro with High Thinking Budget for complex reasoning
            // NOTE: Thinking models often fail if we enforce JSON MIME type. 
            // We append instruction to text prompt instead.
            let deepContents = contents;
            if (typeof contents === 'string') {
                deepContents = contents + "\n\nIMPORTANT: Return the result in valid JSON format inside a markdown code block.";
            } else if (contents.parts) {
                // If it's a multipart request (e.g. image), try to append to the text part
                deepContents = {
                    ...contents,
                    parts: contents.parts.map((p: any) => 
                        p.text ? { ...p, text: p.text + "\n\nIMPORTANT: Return valid JSON inside markdown." } : p
                    )
                };
            }

            // Using gemini-3-pro-preview with 10000 token budget for deep thinking
            return await generateWithGemini(deepContents, isJson, temperature, 'gemini-3-pro-preview', 10000);
        } catch (deepError) {
            console.warn("⚠️ Deep Research Failed, falling back to Standard Gemini...", deepError);
            // Fallback proceeds to step 5
        }
    }

    // 5. Default / Fallback to Gemini 2.5 Flash
    return generateWithGemini(contents, isJson, temperature);
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
    model: string = 'gemini-2.5-flash',
    thinkingBudget?: number
): Promise<any> => {
    if (!checkQuota()) throw new Error("QUOTA_EXCEEDED");
    
    const config: any = { 
        ...commonConfig, 
        temperature: temperature, 
        responseMimeType: isJson ? "application/json" : "text/plain" 
    };

    // If thinking is enabled (Deep Research), we MUST disable strict JSON MIME type
    if (thinkingBudget) {
        config.thinkingConfig = { thinkingBudget };
        delete config.responseMimeType;
    }

    // Wrapper that forces Rate Limiting
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
  
  // 1. Try to find explicit markdown JSON block first (Best for Thinking Models)
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
      return jsonBlockMatch[1].trim();
  }

  // 2. Fallback: Clean markers and find brackets
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
  const isUPBoard = exam.includes('UP Board');
  
  const basePrompt = `
      ACT AS A STRICT EXAMINER for ${exam}.
      SUBJECT: ${subject}.
      CONSTRAINT: ${getSubjectConstraint(subject)}
      DIFFICULTY: ${difficulty}.
      ${topics.length > 0 ? `SPECIFIC TOPICS: ${topics.join(', ')}` : ''}
      ${isUPBoard ? 'LANGUAGE: Hinglish (Hindi terms in Roman) or Hindi (Devanagari).' : ''}
      Create distinct, high-quality MCQs.
      OUTPUT FORMAT (JSON ARRAY ONLY):
      [ { "text": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." } ]
  `;

  let aiQuestions: Question[] = [];

  try {
      // USE SWITCHER HERE
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

        // USE SWITCHER HERE
        let blueprint = await generateWithSwitcher(blueprintPromptText, true, 0.2);
        if (!blueprint || !blueprint.sections) throw new Error("Invalid Blueprint");

        const filledSections = [];
        for (const [sIdx, sec] of blueprint.sections.entries()) {
            const qPromptText = `Generate ${sec.questionCount} ${sec.type} questions for ${exam} (${subject}). JSON Array.`;
            let questions = [];
            try {
                // IMPORTANT: If syllabus (image/pdf) is provided, MUST USE GEMINI (Switch logic handles this automatically via hasImage check)
                if (config.syllabus && config.syllabus.data) {
                     const contents = { parts: [
                         { inlineData: { mimeType: config.syllabus.mimeType, data: config.syllabus.data } },
                         { text: qPromptText }
                     ]};
                     questions = await generateWithSwitcher(contents, true, 0.3);
                } else {
                    questions = await generateWithSwitcher(qPromptText, true, 0.3);
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
      // USE SWITCHER
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
      // USE SWITCHER
      const data = await generateWithSwitcher(`Generate 1 MCQ for ${exam} (${subject}: ${topic}). JSON.`, true, 0.2);
      return { ...data, text: data.text || data.question, options: safeOptions(data.options) };
  } catch (e) { return null; }
};

export const parseSmartInput = async (input: string, type: 'text' | 'image', examContext: string): Promise<any[]> => {
  try {
    const prompt = `Extract MCQs from this ${type}. JSON Array of objects {text, options, correct_index, explanation}.`;
    const contents = { parts: [] as any[] };
    
    // IMAGE HANDLING: generateWithSwitcher will detect inlineData and force Gemini automatically
    if(type === 'image') {
        contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: input } });
        contents.parts.push({ text: prompt });
        const parsed = await generateWithSwitcher(contents, true, 0.1);
        return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } else {
        // Text can use Groq or Local
        const textContent = `${prompt}\n\n${input}`;
        const parsed = await generateWithSwitcher(textContent, true, 0.1);
        return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    }
  } catch (e) { return []; }
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
      // IMAGE: Automatically handled by Switcher fallback to Gemini (Local AI doesn't support images in this setup)
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