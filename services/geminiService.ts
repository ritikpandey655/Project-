
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
    temperature: number = 0.7,
    imagePart?: any 
): Promise<any> => {
    try {
        const config = await getSystemConfig();
        const provider = config.aiProvider || 'gemini'; 
        console.log(`[AI Service] Active Provider: ${provider.toUpperCase()}`);

        let textOutput = "";

        // --- 1. Try Backend (Preferred) ---
        try {
            if (provider === 'groq' && !imagePart) {
                // Call Groq Endpoint (Text Only)
                textOutput = await callBackend('/api/ai/groq', {
                    model: config.modelName || 'llama-3.3-70b-versatile',
                    messages: [{ role: "user", content: prompt }],
                    jsonMode: isJson
                });
            } else {
                // Call Gemini Endpoint (Handles Text + Image)
                const contents = [{ 
                    role: 'user', 
                    parts: imagePart ? [imagePart, { text: prompt }] : [{ text: prompt }] 
                }];

                textOutput = await callBackend('/api/ai/generate', {
                    model: 'gemini-3-flash-preview', 
                    contents: contents,
                    config: { temperature }
                });
            }
        } catch (backendError: any) {
            console.warn(`Backend (${provider}) unreachable. Attempting Client Fallback... Error: ${backendError.message}`);
            
            // --- 2. Client-Side Fallback (If Backend Fails) ---
            const localKeys = getApiKeys();
            
            if (provider === 'groq' && !imagePart) {
                if (!localKeys.groq) throw new Error("Backend failed. Please ensure Server is running or add Client Key.");
                textOutput = await callGroqDirect(localKeys.groq, prompt, isJson);
            } else {
                if (!localKeys.gemini) throw new Error("Backend failed. Please ensure Server is running or add Client Key.");
                textOutput = await callGeminiDirect(localKeys.gemini, prompt, temperature, imagePart);
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

const callGeminiDirect = async (apiKey: string, prompt: string, temperature: number, imagePart?: any) => {
    const ai = new GoogleGenAI({ apiKey });
    const contents = [{ 
        role: 'user', 
        parts: imagePart ? [imagePart, { text: prompt }] : [{ text: prompt }] 
    }];
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: contents,
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
        const res = await fetch('/api/health');
        if (res.ok) {
            const data = await res.json();
            const latency = Date.now() - start;
            const secure = data.env?.gemini === 'Active' || data.env?.groq === 'Active';
            if (secure) {
                return { status: 'Online (Server)', latency, secure: true };
            } else {
                return { status: 'Server No-Keys', latency, secure: false, message: "Backend connected but keys missing" };
            }
        }
        throw new Error("Backend Offline");
    } catch (e) {
        const keys = getApiKeys();
        if (keys.gemini || keys.groq) {
            return { status: 'Client Mode', latency: 1, secure: true };
        }
        return { status: 'Disconnected', latency: 0, secure: false, message: "Start server: npm run server" };
    }
};

// --- Helper for Paper Sanitization ---

const sanitizePaper = (data: any, exam: string, subject: string, difficulty: string) => {
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

    safeData.sections = safeData.sections.map((sec: any, sIdx: number) => {
        const rawQuestions = Array.isArray(sec.questions) ? sec.questions : [];
        const validQuestions = rawQuestions.map((q: any, qIdx: number) => {
            let options = ["Yes", "No"];
            if (Array.isArray(q.options) && q.options.length > 0) options = q.options.map(String);
            else if (Array.isArray(q.choices) && q.choices.length > 0) options = q.choices.map(String); 
            
            let correctIndex = 0;
            if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length) {
                correctIndex = q.correctIndex;
            } else if (typeof q.answer === 'string') {
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

    safeData.sections = safeData.sections.filter((s: any) => s.questions.length > 0);
    if (safeData.sections.length === 0) return null;
    return safeData;
};

// --- Exported Generators ---

export const generateExamQuestions = async (
    exam: string, 
    subject: string, 
    count: number, 
    difficulty: string, 
    topics: string[] = [],
    language: 'en' | 'hi' = 'en' // New parameter
) => {
  try {
      // 1. Get Manual Questions
      const manualQuestions = await getOfficialQuestions(exam, subject, count);
      const remainingCount = count - manualQuestions.length;

      // Ensure manual questions are tagged if they lack source
      const taggedManual = manualQuestions.map(q => ({
          ...q,
          source: QuestionSource.MANUAL,
          isHandwritten: true // Assuming official/manual fetch implies this for your logic
      }));

      if (remainingCount <= 0) {
          return taggedManual.slice(0, count);
      }

      // 2. Determine Provider
      const config = await getSystemConfig();
      const currentProvider = config.aiProvider || 'gemini';

      // Updated Prompt with Language Instruction
      const langInstruction = language === 'hi' 
        ? "OUTPUT LANGUAGE: HINDI (DEVANAGARI SCRIPT). Ensure question text, ALL options, and explanation are in Hindi." 
        : "OUTPUT LANGUAGE: ENGLISH.";

      const prompt = `Generate ${remainingCount} MCQs for ${exam} (${subject}). Difficulty: ${difficulty}. 
      ${topics.length > 0 ? `Topics: ${topics.join(', ')}.` : ''} 
      ${langInstruction}
      Strictly return a JSON Array of objects.
      Schema: [{"text": "Question Stem", "options": ["A", "B", "C", "D"], "correctIndex": 0 (0-3), "explanation": "Logic"}]`;

      const items = await generateWithAI(prompt, true, 0.7);
      const data = Array.isArray(items) ? items : (items.questions || []);

      const aiQuestions = data.map((q: any) => ({
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: q.text || q.question || "Question unavailable",
          options: (Array.isArray(q.options) && q.options.length >= 2) ? q.options.map(String) : ["Option A", "Option B", "Option C", "Option D"],
          correctIndex: (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4) ? q.correctIndex : 0,
          explanation: q.explanation || "Explanation generated by AI.",
          source: QuestionSource.PYQ_AI,
          aiProvider: currentProvider, // Tag with current provider
          examType: exam,
          subject: subject,
          createdAt: Date.now()
      }));

      const mixed = [...taggedManual, ...aiQuestions];
      return mixed.sort(() => 0.5 - Math.random());

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

export const analyzeImageForQuestion = async (base64Image: string, mimeType: string, exam: string, subject: string, languageMode: 'en' | 'hi' | 'both' = 'en') => {
    let schemaStr = '';
    let langInstruction = '';

    if (languageMode === 'en') {
        langInstruction = "Extract ONLY English content. If the image is Hindi, translate it to English.";
        schemaStr = `{ "text": "...", "options": ["..."], "correctIndex": 0, "explanation": "..." }`;
    } else if (languageMode === 'hi') {
        langInstruction = "Extract ONLY Hindi content. Return text in Devanagari script. If image is English, translate to Hindi.";
        schemaStr = `{ "textHindi": "...", "optionsHindi": ["..."], "correctIndex": 0, "explanationHindi": "..." }`;
    } else {
        langInstruction = "Extract BOTH English and Hindi content if present. If only one exists, translate to the other so BOTH sets of fields are populated.";
        schemaStr = `{ "text": "...", "textHindi": "...", "options": ["..."], "optionsHindi": ["..."], "correctIndex": 0, "explanation": "...", "explanationHindi": "..." }`;
    }

    const prompt = `Analyze this image. It contains a question (possibly handwritten).
    Context: ${exam} - ${subject}.
    ${langInstruction}
    
    Return STRICT JSON:
    ${schemaStr}`;

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType
        }
    };

    return await generateWithAI(prompt, true, 0.4, imagePart);
};

// **UPDATED**: Subject Classification Support & Language
export const extractQuestionsFromPaper = async (base64Image: string, mimeType: string, exam: string, validSubjects: string[], languageMode: 'en' | 'hi' | 'both' = 'en') => {
    let langInstruction = '';
    let schemaFields = '';

    if (languageMode === 'en') {
        langInstruction = "Extract in English.";
        schemaFields = `"text": "...", "options": ["..."], "explanation": "..."`;
    } else if (languageMode === 'hi') {
        langInstruction = "Extract in Hindi (Devanagari).";
        schemaFields = `"textHindi": "...", "optionsHindi": ["..."], "explanationHindi": "..."`;
    } else {
        langInstruction = "Extract in BOTH English and Hindi. Translate if needed.";
        schemaFields = `"text": "...", "textHindi": "...", "options": ["..."], "optionsHindi": ["..."], "explanation": "...", "explanationHindi": "..."`;
    }

    const prompt = `You are a professional Question Digitizer. 
    Analyze this entire document/image.
    
    Context: ${exam} Exam.
    Valid Subjects for Classification: ${validSubjects.join(', ')}.
    ${langInstruction}
    
    Task:
    1. Identify all Multiple Choice Questions (MCQs) visible.
    2. Extract/Translate based on language instruction.
    3. **CRITICAL**: Classify the Subject of each question strictly from the provided 'Valid Subjects' list. 
       If a question fits multiple (e.g. Physics in Science), choose the most specific one. 
       If unsure, use "General".
    
    Return STRICT JSON ARRAY:
    [
      {
        ${schemaFields},
        "correctIndex": 0,
        "subject": "The_Classified_Subject" 
      },
      ...
    ]`;

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType
        }
    };

    // Use a slightly lower temperature for consistent classification
    const result = await generateWithAI(prompt, true, 0.3, imagePart);
    
    if (Array.isArray(result)) return result;
    if (result.questions && Array.isArray(result.questions)) return result.questions;
    
    return [];
};

export const generateFullPaper = async (exam: string, subject: string, difficulty: string, seed: string, config: any) => {
    const prompt = `Generate a Full Mock Exam Paper for ${exam} (${subject}). Difficulty: ${difficulty}.
    Context/Hints: ${seed}.
    Structure Required: { "title": "...", "totalMarks": 100, "durationMinutes": 60, "sections": [...] }
    Requirements: Generate ${config.mcqCount || 20} Questions total. Return ONLY Valid JSON.`;

    try {
        const rawData = await generateWithAI(prompt, true, 0.7);
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
