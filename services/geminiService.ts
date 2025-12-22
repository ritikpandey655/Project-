
import { Question, QuestionSource, QuestionType, QuestionPaper, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getSystemConfig } from "./storageService";

// --- BACKEND API HANDLER ---

const callBackend = async (endpoint: string, payload: any) => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 429) throw new Error("429: AI Quota Exceeded");
            throw new Error(`Backend Error: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || "Unknown Backend Error");
        }

        return result.data; // The raw data from AI
    } catch (e) {
        console.error("API Call Failed:", e);
        throw e;
    }
};

// --- UTILS ---

const cleanJson = (text: string) => {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) return jsonBlockMatch[1].trim();
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
  const start = Math.min(cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'), cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('['));
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  return (start !== Infinity && end !== -1) ? cleaned.substring(start, end + 1).trim() : cleaned.trim();
};

const safeOptions = (opts: any): string[] => Array.isArray(opts) ? opts : ["A", "B", "C", "D"];

// --- RATE LIMITER ---
const RATE_LIMIT_DELAY = 1000; 
let lastCallTime = 0;
let queuePromise = Promise.resolve();

const enqueueRequest = <T>(task: () => Promise<T>): Promise<T> => {
    const nextTask = queuePromise.then(async () => {
        const now = Date.now();
        const timeSinceLast = now - lastCallTime;
        if (timeSinceLast < RATE_LIMIT_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLast));
        }
        lastCallTime = Date.now();
        return task();
    });
    queuePromise = nextTask.catch(() => {}).then(() => {});
    return nextTask;
};

// --- MAIN GENERATION FUNCTION ---

export const generateWithAI = async (
    prompt: string, 
    isJson: boolean = true, 
    temperature: number = 0.3,
    modelName: string = 'gemini-3-flash-preview'
): Promise<any> => {
    const task = async () => {
        // 1. Check Config
        const systemConfig = await getSystemConfig();
        const provider = systemConfig.aiProvider || 'gemini';

        let textOutput = "";

        if (provider === 'groq') {
            // GROQ PATH
            const payload = {
                model: systemConfig.modelName || 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt + (isJson ? " Respond in JSON." : "") }],
                jsonMode: isJson
            };
            const response = await callBackend('/api/ai/groq', payload);
            textOutput = response.choices?.[0]?.message?.content || "";
        } else {
            // GEMINI PATH (Default)
            const payload = {
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    temperature: temperature,
                    responseMimeType: isJson ? "application/json" : "text/plain"
                }
            };
            textOutput = await callBackend('/api/ai/generate', payload);
        }

        if (isJson) {
            try {
                return JSON.parse(cleanJson(textOutput));
            } catch (e) {
                console.error("JSON Parse Error:", textOutput);
                throw new Error("AI returned invalid JSON format.");
            }
        }
        return textOutput;
    };

    try {
        return await enqueueRequest(task);
    } catch (e: any) {
        throw e;
    }
};

// Enhanced Connectivity Check with Latency
export const checkAIConnectivity = async (): Promise<{ status: 'Operational' | 'Failed', latency: number, secure: boolean }> => {
    const start = Date.now();
    try {
        const res = await fetch('/api/health');
        const end = Date.now();
        const latency = end - start;
        
        if (res.ok) {
            const data = await res.json();
            return { status: 'Operational', latency, secure: data.secure };
        }
        return { status: 'Failed', latency: 0, secure: false };
    } catch (e: any) {
        return { status: 'Failed', latency: 0, secure: false };
    }
};

// --- EXAM LOGIC (Unchanged) ---

export const generateExamQuestions = async (
    exam: string, 
    subject: string, 
    count: number = 5,
    difficulty: string = 'Medium',
    topics: string[] = []
): Promise<Question[]> => {
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const prompt = `ACT AS A STRICT EXAMINER for ${exam}. Subject: ${subject}. Difficulty: ${difficulty}. 
  ${topics.length > 0 ? `Topics: ${topics.join(', ')}.` : ''} 
  Create ${count} High-Quality MCQs. Output JSON array: [{text, options:[], correctIndex, explanation}].`;

  try {
      const items = await generateWithAI(prompt, true, 0.4);
      const formatted = (Array.isArray(items) ? items : (items.questions || [])).map((q: any) => ({
          text: q.text || q.question,
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          source: QuestionSource.PYQ_AI,
          examType: exam,
          subject: subject,
          type: QuestionType.MCQ,
          options: safeOptions(q.options),
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || "",
          createdAt: Date.now()
      }));
      return [...officialQs, ...formatted];
  } catch (e) {
      return officialQs.length > 0 ? officialQs : MOCK_QUESTIONS_FALLBACK as any;
  }
};

export const generateCurrentAffairs = async (exam: string, count: number = 5): Promise<Question[]> => {
  const prompt = `GK EXPERT. Generate ${count} Current Affairs MCQs for ${exam} (2024-2025). 
  JSON array: [{text, options:[], correctIndex, explanation}].`;
  try {
    const items = await generateWithAI(prompt, true, 0.4);
    return (Array.isArray(items) ? items : (items.questions || [])).map((q: any) => ({
        text: q.text || q.question,
        id: `ca-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        source: QuestionSource.PYQ_AI,
        examType: exam,
        subject: 'Current Affairs',
        type: QuestionType.MCQ,
        options: safeOptions(q.options),
        correctIndex: q.correctIndex ?? 0,
        explanation: q.explanation || "",
        createdAt: Date.now()
    }));
  } catch (e) { return []; }
};

export const generatePYQList = async (exam: string, subject: string, year: number, topic?: string): Promise<Question[]> => {
    try {
        const prompt = `Generate 10 PYQs for ${year} ${exam} (${subject}). ${topic ? `Topic: ${topic}` : ''} 
        JSON array: [{text, options:[], correctIndex, explanation}].`;
        const data = await generateWithAI(prompt, true, 0.2);
        return (Array.isArray(data) ? data : (data.questions || [])).map((q: any) => ({
            ...q,
            id: `pyq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            text: q.text || q.question,
            source: QuestionSource.PYQ_AI,
            examType: exam,
            subject: subject,
            pyqYear: year,
            type: QuestionType.MCQ,
            options: safeOptions(q.options),
            createdAt: Date.now()
        }));
    } catch(e) { return []; }
};

export const generateSingleQuestion = async (exam: string, subject: string, topic: string): Promise<Partial<Question> | null> => {
  try {
      const data = await generateWithAI(`1 tough MCQ for ${exam} (${subject}: ${topic}). JSON {text, options, correctIndex, explanation}.`, true, 0.2);
      return { ...data, text: data.text || data.question, options: safeOptions(data.options) };
  } catch (e) { return null; }
};

export const generateNews = async (exam: string, month?: string, year?: number, category?: string): Promise<NewsItem[]> => {
    try {
        const prompt = `5 latest news items for ${exam} (${month} ${year}, ${category}). JSON array {headline, summary}.`;
        const data = await generateWithAI(prompt, true, 0.2);
        return (Array.isArray(data) ? data : (data.news || [])).map((n: any) => ({
            id: `n-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
        const data = await generateWithAI(`5 critical formulas/notes for ${exam} ${subject}. JSON array {headline, summary}.`, true, 0.2);
        return (Array.isArray(data) ? data : (data.notes || [])).map((n: any) => ({
            id: `note-${Date.now()}`,
            headline: n.headline || n.title,
            summary: n.summary || n.content,
            category: subject || 'Revision',
            date: 'Note',
            tags: []
        }));
    } catch (e) { return []; }
};

export const parseSmartInput = async (input: string, type: 'text' | 'image', examContext: string): Promise<any[]> => {
    try {
      let contentParts: any[] = [];
      
      if (type === 'image') {
          contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: input } });
          contentParts.push({ text: `Extract MCQs from this image. Context: ${examContext}. JSON array: [{text, options:[], correctIndex, explanation}].` });
      } else {
          contentParts.push({ text: `Extract MCQs from this text: ${input}. Context: ${examContext}. JSON array: [{text, options:[], correctIndex, explanation}].` });
      }

      // Hardcoded to Gemini Flash for Vision capability (Groq Vision support varies, safer to stick to Gemini for now)
      const payload = {
          model: type === 'image' ? 'gemini-2.5-flash-image' : 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts: contentParts }],
          config: { temperature: 0.1, responseMimeType: "application/json" }
      };

      const text = await callBackend('/api/ai/generate', payload);
      const result = JSON.parse(cleanJson(text || "[]"));
      return Array.isArray(result) ? result : (result.questions || []);
    } catch (e) { 
        return []; 
    }
};

export const generateQuestionFromImage = async (base64: string, mimeType: string, exam: string, subject: string): Promise<Partial<Question> | null> => {
    try {
        const result = await parseSmartInput(base64, 'image', `Exam: ${exam}, Subject: ${subject}`);
        return result.length > 0 ? result[0] : null;
    } catch (e) { return null; }
};

export const generateFullPaper = async (
    exam: string, 
    subject: string, 
    difficulty: string, 
    seedData: string, 
    config: any
): Promise<QuestionPaper | null> => {
    const prompt = `Full Exam Paper for ${exam} (${subject}, ${difficulty}). Hints: ${seedData}. JSON: {title, totalMarks, durationMinutes, sections:[{title, questions:[{text, options, correctIndex, explanation}]}]}`;
    try {
        const data = await generateWithAI(prompt, true, 0.4);
        return {
            ...data,
            id: `paper-${Date.now()}`,
            examType: exam,
            subject: subject,
            difficulty: difficulty,
            createdAt: Date.now()
        } as QuestionPaper;
    } catch (e) { return null; }
};

export const extractSyllabusFromImage = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: [{ 
                role: 'user', 
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: "Extract syllabus chapters as Markdown list." }
                ] 
            }],
            config: { temperature: 0.1 }
        };
        const text = await callBackend('/api/ai/generate', payload);
        return text || "No data.";
    } catch(e) { return "Error."; }
};
