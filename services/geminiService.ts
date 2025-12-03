
import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";

// Initialize Client-side Gemini safely
const apiKey = process.env.API_KEY || "dummy-key-to-prevent-crash";
if (!process.env.API_KEY) {
    console.warn("⚠️ API_KEY is missing. AI generation will fallback to mock data.");
}
const ai = new GoogleGenAI({ apiKey });

// Helpers
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const cleanJson = (text: string) => {
  if (!text) return "[]";
  // Attempt to find JSON array or object within markdown code blocks or raw text
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  let cleaned = match ? match[1] || match[0] : text;
  
  // Remove any trailing text that might be search citations
  const endBracket = cleaned.lastIndexOf(']');
  const endBrace = cleaned.lastIndexOf('}');
  const lastChar = Math.max(endBracket, endBrace);
  
  if (lastChar !== -1) {
      cleaned = cleaned.substring(0, lastChar + 1);
  }
  
  return cleaned.trim();
};

// Common Config for Educational Content
const commonConfig = {
    // Disable safety filters to ensure educational content (history, wars, politics) isn't blocked
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
};

export const parseSmartInput = async (
  input: string,
  type: 'text' | 'image',
  examContext: string
): Promise<any[]> => {
  try {
    const prompt = `Extract all questions from this input for ${examContext}. Return JSON Array. Remove question numbers.`;
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
        config: {
            ...commonConfig,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        text_hi: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correct_index: { type: Type.INTEGER },
                        explanation: { type: Type.STRING },
                        subject: { type: Type.STRING }
                    }
                }
            } as Schema
        }
    });
    
    return JSON.parse(cleanJson(response.text || "[]"));
  } catch (e) {
    console.error("Smart Parse Error:", e);
    return [];
  }
};

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  
  // 1. Hybrid: Try Official DB first
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const remainingCount = count - officialQs.length;
  // Cap at 10 for speed
  const fetchCount = Math.min(remainingCount, 10); 
  
  // 2. Client-side Generation
  try {
      const prompt = `
          Act as a strict Examiner for ${exam}.
          Generate ${fetchCount} highly accurate, solvable MCQs for subject: ${subject}.
          ${topics.length > 0 ? `Topics: ${topics.join(', ')}` : 'Topics: Core Syllabus'}
          
          CRITICAL RULES:
          1. NO FAKE QUESTIONS. Verify facts internally.
          2. Difficulty: ${difficulty}.
          3. Format: Return a raw JSON Array.
          4. Ensure 4 distinct options.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Using latest Flash model
        contents: prompt,
        config: {
          ...commonConfig,
          systemInstruction: `You are a strict academic AI for Indian Exams (${exam}). Do not hallucinate. If unsure, do not generate. Return valid JSON.`,
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

      const jsonStr = cleanJson(response.text || "[]");
      const aiData = JSON.parse(jsonStr);

      if (!Array.isArray(aiData) || aiData.length === 0) {
          throw new Error("Empty AI Response");
      }

      const aiQuestions = aiData.map((q: any) => ({
          ...q,
          id: generateId('ai-q'),
          source: QuestionSource.PYQ_AI,
          examType: exam as ExamType,
          subject: subject,
          type: QuestionType.MCQ,
          options: q.options || [],
          correctIndex: q.correctIndex ?? 0
      }));

      return [...officialQs, ...aiQuestions];

  } catch (e) {
      console.warn("AI Generation Failed, using Fallback:", e);
      const needed = count - officialQs.length;
      const fallback = MOCK_QUESTIONS_FALLBACK.slice(0, needed).map(q => ({
          ...q, 
          id: generateId('fallback'), 
          examType: exam as ExamType,
          subject: subject
      })) as unknown as Question[];
      
      return [...officialQs, ...fallback];
  }
};

export const generatePYQList = async (
  exam: string,
  subject: string,
  year: number,
  topic?: string
): Promise<Question[]> => {
  const allOfficial = await getOfficialQuestions(exam, subject, 50);
  const officialPYQs = allOfficial.filter(q => q.pyqYear === year);
  if (officialPYQs.length >= 5) return officialPYQs;

  try {
      const prompt = `
          Simulate 10 authentic questions for ${year} ${exam} (${subject}).
          ${topic ? `Focus Topic: ${topic}` : ''}
          Strictly adhere to the exam pattern of ${year}.
          Return JSON Array.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
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
                answer: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ['text', 'explanation']
            }
          } as Schema
        }
      });

      const aiData = JSON.parse(cleanJson(response.text || "[]"));
      
      const aiPYQs = aiData.map((q: any) => ({
          ...q,
          id: generateId(`pyq-${year}`),
          source: QuestionSource.PYQ_AI,
          examType: exam as ExamType,
          subject: subject,
          pyqYear: year,
          type: q.type || (q.options ? QuestionType.MCQ : QuestionType.SHORT_ANSWER)
      }));

      return [...officialPYQs, ...aiPYQs];
  } catch (e) {
      return officialPYQs;
  }
};

export const generateCurrentAffairs = async (
  exam: string,
  count: number = 10
): Promise<Question[]> => {
  const officialCA = await getOfficialQuestions(exam, 'Current Affairs', count);
  if (officialCA.length >= count) return officialCA;

  try {
      const fetchCount = Math.min(count - officialCA.length, 10);
      const prompt = `
        Search for ${fetchCount} LATEST & REAL Current Affairs news items relevant to Indian Competitive Exams (${exam}).
        Based on these search results, generate ${fetchCount} high-quality MCQs.
        
        CRITICAL RULES:
        1. NO FAKE NEWS. Use the search results provided.
        2. Questions must be factual and recent.
        3. Return strictly a JSON Array inside a markdown code block.
        
        JSON Structure:
        [
          {
            "text": "Question text...",
            "text_hi": "Hindi translation...",
            "options": ["A", "B", "C", "D"],
            "options_hi": ["A_hi", "B_hi", "C_hi", "D_hi"],
            "correctIndex": 0, 
            "explanation": "Detailed explanation...",
            "explanation_hi": "Hindi explanation...",
            "tags": ["Tag1"]
          }
        ]
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
          tools: [{ googleSearch: {} }], // ENABLE SEARCH for Truth
          // NOTE: responseMimeType JSON is NOT supported with Search tools. We must parse text manually.
        }
      });

      const text = response.text || "[]";
      const aiData = JSON.parse(cleanJson(text));

      const aiQs = aiData.map((q: any) => ({
          id: generateId('ca-q'),
          text: q.text,
          textHindi: q.text_hi || q.text,
          options: q.options,
          optionsHindi: q.options_hi || q.options,
          correctIndex: q.correctIndex,
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
      console.error("CA Generation Failed:", e);
      // Fallback only if search fails entirely
      return officialCA.length > 0 ? officialCA : MOCK_QUESTIONS_FALLBACK as unknown as Question[];
  }
};

export const generateNews = async (
  exam: string,
  month?: string,
  year?: number,
  category?: string
): Promise<NewsItem[]> => {
  const officialNews = await getOfficialNews(category, month, year);
  
  try {
      const prompt = `
        Search for REAL verified news events for ${exam} preparation. 
        Period: ${month} ${year}. Category: ${category}.
        
        Strictly extract 8 REAL events from the search results.
        NO FAKE DATES. NO HALLUCINATIONS.
        
        Return a JSON Array inside a markdown code block.
        Structure:
        [
          {
            "headline": "Title...",
            "headline_hi": "Hindi Title...",
            "summary": "Short description...",
            "summary_hi": "Hindi description...",
            "category": "Category",
            "date": "DD Month YYYY"
          }
        ]
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
          tools: [{ googleSearch: {} }] // ENABLE SEARCH for Truth
        }
      });

      const text = response.text || "[]";
      const aiData = JSON.parse(cleanJson(text));

      const aiNews = aiData.map((n: any) => ({
          id: generateId('news'),
          headline: n.headline,
          headlineHindi: n.headline_hi || n.headline,
          summary: n.summary,
          summaryHindi: n.summary_hi || n.summary,
          category: n.category || category || 'General',
          date: n.date || `${month} ${year}`,
          tags: n.tags || []
      }));

      return [...officialNews, ...aiNews];
  } catch (e) {
      console.error("News Generation Failed:", e);
      return officialNews;
  }
};

export const generateStudyNotes = async (
  exam: string,
  subject?: string
): Promise<NewsItem[]> => {
  try {
      const prompt = `Generate 8 High-Yield Study Notes/Formulas for ${exam}. Subject: ${subject || 'Key Concepts'}. Include English & Hindi. Format: Title, Content. Output JSON array.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    headline: { type: Type.STRING },
                    headline_hi: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    summary_hi: { type: Type.STRING },
                    category: { type: Type.STRING },
                    date: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['headline', 'summary']
            }
          } as Schema
        }
      });

      const aiData = JSON.parse(cleanJson(response.text || "[]"));

      return aiData.map((n: any) => ({
          id: generateId('note'),
          headline: n.headline || n.title, 
          headlineHindi: n.headline_hi,
          summary: n.summary || n.content,
          summaryHindi: n.summary_hi,
          category: subject || 'Notes',
          date: 'Key Concept',
          tags: n.tags || []
      }));
  } catch (e) {
      return [];
  }
};

export const generateSingleQuestion = async (
  exam: string,
  subject: string,
  topic: string
): Promise<Partial<Question> | null> => {
  try {
      const prompt = `Generate 1 High-Quality MCQ for ${exam}. Subject: ${subject}, Topic: ${topic}. Ensure factual accuracy. Return JSON.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
          systemInstruction: "You are an expert tutor. Verify facts before generating.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                text_hi: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                explanation_hi: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['text', 'explanation']
          } as Schema
        }
      });

      const data = JSON.parse(cleanJson(response.text || "{}"));
      
      return {
          text: data.text,
          textHindi: data.text_hi,
          options: data.options,
          optionsHindi: data.options_hi,
          correctIndex: data.correctIndex,
          explanation: data.explanation,
          explanationHindi: data.explanation_hi,
          tags: data.tags
      };
  } catch (e) {
      return null;
  }
};

export const generateQuestionFromImage = async (
  base64Image: string,
  mimeType: string,
  examType: string,
  subject: string
): Promise<Partial<Question> | null> => {
  try {
      const prompt = `Analyze this image for ${examType} (${subject}). Extract the question, solve it step-by-step, and return JSON.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: base64Image } },
                { text: prompt }
            ]
        },
        config: {
          ...commonConfig,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                text_hi: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                explanation_hi: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['text', 'explanation']
          } as Schema
        }
      });

      const data = JSON.parse(cleanJson(response.text || "{}"));

      return {
          text: data.text,
          textHindi: data.text_hi,
          options: data.options,
          optionsHindi: data.options_hi,
          correctIndex: data.correctIndex,
          explanation: data.explanation,
          explanationHindi: data.explanation_hi,
          tags: data.tags
      };
  } catch (e) {
      return null;
  }
};

export const generateFullPaper = async (
  exam: string,
  subject: string,
  difficulty: string,
  seedData: string,
  config: any
): Promise<QuestionPaper | null> => {
  try {
      const prompt = `
        Generate a Mock Exam Paper for ${exam} (${subject}).
        Difficulty: ${difficulty}.
        Context: ${seedData || 'Standard Syllabus'}.
        Structure:
        - MCQs: ${config.includeMCQ ? (config.mcqCount || 10) : 0}
        - Short Answers: ${config.includeShort ? 5 : 0}
        - Long Answers: ${config.includeLong ? 3 : 0}
        Output a complex JSON object containing 'meta' and 'sections' array.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            ...commonConfig,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    duration: { type: Type.INTEGER },
                    totalMarks: { type: Type.INTEGER },
                    sections: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                type: { type: Type.STRING },
                                marksPerQuestion: { type: Type.INTEGER },
                                questions: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            text: { type: Type.STRING },
                                            text_hi: { type: Type.STRING },
                                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            answer: { type: Type.STRING },
                                            explanation: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } as Schema
        }
      });

      const data = JSON.parse(cleanJson(response.text || "{}"));

      // Map Backend Data to QuestionPaper Interface
      const sections = data.sections?.map((sec: any, sIdx: number) => ({
          id: `sec-${sIdx}`,
          title: sec.title || `Section ${sIdx+1}`,
          instructions: "Attempt all questions",
          marksPerQuestion: sec.marksPerQuestion || 1,
          questions: sec.questions?.map((q: any, qIdx: number) => ({
              id: generateId(`p-q-${sIdx}-${qIdx}`),
              text: q.text,
              textHindi: q.text_hi,
              options: q.options || [],
              correctIndex: q.options ? q.options.findIndex((o: string) => o === q.answer) : -1,
              answer: q.answer,
              explanation: q.explanation,
              type: q.options ? QuestionType.MCQ : QuestionType.SHORT_ANSWER,
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
  } catch (e) {
      console.error(e);
      return null;
  }
};
