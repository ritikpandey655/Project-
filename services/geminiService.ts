import { Question, QuestionSource, QuestionType, QuestionPaper } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getSystemConfig } from "./storageService";
import { GoogleGenAI } from "@google/genai";

const CLIENT_API_KEY = process.env.API_KEY || "";

/**
 * Helper: Clean JSON output from AI models
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

/**
 * Backend Proxy Wrapper
 */
const callBackend = async (endpoint: string, payload: any) => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': CLIENT_API_KEY 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Backend Error: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result.data; 
    } catch (e) {
        console.warn("Backend failed, checking for fallback...", e);
        throw e;
    }
};

/**
 * Universal AI Generator
 * Dynamically switches between Gemini and Groq based on Admin Config
 */
export const generateWithAI = async (
    prompt: string, 
    isJson: boolean = true, 
    temperature: number = 0.7
): Promise<any> => {
    try {
        // 1. Check System Config (Cached in LocalStorage for speed)
        const config = await getSystemConfig();
        const provider = config.aiProvider || 'gemini'; 
        
        let textOutput = "";

        if (provider === 'groq') {
            // --- GROQ PATH ---
            try {
                console.log("⚡ Using Groq (Llama-3)");
                const payload = {
                    model: config.modelName || 'llama-3.3-70b-versatile',
                    messages: [{ role: "user", content: prompt }],
                    jsonMode: isJson
                };
                textOutput = await callBackend('/api/ai/groq', payload);
            } catch (groqError) {
                console.warn("Groq failed, falling back to Gemini.", groqError);
                // Fallback to Gemini if Groq fails
                return await generateWithGemini(prompt, isJson, temperature);
            }
        } else {
            // --- GEMINI PATH ---
            return await generateWithGemini(prompt, isJson, temperature, config.modelName);
        }

        if (isJson) {
            try { return JSON.parse(cleanJson(textOutput)); } 
            catch (e) { throw new Error("AI Response JSON Parse Error"); }
        }
        return textOutput;

    } catch (e: any) {
        console.error("AI Generation Critical Fail:", e);
        throw e;
    }
};

/**
 * Specific Gemini Implementation (Client-Side Fallback Capability)
 */
const generateWithGemini = async (prompt: string, isJson: boolean, temperature: number, modelOverride?: string) => {
    const modelName = modelOverride || 'gemini-2.5-flash-preview';
    const payload = {
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature }
    };

    try {
        // Try Server First
        const text = await callBackend('/api/ai/generate', payload);
        if (isJson) return JSON.parse(cleanJson(text));
        return text;
    } catch (serverError) {
        // Client-Side Fallback
        if (CLIENT_API_KEY) {
            console.log("⚠️ Backend down. Using Client-Side Gemini.");
            const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: payload.contents,
                config: payload.config
            });
            const text = response.text;
            if (isJson) return JSON.parse(cleanJson(text));
            return text;
        }
        throw serverError;
    }
};

// --- EXPORTED FUNCTIONS (Using the Universal Generator) ---

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
          options: (Array.isArray(q.options) && q.options.length >= 2) ? q.options.map(String) : ["Yes", "No"],
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || "Logic-based answer provided by AI engine.",
          source: QuestionSource.PYQ_AI,
          examType: exam,
          subject: subject,
          createdAt: Date.now()
      }));

      return [...officialQs, ...formatted];
  } catch (e) {
      console.warn("Generation failed, using mock data.", e);
      return MOCK_QUESTIONS_FALLBACK as any;
  }
};

export const solveTextQuestion = async (text: string, exam: string, subject: string) => {
    const prompt = `Expert Solver: Analyze this ${exam} (${subject}) query: "${text}". 
    Solve it and Return JSON: {"text": "Restated Question", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "Step-by-step logic."}`;
    return await generateWithAI(prompt, true, 0.4);
};

export const generateQuestionFromImage = async (base64: string, mimeType: string, exam: string, subject: string) => {
    // Images ONLY supported by Gemini
    const prompt = `Analyze image for ${exam}. Return JSON: {text, options[], correctIndex, explanation}`;
    const payload = {
        model: 'gemini-2.5-flash-preview', 
        contents: [{ role: 'user', parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }]
    };
    try {
        const text = await callBackend('/api/ai/generate', payload); // Or client fallback
        return JSON.parse(cleanJson(text));
    } catch(e) {
        if(CLIENT_API_KEY) {
             const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });
             const res = await ai.models.generateContent({ model: 'gemini-2.5-flash-preview', contents: payload.contents });
             return JSON.parse(cleanJson(res.text));
        }
        return null;
    }
};

export const generateFullPaper = async (exam: string, subject: string, difficulty: string, seed: string, config: any) => {
    const prompt = `Generate mock paper for ${exam} (${subject}). Difficulty: ${difficulty}. Hints: ${seed}. Return JSON with 'sections' array.`;
    return await generateWithAI(prompt, true, 0.7);
};

export const generatePYQList = async (exam: string, subject: string, year: number, topic: string) => {
    const prompt = `List 10 PYQs for ${exam} (${subject}) year ${year} topic ${topic}. Return JSON array.`;
    const items = await generateWithAI(prompt, true, 0.5);
    const data = Array.isArray(items) ? items : (items.questions || []);
    return data.map((q: any) => ({ ...q, id: `pyq-${Math.random()}`, source: 'PYQ_AI', examType: exam, subject, pyqYear: year }));
};

export const checkAIConnectivity = async () => {
    try {
        const res = await fetch('/api/health');
        if (res.ok) {
            const data = await res.json();
            return { status: 'Operational', latency: 10, secure: data.secure };
        }
        throw new Error("Backend Down");
    } catch (e) {
        return { status: CLIENT_API_KEY ? 'Client-Only' : 'Failed', latency: 0, secure: !!CLIENT_API_KEY };
    }
};