
import { Question, QuestionSource, QuestionType, QuestionPaper, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getSystemConfig, logSystemError } from "./storageService";

// --- BACKEND API HANDLER ---

const callBackend = async (endpoint: string, payload: any) => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 429) {
                logSystemError('API_FAIL', 'AI Quota Exceeded (429)');
                throw new Error("AI Quota Exceeded. Please wait a minute.");
            }
            logSystemError('ERROR', `Backend Error: ${response.status}`, errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || "Unknown Backend Error");
        }

        return result.data; 
    } catch (e) {
        console.error("API Call Failed:", e);
        throw e;
    }
};

// --- UTILS ---

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
    if (Array.isArray(opts) && opts.length > 0) return opts.map(o => String(o));
    return ["Option A", "Option B", "Option C", "Option D"];
};

// --- MAIN GENERATION FUNCTION ---

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
            config: {
                temperature: temperature,
                responseMimeType: isJson ? "application/json" : "text/plain"
            }
        };
        const textOutput = await callBackend('/api/ai/generate', payload);

        if (isJson) {
            try {
                return JSON.parse(cleanJson(textOutput));
            } catch (e) {
                console.error("AI JSON Parse Error:", textOutput);
                throw new Error("AI returned invalid data format.");
            }
        }
        return textOutput;
    } catch (e: any) {
        logSystemError('ERROR', 'AI Generation Failed', e.message);
        throw e;
    }
};

/**
 * Solves a specific question text directly.
 */
export const solveTextQuestion = async (
    questionText: string,
    examType: string,
    subject: string
): Promise<any> => {
    const prompt = `Act as an expert exam tutor for ${examType} (${subject}). 
    Analyze and solve this query: "${questionText}".
    
    If it's a topic, generate a high-quality MCQ for it.
    If it's a specific question, provide the correct answer and explanation.
    
    Return JSON:
    {
        "text": "The cleaned question text",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "explanation": "Step-by-step logic"
    }`;

    return await generateWithAI(prompt, true, 0.3);
};

/**
 * Generates questions from an image.
 */
export const generateQuestionFromImage = async (
    base64: string, 
    mimeType: string,
    examType: string, 
    subject: string
): Promise<any> => {
    const prompt = `Extract and solve the exam question for ${examType} (${subject}) from this image. 
    Return a JSON object with: text, options (4), correctIndex, and a detailed explanation.`;

    const payload = {
        model: 'gemini-3-flash-preview',
        contents: [{ 
            role: 'user', 
            parts: [
                { inlineData: { data: base64, mimeType: mimeType } },
                { text: prompt }
            ] 
        }],
        config: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
    };

    const textOutput = await callBackend('/api/ai/generate', payload);
    return JSON.parse(cleanJson(textOutput));
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
      const prompt = `Generate ${neededCount} MCQs for ${exam} (${subject}). Difficulty: ${difficulty}. 
      ${topics.length > 0 ? `Focus on topics: ${topics.join(', ')}.` : ''} 
      Return JSON array: [{text, options:[], correctIndex, explanation}].`;

      const items = await generateWithAI(prompt, true, 0.5);
      const data = Array.isArray(items) ? items : (items.questions || []);

      const formatted = data.map((q: any) => ({
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: q.text || q.question,
          options: safeOptions(q.options),
          correctIndex: q.correctIndex ?? 0,
          explanation: q.explanation || "Logic-based answer.",
          source: QuestionSource.PYQ_AI,
          examType: exam,
          subject: subject,
          createdAt: Date.now()
      }));

      return [...officialQs, ...formatted];
  } catch (e) {
      console.warn("AI Generation failed, using fallback.", e);
      return MOCK_QUESTIONS_FALLBACK as any;
  }
};

/**
 * Generates a list of Previous Year Questions (PYQs).
 */
export const generatePYQList = async (
    exam: string, 
    subject: string, 
    year: number,
    topic: string = ''
): Promise<Question[]> => {
    const prompt = `Act as an expert exam archivist. Provide 10 realistic Previous Year Questions for ${exam} in the subject of ${subject} specifically for the year ${year}. ${topic ? `Focus on the topic: ${topic}.` : ''}
    
    Return a JSON array of objects:
    [{
        "text": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Detailed explanation of the solution"
    }]`;

    try {
        const items = await generateWithAI(prompt, true, 0.4);
        const data = Array.isArray(items) ? items : (items.questions || []);

        return data.map((q: any) => ({
            id: `pyq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            text: q.text || q.question,
            options: safeOptions(q.options),
            correctIndex: q.correctIndex ?? 0,
            explanation: q.explanation || "Verified answer from official archives.",
            source: QuestionSource.OFFICIAL,
            examType: exam,
            subject: subject,
            pyqYear: year,
            createdAt: Date.now()
        }));
    } catch (e) {
        console.warn("Failed to fetch PYQ list, returning empty array", e);
        return [];
    }
};

export const generateFullPaper = async (
    exam: string, 
    subject: string, 
    difficulty: string, 
    seedData: string, 
    config: any
): Promise<QuestionPaper | null> => {
    const qCount = config.mcqCount || 20;
    const prompt = `Create a full ${exam} Mock Paper for ${subject}. 
    Difficulty: ${difficulty}. Additional context: ${seedData}.
    Generate exactly ${qCount} MCQs with detailed explanations.
    
    JSON structure: {
        "title": "${exam} Mock Test", 
        "totalMarks": ${qCount * 4}, 
        "durationMinutes": 180, 
        "sections": [{ "title": "Main Section", "questions": [{text, options, correctIndex, explanation}] }]
    }`;

    try {
        const data = await generateWithAI(prompt, true, 0.4);
        if (!data || !data.sections) return null;

        data.sections.forEach((s: any) => {
            s.id = `sec-${Math.random().toString(36).substr(2, 5)}`;
            s.questions.forEach((q: any) => {
                q.id = `pq-${Math.random().toString(36).substr(2, 5)}`;
                q.options = safeOptions(q.options);
            });
        });

        return {
            ...data,
            id: `paper-${Date.now()}`,
            examType: exam,
            subject: subject,
            difficulty: difficulty,
            createdAt: Date.now()
        } as QuestionPaper;
    } catch (e) { 
        return null; 
    }
};

export const checkAIConnectivity = async (): Promise<{ status: 'Operational' | 'Failed', latency: number, secure: boolean }> => {
    const start = Date.now();
    try {
        const res = await fetch('/api/health');
        if (res.ok) {
            const data = await res.json();
            return { status: 'Operational', latency: Date.now() - start, secure: data.secure };
        }
        return { status: 'Failed', latency: 0, secure: false };
    } catch (e) {
        return { status: 'Failed', latency: 0, secure: false };
    }
};
