import { Question, QuestionSource, QuestionType, QuestionPaper, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, logSystemError } from "./storageService";
import { GoogleGenAI } from "@google/genai";

// Access the key injected by Vite
const CLIENT_API_KEY = process.env.API_KEY || "";

/**
 * Direct Client-Side Generation (Fallback)
 * Used when backend is offline or unreachable.
 */
const generateWithDirectClient = async (payload: any) => {
    if (!CLIENT_API_KEY) throw new Error("No API Key available in Client.");
    
    console.log("⚡ Switched to Client-Side AI Generation");
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });
    const response = await ai.models.generateContent({
        model: payload.model || 'gemini-3-flash-preview',
        contents: payload.contents,
        config: payload.config
    });
    return response.text;
};

/**
 * Robust fetch wrapper for the backend AI proxy
 * 1. Tries Backend with Header Injection
 * 2. Falls back to Direct Client Logic if Backend fails
 */
const callBackend = async (endpoint: string, payload: any) => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': CLIENT_API_KEY // Inject key for Hybrid Bridge
            },
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get("content-type");
        // Check if response is HTML (often implies 404/SPA Fallback in dev)
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Backend Returned HTML (Likely 404/Proxy Issue)");
        }

        if (!response.ok) {
            throw new Error(`Backend Error: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result.data; 

    } catch (e) {
        // Ultimate Fallback: Try Direct Client if network fetch failed or backend is dead
        console.warn("Backend unavailable. Attempting Direct Client Fallback...", e);
        try {
            return await generateWithDirectClient(payload);
        } catch (clientError: any) {
             console.error("Critical Failure:", clientError);
             throw new Error("AI Service Unavailable. Please check internet connection.");
        }
    }
};

/**
 * Standard JSON cleaning for AI responses
 */
const cleanJson = (text: string) => {
  if (!text) return "";
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) return jsonBlockMatch[1].trim();
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
  const start = Math.min(
    cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'), 
    cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
  );
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  return (start !== Infinity && end !== -1) ? cleaned.substring(start, end + 1).trim() : cleaned.trim();
};

const safeOptions = (opts: any): string[] => {
    if (Array.isArray(opts) && opts.length >= 2) return opts.map(o => String(o));
    return ["Option A", "Option B", "Option C", "Option D"];
};

/**
 * Universal AI Generation Handler
 */
export const generateWithAI = async (
    prompt: string, 
    isJson: boolean = true, 
    temperature: number = 0.7,
    modelName: string = 'gemini-3-flash-preview'
): Promise<any> => {
    try {
        const payload = {
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: temperature }
        };
        const textOutput = await callBackend('/api/ai/generate', payload);

        if (isJson) {
            try {
                return JSON.parse(cleanJson(textOutput));
            } catch (e) {
                throw new Error("AI response was unreadable.");
            }
        }
        return textOutput;
    } catch (e: any) {
        console.error(e);
        throw e;
    }
};

export const generateExamQuestions = async (
    exam: string, 
    subject: string, 
    count: number = 5,
    difficulty: string = 'Medium',
    topics: string[] = []
): Promise<Question[]> => {
  try {
      const officialQs = await getOfficialQuestions(exam, subject, count);
      if (officialQs.length >= count) return officialQs;
      
      const neededCount = count - officialQs.length;
      const prompt = `Generate exactly ${neededCount} high-quality MCQs for the ${exam} competitive exam. 
      Subject: ${subject}. Difficulty: ${difficulty}. 
      ${topics.length > 0 ? `Target Topics: ${topics.join(', ')}.` : ''} 
      Requirements: 4 clear options, 1 correct index (0-3), and a conceptual explanation.
      Return JSON array: [{"text": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]`;

      const items = await generateWithAI(prompt, true, 0.7);
      const data = Array.isArray(items) ? items : (items.questions || []);

      const formatted = data.map((q: any) => ({
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: q.text || q.question,
          options: safeOptions(q.options),
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || "Logic-based answer provided by AI engine.",
          source: QuestionSource.PYQ_AI,
          examType: exam,
          subject: subject,
          createdAt: Date.now()
      }));

      return [...officialQs, ...formatted];
  } catch (e) {
      console.warn("AI Generation fallback to mock data.", e);
      return MOCK_QUESTIONS_FALLBACK as any;
  }
};

export const solveTextQuestion = async (
    questionText: string,
    examType: string,
    subject: string
): Promise<any> => {
    const prompt = `Expert Solver Mode: Analyze the following query for ${examType} (${subject}): "${questionText}".
    If it's a specific question, solve it. If it's a topic, provide a master MCQ.
    Return JSON: {"text": "...", "options": ["..."], "correctIndex": 0, "explanation": "..."}`;
    return await generateWithAI(prompt, true, 0.4);
};

export const generateQuestionFromImage = async (
    base64: string,
    mimeType: string,
    exam: string,
    subject: string
): Promise<any> => {
    const prompt = `Analyze this image containing a question for ${exam}. Extract text, options, answer, and explanation. Return JSON.`;
    const payload = {
        model: 'gemini-3-flash-preview',
        contents: [{
            role: 'user',
            parts: [
                { inlineData: { data: base64, mimeType: mimeType } },
                { text: prompt }
            ]
        }],
        config: { temperature: 0.4 }
    };
    try {
        const textOutput = await callBackend('/api/ai/generate', payload);
        return JSON.parse(cleanJson(textOutput));
    } catch (e) { return null; }
};

export const generateFullPaper = async (
    exam: string,
    subject: string,
    difficulty: string,
    seedData: string,
    config: any
): Promise<QuestionPaper | null> => {
    const prompt = `Generate a full mock paper for ${exam} (${subject}). Difficulty: ${difficulty}. ${config.mcqCount} Questions. Return JSON with 'sections' array.`;
    try {
        const result = await generateWithAI(prompt, true, 0.7);
        return result as QuestionPaper;
    } catch (e) { return null; }
};

export const generatePYQList = async (
    exam: string,
    subject: string,
    year: number,
    topic: string = ''
): Promise<Question[]> => {
    const prompt = `Provide 10 PYQs for ${exam} (${subject}) year ${year}. Return JSON array.`;
    try {
        const items = await generateWithAI(prompt, true, 0.6);
        const data = Array.isArray(items) ? items : (items.questions || []);
        return data.map((q: any) => ({
            ...q,
            id: q.id || `pyq-${Date.now()}-${Math.random()}`,
            source: QuestionSource.PYQ_AI,
            examType: exam,
            subject: subject,
            pyqYear: year,
            createdAt: Date.now()
        }));
    } catch (e) { return []; }
};

/**
 * Enhanced Connectivity Check
 * Returns 'Operational' if either Backend works OR Client Key is present.
 */
export const checkAIConnectivity = async (): Promise<{ status: 'Operational' | 'Failed' | 'Client-Only', latency: number, secure: boolean }> => {
    const start = Date.now();
    try {
        const res = await fetch('/api/health', {
            headers: { 'x-api-key': CLIENT_API_KEY } 
        });
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) throw new Error("Backend is 404 HTML");
        
        if (res.ok) {
            const data = await res.json();
            return { status: 'Operational', latency: Date.now() - start, secure: data.secure };
        }
        throw new Error("Backend Down");
    } catch (e) {
        // If Backend is down but we have a client key, we are functional!
        if (CLIENT_API_KEY) {
            return { status: 'Client-Only', latency: 1, secure: true };
        }
        return { status: 'Failed', latency: 0, secure: false };
    }
};