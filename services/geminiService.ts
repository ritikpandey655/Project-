
import { Question, QuestionSource, QuestionType, QuestionPaper } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getSystemConfig, getApiKeys } from "./storageService";
import { GoogleGenAI } from "@google/genai";

// Helpers
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
 * Universal AI Generator
 * Automatically switches between Gemini and Groq based on Admin Config.
 * Prioritizes BACKEND (Vercel Env Vars). Fallbacks to Client keys only if backend fails.
 */
export const generateWithAI = async (
    prompt: string, 
    isJson: boolean = true, 
    temperature: number = 0.7
): Promise<any> => {
    try {
        const config = await getSystemConfig();
        const provider = config.aiProvider || 'gemini'; 
        console.log(`[AI Service] Active Provider: ${provider.toUpperCase()}`);

        let textOutput = "";

        // --- 1. Try Backend (Preferred) ---
        try {
            if (provider === 'groq') {
                // Call Groq Endpoint
                textOutput = await callBackend('/api/ai/groq', {
                    model: config.modelName || 'llama-3.3-70b-versatile',
                    messages: [{ role: "user", content: prompt }],
                    jsonMode: isJson
                });
            } else {
                // Call Gemini Endpoint
                textOutput = await callBackend('/api/ai/generate', {
                    model: 'gemini-3-flash-preview', // Updated to Gemini 3.0
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { temperature }
                });
            }
        } catch (backendError: any) {
            console.warn(`Backend (${provider}) unreachable. Attempting Client Fallback... Error: ${backendError.message}`);
            
            // --- 2. Client-Side Fallback (If Backend Fails) ---
            // If user strictly does not want client mode, this will throw eventually
            const localKeys = getApiKeys();
            
            if (provider === 'groq') {
                if (!localKeys.groq) throw new Error("Backend failed. Please ensure Server is running or add Client Key.");
                textOutput = await callGroqDirect(localKeys.groq, prompt, isJson);
            } else {
                if (!localKeys.gemini) throw new Error("Backend failed. Please ensure Server is running or add Client Key.");
                textOutput = await callGeminiDirect(localKeys.gemini, prompt, temperature);
            }
        }

        // --- 3. Parse & Return ---
        if (isJson) {
            try { return JSON.parse(cleanJson(textOutput)); } 
            catch (e) { 
                console.error("JSON Parse Error on:", textOutput);
                throw new Error("AI returned invalid JSON."); 
            }
        }
        return textOutput;

    } catch (e: any) {
        console.error("AI Generation Failed:", e);
        throw e; // Propagate error to UI
    }
};

// --- API Wrappers ---

const callBackend = async (endpoint: string, payload: any) => {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `Server Error ${response.status}`);
    }
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

const callGeminiDirect = async (apiKey: string, prompt: string, temperature: number) => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Updated to Gemini 3.0
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature }
    });
    return response.text;
};

const callGroqDirect = async (apiKey: string, prompt: string, isJson: boolean) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${apiKey}`, 
            "Content-Type": "application/json" 
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: isJson ? { type: "json_object" } : undefined
        })
    });
    if (!response.ok) throw new Error("Groq Client API Failed");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
};

// --- Connection Check ---

export const checkAIConnectivity = async () => {
    const start = Date.now();
    try {
        // Attempt to hit the backend health check
        const res = await fetch('/api/health');
        
        if (res.ok) {
            const data = await res.json();
            const latency = Date.now() - start;
            
            // Check if environment variables are active on the server
            const secure = data.env?.gemini === 'Active' || data.env?.groq === 'Active';
            
            if (secure) {
                return { status: 'Online (Server)', latency, secure: true };
            } else {
                return { status: 'Server No-Keys', latency, secure: false, message: "Backend connected but keys missing" };
            }
        }
        throw new Error("Backend Offline");
    } catch (e) {
        // Backend is completely unreachable
        const keys = getApiKeys();
        if (keys.gemini || keys.groq) {
            return { status: 'Client Mode', latency: 1, secure: true };
        }
        return { status: 'Disconnected', latency: 0, secure: false, message: "Start server: npm run server" };
    }
};

// --- Exported Generators (Same as before) ---

export const generateExamQuestions = async (exam: string, subject: string, count: number, difficulty: string, topics: string[] = []) => {
  try {
      const prompt = `Generate ${count} MCQs for ${exam} (${subject}). Difficulty: ${difficulty}. 
      ${topics.length > 0 ? `Topics: ${topics.join(', ')}.` : ''} 
      Strictly return a JSON Array: [{"text": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]`;

      const items = await generateWithAI(prompt, true, 0.7);
      const data = Array.isArray(items) ? items : (items.questions || []);

      return data.map((q: any) => ({
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: q.text || q.question,
          options: (Array.isArray(q.options) && q.options.length >= 2) ? q.options.map(String) : ["Yes", "No"],
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || "Explanation generated by AI.",
          source: QuestionSource.PYQ_AI,
          examType: exam,
          subject: subject,
          createdAt: Date.now()
      }));
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
