import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions } from "./storageService";

const RATE_LIMIT_DELAY = 2500; 
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

export const resetAIQuota = () => {
    lastCallTime = 0;
    queuePromise = Promise.resolve();
};

const callAIBackendProxy = async (params: { model: string, contents?: any, messages?: any, provider?: string, config?: any }) => {
  try {
    const response = await fetch(`/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI_ERROR_${response.status}: ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown AI Error');
    return { text: result.data }; 

  } catch (error: any) {
    console.error("AI Proxy Failed:", error);
    throw error;
  }
};

export const generateWithAI = async (
    prompt: string, 
    isJson: boolean = true, 
    temperature: number = 0.3
): Promise<any> => {
    
    const provider = localStorage.getItem('selected_ai_provider') || 'gemini';
    const config = { 
        temperature: temperature,
        responseMimeType: isJson ? "application/json" : "text/plain"
    };

    let params: any;

    if (provider === 'groq') {
        const groqKey = localStorage.getItem('groq_api_key');
        params = {
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            config
        };
    } else {
        params = {
            provider: 'gemini',
            model: 'gemini-3-flash-preview', // Instructions specify this for text
            contents: { parts: [{ text: prompt }] },
            config
        };
    }

    try {
        const response = await enqueueRequest(() => callAIBackendProxy(params));
        const text = response.text || (isJson ? "{}" : "");
        return isJson ? JSON.parse(cleanJson(text)) : text;
    } catch (e: any) {
        console.error("Generation Failed:", e);
        throw e;
    }
};

const cleanJson = (text: string) => {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) return jsonBlockMatch[1].trim();
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
  const start = Math.min(cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'), cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('['));
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  return (start !== Infinity && end !== -1) ? cleaned.substring(start, end + 1).trim() : cleaned.trim();
};

export const checkAIConnectivity = async (): Promise<'Operational' | 'Degraded' | 'Rate Limited' | 'Failed'> => {
    try {
        await generateWithAI("ping", false, 0.1);
        return 'Operational';
    } catch (e: any) {
        if (e.message.includes("429")) return 'Rate Limited';
        return 'Failed';
    }
};

const safeOptions = (opts: any): string[] => Array.isArray(opts) ? opts : ["A", "B", "C", "D"];

// Fix: Updated signature to accept difficulty and topics to match App.tsx calls
export const generateExamQuestions = async (
    exam: string, 
    subject: string, 
    count: number = 5,
    difficulty: string = 'Medium',
    topics: string[] = []
): Promise<Question[]> => {
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const prompt = `ACT AS A STRICT EXAMINER for ${exam}. Subject: ${subject}. Difficulty: ${difficulty}. ${topics.length > 0 ? `Topics: ${topics.join(', ')}.` : ''} Create ${count} MCQs in JSON array format: [{text, options:[], correctIndex, explanation}].`;

  try {
      const items = await generateWithAI(prompt, true, 0.4);
      const formatted = (Array.isArray(items) ? items : (items.questions || [])).map((q: any) => ({
          text: q.text || q.question,
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
      return officialQs.length > 0 ? officialQs : MOCK_QUESTIONS_FALLBACK.map(q => ({...q, id: `f-${Math.random()}`})) as any;
  }
};

export const generateCurrentAffairs = async (exam: string, count: number = 5): Promise<Question[]> => {
  const prompt = `Generate ${count} Current Affairs MCQs for ${exam} (2024-2025) in JSON array format: [{text, options:[], correctIndex, explanation}].`;
  try {
    const items = await generateWithAI(prompt, true, 0.4);
    return (Array.isArray(items) ? items : (items.questions || [])).map((q: any) => ({
        text: q.text || q.question,
        id: `ca-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
        const prompt = `Generate 10 PYQs for ${year} ${exam} (${subject}). ${topic ? `Topic: ${topic}` : ''} JSON array.`;
        const data = await generateWithAI(prompt, true, 0.2);
        return data.map((q: any) => ({
            ...q,
            id: `pyq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
      const data = await generateWithAI(`Generate 1 MCQ for ${exam} (${subject}: ${topic}). Output JSON {text, options, correctIndex, explanation}.`, true, 0.2);
      return { ...data, text: data.text || data.question, options: safeOptions(data.options) };
  } catch (e) { return null; }
};

export const generateNews = async (exam: string, month?: string, year?: number, category?: string): Promise<NewsItem[]> => {
    try {
        const prompt = `Provide 5 news items for ${exam} students for ${month} ${year}${category ? ` in ${category}` : ''}. JSON array {headline, summary}.`;
        const data = await generateWithAI(prompt, true, 0.2);
        return data.map((n: any) => ({
            id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
        const data = await generateWithAI(`5 formulas/notes for ${exam} ${subject}. JSON array {headline, summary}.`, true, 0.2);
        return data.map((n: any) => ({
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
      const prompt = `Extract MCQs from this ${type}. Context: ${examContext}. Return JSON array [{text, options:[], correctIndex, explanation}].`;
      const result = await generateWithAI(`${prompt}\n\nInput: ${input}`, true, 0.1);
      return Array.isArray(result) ? result : (result.questions || []);
    } catch (e) { return []; }
};

// Fix: Added missing generateQuestionFromImage export for UploadForm.tsx
export const generateQuestionFromImage = async (base64: string, mimeType: string, exam: string, subject: string): Promise<Partial<Question> | null> => {
    try {
        const result = await parseSmartInput(base64, 'image', `Exam: ${exam}, Subject: ${subject}`);
        return result.length > 0 ? result[0] : null;
    } catch (e) {
        return null;
    }
};

// Fix: Added missing generateFullPaper export for PaperGenerator.tsx
export const generateFullPaper = async (
    exam: string, 
    subject: string, 
    difficulty: string, 
    seedData: string, 
    config: any
): Promise<QuestionPaper | null> => {
    const prompt = `Generate a full ${exam} question paper for ${subject} with difficulty ${difficulty}. 
    Topics/Hints: ${seedData}. 
    Config: ${JSON.stringify(config)}.
    Return JSON: {
        "title": "Mock Paper",
        "examType": "${exam}",
        "subject": "${subject}",
        "difficulty": "${difficulty}",
        "totalMarks": 100,
        "durationMinutes": 180,
        "sections": [
            {
                "id": "sec-1",
                "title": "Section A",
                "instructions": "Answer all questions.",
                "marksPerQuestion": 2,
                "questions": [
                    { "text": "...", "options": ["...", "..."], "correctIndex": 0, "explanation": "...", "type": "MCQ", "marks": 2 }
                ]
            }
        ]
    }`;

    try {
        const data = await generateWithAI(prompt, true, 0.4);
        return {
            ...data,
            id: `paper-${Date.now()}`,
            createdAt: Date.now()
        } as QuestionPaper;
    } catch (e) {
        return null;
    }
};

export const extractSyllabusFromImage = async (base64: string, mimeType: string): Promise<string> => {
    return await generateWithAI("Extract syllabus from the provided image context.", false, 0.1);
};