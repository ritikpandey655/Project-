
import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";

// --- CONFIGURATION ---
// 1. Gemini Client (Default)
const apiKey = process.env.API_KEY || "dummy-key";
const ai = new GoogleGenAI({ apiKey });

// 2. Groq Client Helper
const getGroqKey = () => {
  // Priority: 1. LocalStorage (User setting) 2. Environment Variable
  return localStorage.getItem('groq_api_key') || process.env.GROQ_API_KEY || "";
};

// Helpers
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const cleanJson = (text: string) => {
  if (!text) return "[]";
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  let cleaned = match ? match[1] || match[0] : text;
  
  const endBracket = cleaned.lastIndexOf(']');
  const endBrace = cleaned.lastIndexOf('}');
  const lastChar = Math.max(endBracket, endBrace);
  
  if (lastChar !== -1) {
      cleaned = cleaned.substring(0, lastChar + 1);
  }
  return cleaned.trim();
};

const safeOptions = (opts: any): string[] => {
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') return opts.split(',').map(s => s.trim());
    return [];
};

const commonConfig = {
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
};

// --- GROQ API HANDLER (For Super Speed) ---
const fetchFromGroq = async (prompt: string, model = "llama3-70b-8192", jsonMode = false): Promise<any> => {
    // CHECK USER PREFERENCE: If Admin selected Gemini explicitly, skip Groq
    const preferredProvider = localStorage.getItem('selected_ai_provider');
    if (preferredProvider === 'gemini') return null;

    const key = getGroqKey();
    if (!key) return null;
    
    try {
        const body: any = {
            messages: [{ role: "user", content: prompt + (jsonMode ? " Respond ONLY in valid JSON." : "") }],
            model: model,
            temperature: 0.3, // Strict facts
        };

        // Llama 3 on Groq supports JSON mode for reliable output
        if (jsonMode) {
            body.response_format = { type: "json_object" };
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error("Groq API Error");
        
        const data = await response.json();
        return JSON.parse(cleanJson(data.choices[0].message.content));
    } catch (e) {
        console.warn("Groq failed, falling back to Gemini", e);
        return null;
    }
};

// --- MAIN GENERATION FUNCTIONS ---

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  
  // 1. Try Official DB
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const needed = count - officialQs.length;
  const isNEETorJEE = exam.includes('NEET') || exam.includes('JEE');

  // 2. PARALLEL PROCESSING STRATEGY
  const batchSize = 5;
  const batches = Math.ceil(needed / batchSize);
  const promises = [];

  for (let i = 0; i < batches; i++) {
      const currentBatchCount = Math.min(batchSize, needed - (i * batchSize));
      if(currentBatchCount <= 0) continue;

      // PROMPT
      const prompt = `
          Generate ${currentBatchCount} MCQs for ${exam} (${subject}).
          ${topics.length > 0 ? `Topic: ${topics.join(', ')}` : 'Topic: Important Chapters'}
          
          RULES:
          1. NO FAKE QUESTIONS. Verify scientifically/historically.
          2. Difficulty: ${difficulty}.
          3. Format: JSON Array with keys: text, options (array), correctIndex (int), explanation.
          4. ${isNEETorJEE ? 'Strictly NCERT based.' : 'Standard Exam Pattern.'}
      `;

      // EXECUTE: Try Groq first (Speed), then Gemini Parallel (Reliability)
      const fetchPromise = (async () => {
          // A. Try Groq (If Key Exists & Enabled)
          const groqData = await fetchFromGroq(prompt, "llama3-70b-8192", true); // Use JSON mode for array
          // Groq sometimes wraps array in object { "questions": [...] } when forced to json_object
          if (groqData) {
             if (Array.isArray(groqData)) return groqData;
             if (groqData.questions && Array.isArray(groqData.questions)) return groqData.questions;
             // If single object
             if (groqData.text) return [groqData];
          }

          // B. Gemini Parallel Call
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              ...commonConfig,
              temperature: 0.3,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    text_hi: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    explanation_hi: { type: Type.STRING },
                    type: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['text', 'options', 'correctIndex', 'explanation']
                }
              } as Schema
            }
          });
          const text = response.text || "[]";
          return JSON.parse(cleanJson(text));
      })();

      promises.push(fetchPromise);
  }

  try {
      const results = await Promise.all(promises);
      
      let aiQuestions: Question[] = [];
      results.flat().forEach((q: any) => {
          // Robust check for question text
          const qText = q.text || q.question;
          
          if (q && qText) {
              const opts = safeOptions(q.options);
              if (opts.length > 0) {
                  aiQuestions.push({
                      ...q,
                      text: qText,
                      id: generateId('ai-q'),
                      source: QuestionSource.PYQ_AI,
                      examType: exam as ExamType,
                      subject: subject,
                      type: QuestionType.MCQ,
                      options: opts,
                      correctIndex: q.correctIndex ?? 0
                  });
              }
          }
      });

      if (aiQuestions.length === 0 && officialQs.length === 0) throw new Error("No Qs generated");

      return [...officialQs, ...aiQuestions];

  } catch (e) {
      console.warn("Generation Failed:", e);
      if (officialQs.length > 0) return officialQs;
      return MOCK_QUESTIONS_FALLBACK.map(q => ({...q, id: generateId('fall'), examType: exam as ExamType})) as unknown as Question[];
  }
};

export const generateCurrentAffairs = async (
  exam: string,
  count: number = 10
): Promise<Question[]> => {
  // Groq cannot search the web, so we MUST use Gemini for News
  const officialCA = await getOfficialQuestions(exam, 'Current Affairs', count);
  if (officialCA.length >= count) return officialCA;

  try {
      const fetchCount = Math.min(count - officialCA.length, 10);
      const prompt = `
        Search for ${fetchCount} LATEST & REAL Current Affairs news for ${exam} exams (India).
        Based on results, create ${fetchCount} MCQs.
        Format: JSON Array of objects with text, options, correctIndex, explanation.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
          tools: [{ googleSearch: {} }],
        }
      });

      const text = response.text || "[]";
      const aiData = JSON.parse(cleanJson(text));

      const aiQs = aiData.map((q: any) => ({
          id: generateId('ca-q'),
          text: q.text || q.question,
          textHindi: q.text_hi || (q.text || q.question),
          options: safeOptions(q.options),
          optionsHindi: safeOptions(q.options_hi || q.options),
          correctIndex: q.correctIndex || 0,
          explanation: q.explanation,
          explanationHindi: q.explanation_hi,
          source: QuestionSource.PYQ_AI,
          examType: exam as ExamType,
          subject: 'Current Affairs',
          createdAt: Date.now(),
          tags: ['Current Affairs', ...(q.tags || [])],
          type: QuestionType.MCQ
      }));

      return [...officialCA, ...aiQs];
  } catch (e) {
      return officialCA.length > 0 ? officialCA : MOCK_QUESTIONS_FALLBACK as unknown as Question[];
  }
};

export const parseSmartInput = async (input: string, type: 'text' | 'image', examContext: string): Promise<any[]> => {
  // Groq is great for text parsing
  if (type === 'text') {
      const groqResp = await fetchFromGroq(`Extract questions from this text for ${examContext}. Return JSON Array. Text: ${input}`, "llama3-70b-8192", true);
      // Handle wrapped JSON
      if (groqResp) {
          if (Array.isArray(groqResp)) return groqResp;
          if (groqResp.questions && Array.isArray(groqResp.questions)) return groqResp.questions;
      }
  }

  try {
    const prompt = `Extract questions from input for ${examContext}. Return JSON Array.`;
    const contents = { parts: [] as any[] };
    if(type === 'image') {
        contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: input } });
        contents.parts.push({ text: prompt });
    } else {
        contents.parts.push({ text: `${prompt}\n\n${input}` });
    }
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { ...commonConfig, responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || "[]"));
  } catch (e) { return []; }
};

export const generateNews = async (exam: string, month?: string, year?: number, category?: string): Promise<NewsItem[]> => {
  // News needs Gemini Search
  try {
      const prompt = `Search verified news for ${exam} (${month} ${year}, ${category}). Return 8 items as JSON Array {headline, summary, date, category}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { ...commonConfig, tools: [{ googleSearch: {} }] }
      });
      const aiData = JSON.parse(cleanJson(response.text || "[]"));
      return aiData.map((n: any) => ({
          id: generateId('news'),
          headline: n.headline,
          headlineHindi: n.headline_hi,
          summary: n.summary,
          summaryHindi: n.summary_hi,
          category: n.category || category || 'General',
          date: n.date || `${month} ${year}`,
          tags: n.tags || []
      }));
  } catch (e) { return []; }
};

export const generateStudyNotes = async (exam: string, subject?: string): Promise<NewsItem[]> => {
  // Groq is excellent for generating static notes
  const prompt = `Generate 8 High-Yield Formula/Notes for ${exam} (${subject}). Return JSON Array {headline, summary}.`;
  
  const groqResp = await fetchFromGroq(prompt, "llama3-70b-8192", true);
  if (groqResp) {
      const notes = Array.isArray(groqResp) ? groqResp : (groqResp.notes || groqResp.items || []);
      if (notes.length > 0) {
        return notes.map((n: any) => ({
            id: generateId('note'),
            headline: n.headline || n.title,
            summary: n.summary || n.content,
            category: subject || 'Notes',
            date: 'Key Concept',
            tags: []
        }));
      }
  }

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { ...commonConfig, responseMimeType: "application/json" } 
      });
      const aiData = JSON.parse(cleanJson(response.text || "[]"));
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

export const generateSingleQuestion = async (exam: string, subject: string, topic: string): Promise<Partial<Question> | null> => {
  const prompt = `Generate 1 High-Quality MCQ for ${exam} (${subject}: ${topic}). JSON.`;
  
  const groqResp = await fetchFromGroq(prompt, "llama3-70b-8192", true);
  if (groqResp) {
      // Handle single object or array wrapped
      const q = Array.isArray(groqResp) ? groqResp[0] : groqResp;
      return {
          ...q,
          text: q.text || q.question,
          options: safeOptions(q.options)
      };
  }

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { ...commonConfig, responseMimeType: "application/json" }
      });
      const data = JSON.parse(cleanJson(response.text || "{}"));
      return {
          ...data,
          text: data.text || data.question,
          options: safeOptions(data.options)
      };
  } catch (e) { return null; }
};

export const generateQuestionFromImage = async (base64: string, mime: string, exam: string, subject: string): Promise<Partial<Question> | null> => {
  // Images require Gemini
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: `Solve this ${exam} question. Return JSON {text, options, correctIndex, explanation}.` }] },
        config: { ...commonConfig, responseMimeType: "application/json" }
      });
      const data = JSON.parse(cleanJson(response.text || "{}"));
      return {
          ...data,
          text: data.text || data.question,
          options: safeOptions(data.options)
      };
  } catch (e) { return null; }
};

export const generatePYQList = async (exam: string, subject: string, year: number, topic?: string): Promise<Question[]> => {
    const prompt = `Simulate 10 authentic questions for ${year} ${exam} (${subject}). ${topic ? `Topic: ${topic}` : ''}. Return JSON Array.`;
    
    const groqResp = await fetchFromGroq(prompt, "llama3-70b-8192", true);
    if (groqResp) {
        const list = Array.isArray(groqResp) ? groqResp : (groqResp.questions || []);
        if (list.length > 0) {
            return list.map((q: any) => ({
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
        }
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { ...commonConfig, responseMimeType: "application/json" }
        });
        const aiData = JSON.parse(cleanJson(response.text || "[]"));
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

export const generateFullPaper = async (exam: string, subject: string, difficulty: string, seed: string, config: any): Promise<QuestionPaper | null> => {
    try {
        const prompt = `Generate Mock Paper for ${exam} (${subject}). Diff: ${difficulty}. MCQs: ${config.mcqCount || 10}. Return complex JSON {title, totalMarks, duration, sections: [{title, marksPerQuestion, questions: []}]}.`;
        
        let data = null;

        // 1. Try Groq (Fastest) - Use JSON mode
        if (localStorage.getItem('selected_ai_provider') !== 'gemini') {
             data = await fetchFromGroq(prompt, "llama3-70b-8192", true);
        }

        // 2. Fallback to Gemini
        if (!data) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { ...commonConfig, responseMimeType: "application/json" }
            });
            data = JSON.parse(cleanJson(response.text || "{}"));
        }
        
        if (!data) return null;

        const sections = data.sections?.map((sec: any, sIdx: number) => ({
            id: `sec-${sIdx}`,
            title: sec.title || `Section ${sIdx+1}`,
            instructions: "Attempt all questions",
            marksPerQuestion: sec.marksPerQuestion || 1,
            questions: sec.questions?.map((q: any, qIdx: number) => ({
                id: generateId(`p-q-${sIdx}-${qIdx}`),
                // ROBUST FALLBACK: Sometimes AI returns 'question' instead of 'text'
                text: q.text || q.question || "Question text unavailable",
                textHindi: q.text_hi,
                options: safeOptions(q.options),
                correctIndex: safeOptions(q.options).findIndex((o: string) => o === q.answer),
                answer: q.answer,
                explanation: q.explanation,
                type: (q.options && q.options.length > 0) ? QuestionType.MCQ : QuestionType.SHORT_ANSWER,
                examType: exam as ExamType,
                source: QuestionSource.PYQ_AI,
                createdAt: Date.now(),
                marks: sec.marksPerQuestion
            }))
        }));
        return {
            id: generateId('paper'),
            title: data.title || `${exam} Mock Paper`,
            examType: exam as ExamType,
            subject: subject,
            difficulty: difficulty,
            totalMarks: data.totalMarks || 100,
            durationMinutes: data.duration || 60,
            sections: sections || [],
            createdAt: Date.now()
        };
    } catch (e) { return null; }
};
