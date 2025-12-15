
import { HarmCategory, HarmBlockThreshold, GoogleGenAI } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions } from "./storageService";

// --- CLIENT-SIDE SETUP ---
// Using key directly in client (Risk accepted for Client-only mode)
const CLIENT_API_KEY = process.env.API_KEY || "AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0";
const clientAI = new GoogleGenAI({ apiKey: CLIENT_API_KEY });

// --- RATE LIMIT CONFIGURATION ---
const RATE_LIMIT_DELAY = 2000; 
let lastCallTime = 0;
let queuePromise = Promise.resolve();

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

// --- DIRECT GEMINI CALL ---
const callGeminiDirect = async (params: { model: string, contents: any, config?: any }) => {
    try {
        const response = await clientAI.models.generateContent({
            model: params.model,
            contents: params.contents,
            config: params.config
        });
        return { text: response.text };
    } catch (e: any) {
        console.error("Gemini Direct Error:", e);
        if (e.message?.includes("429") || e.status === 429) {
             throw new Error("QUOTA_EXCEEDED");
        }
        throw e;
    }
};

// --- DIRECT GROQ CALL ---
const callGroqDirect = async (messages: any[], jsonMode: boolean) => {
    const apiKey = localStorage.getItem('groq_api_key');
    
    if (!apiKey) {
        throw new Error("GROQ_KEY_MISSING");
    }

    const body = {
        model: "llama-3.3-70b-versatile",
        messages: messages,
        response_format: jsonMode ? { type: "json_object" } : undefined,
        temperature: 0.3
    };

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            if(response.status === 429) throw new Error("GROQ_RATE_LIMIT");
            throw new Error(`Groq Error: ${errData.error?.message || response.statusText}`);
        }

        const result = await response.json();
        return result.choices[0].message.content;
    } catch (error: any) {
        console.error("Groq Fetch Error:", error);
        throw error;
    }
};

// --- MASTER CONTROLLER ---
const generateWithSwitcher = async (promptOrContents: any, isJson: boolean = true, temperature: number = 0.3): Promise<any> => {
    // Check Provider
    const provider = localStorage.getItem('selected_ai_provider') || 'gemini-2.5';

    try {
        if (provider === 'groq') {
            // Convert Gemini 'contents' format to OpenAI/Groq 'messages' format
            let messages = [];
            if (typeof promptOrContents === 'string') {
                messages.push({ role: "system", content: "You are a helpful exam assistant. Return JSON." });
                messages.push({ role: "user", content: promptOrContents });
            } else if (promptOrContents.parts) {
                const textPart = promptOrContents.parts.find((p:any) => p.text)?.text || "";
                messages.push({ role: "system", content: "You are a helpful exam assistant. Return JSON." });
                messages.push({ role: "user", content: textPart });
            }

            const text = await callGroqDirect(messages, isJson);
            return isJson ? JSON.parse(cleanJson(text)) : text;

        } else {
            // Default: Gemini 2.5
            const modelToUse = 'gemini-2.5-flash';
            return await generateWithGemini(promptOrContents, isJson, temperature, modelToUse);
        }
    } catch (e: any) {
        console.error(`${provider} Generation Failed:`, e);
        
        if (e.message === 'GROQ_KEY_MISSING') {
            throw new Error("Groq API Key is missing. Check Admin Settings.");
        }

        if (provider === 'groq') {
             console.log("Falling back to Gemini 2.5...");
             return await generateWithGemini(promptOrContents, isJson, temperature, 'gemini-2.5-flash');
        }
        throw e;
    }
};

const commonConfig = {
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
};

// Exported for direct access (e.g. diagnostics)
export const generateWithGemini = async (
    contents: any, 
    isJson: boolean = true, 
    temperature: number = 0.3, 
    model: string = 'gemini-2.5-flash'
): Promise<any> => {
    
    // Normalize contents if string
    const finalContents = typeof contents === 'string' ? { parts: [{ text: contents }] } : contents;

    const config: any = { 
        ...commonConfig, 
        temperature: temperature,
    };

    if (isJson) {
        config.responseMimeType = "application/json";
    }

    // Direct Call Wrapper for Queue
    const wrappedCall = () => callGeminiDirect({
        model: model,
        contents: finalContents,
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

// --- EXPORTS ---

export const checkAIConnectivity = async (): Promise<'Operational' | 'Degraded' | 'Rate Limited' | 'Failed'> => {
    const provider = localStorage.getItem('selected_ai_provider') || 'gemini-2.5';
    
    try {
        if (provider === 'groq') {
            // --- TEST GROQ DIRECT ---
            console.log("Diagnostics: Testing Groq Direct...");
            const response = await callGroqDirect(
                [{ role: "user", content: "Ping" }],
                false
            );
            return response ? 'Operational' : 'Failed';
        } else {
            // --- TEST GEMINI DIRECT ---
            console.log("Diagnostics: Testing Gemini Direct...");
            const response = await generateWithGemini(
                { parts: [{ text: "Reply 'OK'." }] }, 
                false, 
                0.1, 
                'gemini-2.5-flash'
            );
            return response ? 'Operational' : 'Degraded';
        }
    } catch (e: any) {
        console.warn("Diagnostic Check Failed:", e.message);
        if (e.message.includes("QUOTA") || e.message.includes("429") || e.message.includes("GROQ_RATE_LIMIT")) return 'Rate Limited';
        if (e.message.includes("GROQ_KEY_MISSING")) return 'Failed'; 
        return 'Failed';
    }
};

export const resetAIQuota = () => {
    // Reset any local rate limit counters if we implement them for client side later
    console.log("🔄 AI Quota Logic Reset");
};

// ... (Rest of the exports generateExamQuestions, generateFullPaper etc. remain same but use the new generateWithSwitcher)

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
      console.warn("AI Generation Failed, using fallback.");
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
            
            let qPromptText = `
                Generate ${sec.questionCount} ${sec.type} questions for ${exam} (${subject}).
                Follow the standard ${exam} exam pattern.
                Return valid JSON Array.
            `;

            let questions = [];
            try {
                questions = await generateWithSwitcher(qPromptText, true, 0.3);
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
      return aiQs.slice(0, count);
  } catch (e) {
      return MOCK_QUESTIONS_FALLBACK as unknown as Question[];
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
    const prompt = `Extract MCQs from this content. Return JSON Array.`;
    const contents = { parts: [] as any[] };
    
    if(type === 'image') {
        contents.parts.push({ inlineData: { mimeType: mimeType, data: input } });
        contents.parts.push({ text: prompt });
    } else {
        contents.parts.push({ text: `${prompt}\n\n${input}` });
    }
    const parsed = await generateWithSwitcher(contents, true, 0.1);
    return Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (e) { return []; }
};

export const extractSyllabusFromImage = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const prompt = `Extract text. Format as Markdown.`;
        const contents = { parts: [
            { inlineData: { mimeType: mimeType, data: base64 } },
            { text: prompt }
        ]};
        const response = await generateWithSwitcher(contents, false, 0.1); 
        return response; 
    } catch(e) {
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
