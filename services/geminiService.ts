
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

// --- Helper for Paper Sanitization ---

const sanitizePaper = (data: any, exam: string, subject: string, difficulty: string) => {
    // 1. Sanitize Basic Metadata
    const safeData = {
        id: `paper-${Date.now()}`,
        title: data.title || `${exam} Mock Paper`,
        totalMarks: typeof data.totalMarks === 'number' ? data.totalMarks : 100,
        durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 120,
        sections: Array.isArray(data.sections) ? data.sections : [],
        examType: exam,
        subject: subject,
        difficulty: difficulty,
        createdAt: Date.now()
    };

    // 2. Sanitize Sections & Questions
    safeData.sections = safeData.sections.map((sec: any, sIdx: number) => {
        // Normalize Questions
        const rawQuestions = Array.isArray(sec.questions) ? sec.questions : [];
        const validQuestions = rawQuestions.map((q: any, qIdx: number) => {
            // Fix Options: Ensure it is an array of strings
            let options = ["Yes", "No"];
            if (Array.isArray(q.options) && q.options.length > 0) options = q.options.map(String);
            else if (Array.isArray(q.choices) && q.choices.length > 0) options = q.choices.map(String); // Handle 'choices' alias
            
            // Fix Correct Index
            let correctIndex = 0;
            if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length) {
                correctIndex = q.correctIndex;
            } else if (typeof q.answer === 'string') {
                // Try to map "Option A" or "A" to index
                const idx = options.findIndex(o => o === q.answer || o.startsWith(q.answer));
                if (idx !== -1) correctIndex = idx;
            }

            return {
                id: `q-${sIdx}-${qIdx}-${Date.now()}`,
                text: q.text || q.question || "Question text unavailable.",
                options: options,
                correctIndex: correctIndex,
                explanation: q.explanation || "No explanation provided.",
                source: 'PYQ_AI',
                examType: exam,
                subject: subject,
                tags: q.tags || [subject],
                type: 'MCQ', 
                marks: q.marks || sec.marksPerQuestion || 4
            };
        });

        return {
            id: `sec-${sIdx}`,
            title: sec.title || `Section ${sIdx + 1}`,
            instructions: sec.instructions || "Attempt all questions.",
            marksPerQuestion: sec.marksPerQuestion || 4,
            questions: validQuestions
        };
    });

    // Remove empty sections
    safeData.sections = safeData.sections.filter((s: any) => s.questions.length > 0);
    
    // Fallback if paper is empty
    if (safeData.sections.length === 0) return null;

    return safeData;
};

// --- Exported Generators ---

export const generateExamQuestions = async (exam: string, subject: string, count: number, difficulty: string, topics: string[] = []) => {
  try {
      const prompt = `Generate ${count} MCQs for ${exam} (${subject}). Difficulty: ${difficulty}. 
      ${topics.length > 0 ? `Topics: ${topics.join(', ')}.` : ''} 
      Strictly return a JSON Array of objects.
      Schema: [{"text": "Question Stem", "options": ["A", "B", "C", "D"], "correctIndex": 0 (0-3), "explanation": "Logic"}]`;

      const items = await generateWithAI(prompt, true, 0.7);
      const data = Array.isArray(items) ? items : (items.questions || []);

      return data.map((q: any) => ({
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: q.text || q.question || "Question unavailable",
          options: (Array.isArray(q.options) && q.options.length >= 2) ? q.options.map(String) : ["Option A", "Option B", "Option C", "Option D"],
          correctIndex: (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4) ? q.correctIndex : 0,
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
    const prompt = `Generate a Full Mock Exam Paper for ${exam} (${subject}). Difficulty: ${difficulty}.
    Context/Hints: ${seed}.
    
    Structure Required:
    {
      "title": "${exam} Mock Test",
      "totalMarks": 100,
      "durationMinutes": 60,
      "sections": [
        {
          "title": "Section Name",
          "marksPerQuestion": 4,
          "questions": [
             {
               "text": "Full question string",
               "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
               "correctIndex": 0,
               "explanation": "Detailed solution"
             }
          ]
        }
      ]
    }
    
    Requirements:
    1. Generate ${config.mcqCount || 20} Questions total.
    2. Divide into logical sections if applicable for ${exam}.
    3. Ensure 'options' is always an array of 4 strings.
    4. Ensure 'correctIndex' is a number 0-3.
    5. Return ONLY Valid JSON.`;

    try {
        const rawData = await generateWithAI(prompt, true, 0.7);
        // Sanitize the raw AI response to prevent crashes
        const sanitizedPaper = sanitizePaper(rawData, exam, subject, difficulty);
        return sanitizedPaper;
    } catch (error) {
        console.error("Paper Generation Error:", error);
        return null;
    }
};

export const generatePYQList = async (exam: string, subject: string, year: number, topic: string) => {
    const prompt = `List 10 PYQs for ${exam} (${subject}) year ${year} topic ${topic}. Return JSON array.`;
    const items = await generateWithAI(prompt, true, 0.5);
    const data = Array.isArray(items) ? items : (items.questions || []);
    return data.map((q: any) => ({ ...q, id: `pyq-${Math.random()}`, source: 'PYQ_AI', examType: exam, subject, pyqYear: year }));
};
