
import { Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";

// --- CONFIGURATION ---

// Global flag to pause API calls if quota is hit
let isQuotaExhausted = false;
let quotaResetTime = 0;

const checkQuota = () => {
    if (isQuotaExhausted) {
        if (Date.now() > quotaResetTime) {
            isQuotaExhausted = false; // Cooldown over
            return true;
        }
        return false; // Still cooling down
    }
    return true;
};

// Helper to call Backend Proxy instead of Direct SDK
const callGeminiBackend = async (params: { model: string, contents: any, config?: any }) => {
  if (!checkQuota()) {
      throw new Error("QUOTA_COOL_DOWN");
  }

  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    let result;
    
    if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
    } else {
        const text = await response.text();
        throw new Error(`Server Error (${response.status}): ${text.slice(0, 50)}...`);
    }

    if (!result.success) {
      // Detect Quota Limit specifically
      if (response.status === 429 || result.error?.includes('429') || result.error?.includes('quota')) {
          console.warn("⚠️ API Quota Exceeded. Switching to Offline Mode for 60s.");
          isQuotaExhausted = true;
          quotaResetTime = Date.now() + 60000; // 1 Minute Cooldown
          throw new Error("QUOTA_EXCEEDED");
      }
      throw new Error(result.error || 'Backend generation failed');
    }
    
    return { text: result.data }; 
  } catch (error: any) {
    // Re-throw if it's our specific quota error
    if (error.message === "QUOTA_EXCEEDED" || error.message === "QUOTA_COOL_DOWN") throw error;
    
    console.error("Backend Call Failed:", error);
    throw error;
  }
};

// 2. Groq Client Helper
const getLocalGroqKey = () => {
  return localStorage.getItem('groq_api_key') || "";
};

// Helpers
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const cleanJson = (text: string) => {
  if (!text) return "[]";
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

  if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned.trim();
};

const safeOptions = (opts: any): string[] => {
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') return opts.split(',').map(s => s.trim());
    return ["Option A", "Option B", "Option C", "Option D"];
};

const commonConfig = {
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
};

// --- ROBUST GENERATION HELPER (Multi-Model Retry) ---
const generateWithRetry = async (
    contents: any, 
    isJson: boolean = true,
    temperature: number = 0.3
): Promise<any> => {
    
    if (!checkQuota()) throw new Error("QUOTA_EXCEEDED");

    const MODELS = ['gemini-2.5-flash', 'gemini-3-pro-preview'];
    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`Trying AI Model: ${model}...`);
            const response = await callGeminiBackend({
                model: model,
                contents: contents,
                config: { 
                    ...commonConfig, 
                    temperature: temperature, 
                    responseMimeType: isJson ? "application/json" : "text/plain" 
                }
            });

            const text = response.text || (isJson ? "{}" : "");
            
            if (isJson) {
                try {
                    const cleaned = cleanJson(text);
                    return JSON.parse(cleaned);
                } catch (jsonError) {
                    console.warn(`Model ${model} returned invalid JSON.`, jsonError);
                    throw new Error("Invalid JSON");
                }
            }
            return text;

        } catch (e: any) {
            // Immediate fail if quota exceeded
            if (e.message === "QUOTA_EXCEEDED" || e.message === "QUOTA_COOL_DOWN") throw e;
            
            console.warn(`Model ${model} failed:`, e.message);
            lastError = e;
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }
    
    throw lastError || new Error("AI Service Unavailable");
};

// --- SUBJECT ISOLATION LOGIC ---
const getSubjectConstraint = (subject: string): string => {
    const s = subject.toLowerCase();
    // (Constraints remain same as before)
    if (s.includes('history')) return "STRICTLY History (Ancient, Medieval, Modern, Art & Culture).";
    if (s.includes('polity') || s.includes('civics')) return "STRICTLY Polity, Constitution, Governance.";
    return `STRICTLY ${subject}.`;
};

// --- MAIN GENERATION FUNCTIONS ---

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  
  // 1. Try Official DB First
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const needed = count - officialQs.length;
  const isUPBoard = exam.includes('UP Board');
  const subjectConstraint = getSubjectConstraint(subject);
  
  const basePrompt = `
      ACT AS A STRICT EXAMINER for ${exam}.
      SUBJECT: ${subject}.
      CONSTRAINT: ${subjectConstraint}
      DIFFICULTY: ${difficulty}.
      ${topics.length > 0 ? `SPECIFIC TOPICS: ${topics.join(', ')}` : ''}
      ${isUPBoard ? 'LANGUAGE: Hinglish (Hindi terms in Roman) or Hindi (Devanagari).' : ''}
      Create distinct, high-quality MCQs.
      OUTPUT FORMAT (JSON ARRAY ONLY):
      [ { "text": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." } ]
  `;

  let aiQuestions: Question[] = [];

  try {
      if (checkQuota()) {
          // OPTIMIZATION: Always ask for 10 even if fewer needed, to cache more and reduce calls
          const requestCount = Math.max(needed, 10);
          const batchData = await generateWithRetry(`${basePrompt} \n Generate ${requestCount} questions.`, true, 0.4);
          let items = Array.isArray(batchData) ? batchData : (batchData.questions || []);
          
          const validItems = items.map((q: any) => ({
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
          aiQuestions = validItems;
      }
  } catch (e) {
      console.warn("AI Generation Failed (Quota/Error), using fallback.");
  }

  const finalQuestions = [...officialQs, ...aiQuestions];

  // FALLBACK if empty
  if (finalQuestions.length === 0) {
      console.warn("Using Fallback Mock Data");
      return MOCK_QUESTIONS_FALLBACK.map((q, i) => ({
          ...q, 
          id: generateId(`fall-${i}`),
          examType: exam as ExamType,
          subject: subject
      })) as unknown as Question[];
  }

  return finalQuestions;
};

export const generateFullPaper = async (exam: string, subject: string, difficulty: string, seed: string, config: any): Promise<QuestionPaper | null> => {
    try {
        if (!checkQuota()) throw new Error("QUOTA_EXCEEDED");

        const subjectConstraint = getSubjectConstraint(subject);
        const hasSyllabus = config.syllabus && config.syllabus.data;
        
        // Shortened Prompt to save tokens
        const blueprintPromptText = `
            Create Mock Paper Blueprint for ${exam} (${subject}).
            Difficulty: ${difficulty}.
            Config: ${config.mcqCount || 10} MCQs.
            OUTPUT JSON: { "title": "", "totalMarks": 100, "duration": 60, "sections": [{ "title": "Sec A", "questionCount": ${config.mcqCount}, "type": "MCQ" }] }
        `;

        let blueprint = await generateWithRetry(blueprintPromptText, true, 0.2);
        
        if (!blueprint || !blueprint.sections) throw new Error("Invalid Blueprint");

        const filledSections = [];
        
        for (const [sIdx, sec] of blueprint.sections.entries()) {
            const qPromptText = `Generate ${sec.questionCount} ${sec.type} questions for ${exam} (${subject}). JSON Array.`;
            
            let questions = [];
            try {
                if (hasSyllabus) {
                     const contents = { parts: [
                         { inlineData: { mimeType: config.syllabus.mimeType, data: config.syllabus.data } },
                         { text: qPromptText }
                     ]};
                     questions = await generateWithRetry(contents, true, 0.3);
                } else {
                    questions = await generateWithRetry(qPromptText, true, 0.3);
                }
            } catch (e) {
                // If section fails, fill with mock
                questions = MOCK_QUESTIONS_FALLBACK.slice(0, sec.questionCount).map(q => ({
                    text: q.text, options: q.options, answer: q.options[q.correctIndex], explanation: q.explanation
                }));
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
                    correctIndex: 0, // Simplified for fallback
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
        console.error("Paper Generation Failed, returning Mock Paper.", e);
        return {
            id: generateId('paper-fallback'),
            title: `${exam} Mock (Offline Mode)`,
            examType: exam as ExamType,
            subject: subject,
            difficulty: difficulty,
            totalMarks: 100,
            durationMinutes: 60,
            sections: [{
                id: 'sec-1',
                title: 'General Section',
                instructions: 'Practice Questions (Offline Mode)',
                marksPerQuestion: 2,
                questions: MOCK_QUESTIONS_FALLBACK.map((q, i) => ({
                    ...q, id: generateId(`fall-${i}`), examType: exam as ExamType
                })) as unknown as Question[]
            }],
            createdAt: Date.now()
        };
    }
};

export const generateCurrentAffairs = async (exam: string, count: number = 10): Promise<Question[]> => {
  const officialCA = await getOfficialQuestions(exam, 'Current Affairs', count);
  if (officialCA.length >= count || !checkQuota()) return officialCA.length > 0 ? officialCA : MOCK_QUESTIONS_FALLBACK as unknown as Question[];

  try {
      const prompt = `Generate ${count} Current Affairs MCQs for ${exam} India. JSON Array.`;
      const aiData = await generateWithRetry(prompt, true, 0.2);
      
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
      return [...officialCA, ...aiQs];
  } catch (e) {
      return officialCA.length > 0 ? officialCA : MOCK_QUESTIONS_FALLBACK as unknown as Question[];
  }
};

// ... (Other functions remain similar but wrapped with try-catch fallback) ...

export const generateSingleQuestion = async (exam: string, subject: string, topic: string): Promise<Partial<Question> | null> => {
  if (!checkQuota()) return MOCK_QUESTIONS_FALLBACK[0] as unknown as Partial<Question>;
  try {
      const data = await generateWithRetry(`Generate 1 MCQ for ${exam} (${subject}: ${topic}). JSON.`, true, 0.2);
      return { ...data, text: data.text || data.question, options: safeOptions(data.options) };
  } catch (e) { return null; }
};

export const parseSmartInput = async (input: string, type: 'text' | 'image', examContext: string): Promise<any[]> => {
  if (!checkQuota()) return [];
  try {
    const prompt = `Extract MCQs from this ${type}. JSON Array of objects {text, options, correct_index, explanation}.`;
    const contents = { parts: [] as any[] };
    if(type === 'image') {
        contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: input } });
        contents.parts.push({ text: prompt });
    } else {
        contents.parts.push({ text: `${prompt}\n\n${input}` });
    }
    const parsed = await generateWithRetry(contents, true, 0.1);
    return Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (e) { return []; }
};

export const generateNews = async (exam: string, month?: string, year?: number, category?: string): Promise<NewsItem[]> => {
  if (!checkQuota()) return []; 
  try {
      const prompt = `News headlines for ${exam} (${month} ${year}). JSON Array {headline, summary}.`;
      const aiData = await generateWithRetry(prompt, true, 0.2);
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
  if (!checkQuota()) return [];
  try {
      const aiData = await generateWithRetry(`Formulas for ${exam} ${subject}. JSON Array {headline, summary}.`, true, 0.2);
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
  if (!checkQuota()) return null;
  try {
      const contents = { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: `Solve this. Return JSON {text, options, correctIndex, explanation}.` }] };
      const data = await generateWithRetry(contents, true, 0.1);
      return { ...data, text: data.text || data.question, options: safeOptions(data.options) };
  } catch (e) { return null; }
};

export const generatePYQList = async (exam: string, subject: string, year: number, topic?: string): Promise<Question[]> => {
    if (!checkQuota()) return [];
    try {
        const aiData = await generateWithRetry(`10 questions for ${year} ${exam} (${subject}). JSON.`, true, 0.2);
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
