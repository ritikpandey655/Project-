
import { Question, QuestionSource, QuestionType, QuestionPaper, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, logSystemError } from "./storageService";

/**
 * Robust fetch wrapper for the backend AI proxy
 */
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
                logSystemError('API_FAIL', 'AI Quota Exceeded');
                throw new Error("AI Busy: Too many requests. Please wait 60 seconds.");
            }
            logSystemError('ERROR', `Backend Error ${response.status}`, errorText);
            throw new Error(`Connection Error: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || "AI Generation failed.");
        }

        return result.data; 
    } catch (e) {
        console.error("Critical AI Communication Failure:", e);
        throw e;
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
            config: {
                temperature: temperature
            }
        };
        const textOutput = await callBackend('/api/ai/generate', payload);

        if (isJson) {
            try {
                return JSON.parse(cleanJson(textOutput));
            } catch (e) {
                console.error("AI returned malformed JSON:", textOutput);
                throw new Error("AI response was unreadable. Re-trying...");
            }
        }
        return textOutput;
    } catch (e: any) {
        logSystemError('ERROR', 'AI Handshake Failed', e.message);
        throw e;
    }
};

/**
 * Generates MCQs for Practice sessions
 */
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
      Subject: ${subject}. 
      Difficulty: ${difficulty}. 
      ${topics.length > 0 ? `Target Topics: ${topics.join(', ')}.` : ''} 
      Requirements: 4 clear options, 1 correct index (0-3), and a conceptual step-by-step explanation.
      
      Return as a raw JSON array: [{"text": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]`;

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

/**
 * Specialized Doubt Solver (Text)
 */
export const solveTextQuestion = async (
    questionText: string,
    examType: string,
    subject: string
): Promise<any> => {
    const prompt = `Expert Solver Mode: Analyze the following query for ${examType} (${subject}): "${questionText}".
    
    If it's a specific question, solve it with full steps.
    If it's a topic, provide a master MCQ for that topic.
    
    Return JSON:
    {
        "text": "Cleaned original question",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Detailed conceptual breakdown"
    }`;

    return await generateWithAI(prompt, true, 0.4);
};

// Fix: Implemented missing vision-based doubt solver function
/**
 * Vision-based doubt solver extracting questions from images
 */
export const generateQuestionFromImage = async (
    base64: string,
    mimeType: string,
    exam: string,
    subject: string
): Promise<any> => {
    const prompt = `Analyze this image containing a question for the ${exam} exam (${subject}). 
    Extract the question text, identify options, find the correct answer, and provide a detailed solution.
    
    Return JSON format:
    {
        "text": "Extracted question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Detailed step-by-step solution"
    }`;

    try {
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
        const textOutput = await callBackend('/api/ai/generate', payload);
        return JSON.parse(cleanJson(textOutput));
    } catch (e) {
        console.error("Vision Analysis Error:", e);
        return null;
    }
};

// Fix: Implemented missing full-length mock paper generator
/**
 * Generates a comprehensive mock paper with multiple sections and AI logic
 */
export const generateFullPaper = async (
    exam: string,
    subject: string,
    difficulty: string,
    seedData: string,
    config: any
): Promise<QuestionPaper | null> => {
    const prompt = `Generate a professional full-length mock paper for ${exam} (${subject}).
    Difficulty: ${difficulty}.
    Additional Context: ${seedData}
    
    Include exactly ${config.mcqCount} MCQs in Section A.
    ${config.includeShort ? 'Include Section B with short-answer questions.' : ''}
    ${config.includeLong ? 'Include Section C with long-answer questions.' : ''}
    
    Return JSON structure:
    {
      "id": "gen-${Date.now()}",
      "title": "${subject} Master Mock for ${exam}",
      "totalMarks": 100,
      "durationMinutes": 180,
      "examType": "${exam}",
      "subject": "${subject}",
      "difficulty": "${difficulty}",
      "createdAt": ${Date.now()},
      "sections": [
        {
          "id": "sec-1",
          "title": "Section A: Multiple Choice",
          "instructions": "All questions are compulsory. 4 marks each.",
          "marksPerQuestion": 4,
          "questions": [
             {
               "id": "q1",
               "text": "...",
               "options": ["A", "B", "C", "D"],
               "correctIndex": 0,
               "explanation": "..."
             }
          ]
        }
      ]
    }`;

    try {
        const result = await generateWithAI(prompt, true, 0.7, 'gemini-3-pro-preview');
        return result as QuestionPaper;
    } catch (e) {
        console.error("Paper Generation Error:", e);
        return null;
    }
};

// Fix: Implemented missing PYQ library generator
/**
 * Retrieves authentic-style Previous Year Questions based on historical exam patterns
 */
export const generatePYQList = async (
    exam: string,
    subject: string,
    year: number,
    topic: string = ''
): Promise<Question[]> => {
    const prompt = `Provide 10 highly accurate Previous Year Questions (PYQs) for ${exam} (${subject}) for the year ${year}.
    ${topic ? `Focus on topic: ${topic}` : ''}
    
    Return JSON array: [{"id": "...", "text": "...", "options": ["...", "..."], "correctIndex": 0, "explanation": "..."}]`;

    try {
        const items = await generateWithAI(prompt, true, 0.6);
        const data = Array.isArray(items) ? items : (items.questions || []);
        
        return data.map((q: any) => ({
            ...q,
            id: q.id || `pyq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            source: QuestionSource.PYQ_AI,
            examType: exam,
            subject: subject,
            pyqYear: year,
            createdAt: Date.now()
        }));
    } catch (e) {
        console.error("PYQ Retrieval Error:", e);
        return [];
    }
};

/**
 * Connectivity Check for Admin Control
 */
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
