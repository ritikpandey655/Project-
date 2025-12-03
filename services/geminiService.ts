
import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";

// Initialize Client-side Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helpers
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const cleanJson = (text: string) => {
  if (!text) return "[]";
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  let cleaned = match ? match[0] : text;
  cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
  return cleaned;
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
  
  // 2. Client-side Generation
  try {
      const prompt = `
          You are an expert examiner for ${exam}. 
          Generate ${remainingCount} HIGH-ACCURACY multiple-choice questions for subject: ${subject}.
          ${topics.length > 0 ? `Focus Topics: ${topics.join(', ')}` : 'Topics: Standard Syllabus Coverage'}
          STRICT RULES:
          1. QUESTIONS MUST BE SOLVABLE and Factual.
          2. OPTIONS: Must be distinct and unambiguous.
          3. EXPLANATION: Provide step-by-step verification.
          Output strictly JSON array.
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
                options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                explanation_hi: { type: Type.STRING },
                type: { type: Type.STRING },
                answer: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['text', 'options', 'correctIndex', 'explanation']
            }
          } as Schema
        }
      });

      const jsonStr = cleanJson(response.text || "[]");
      const aiData = JSON.parse(jsonStr);

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
      return [...officialQs, ...(MOCK_QUESTIONS_FALLBACK as unknown as Question[])];
  }
};

export const generatePYQList = async (
  exam: string,
  subject: string,
  year: number,
  topic?: string
): Promise<Question[]> => {
  // Hybrid Check
  const allOfficial = await getOfficialQuestions(exam, subject, 50);
  const officialPYQs = allOfficial.filter(q => q.pyqYear === year);
  if (officialPYQs.length >= 5) return officialPYQs;

  try {
      const prompt = `
          Simulate 15 high-yield questions based on the ${year} ${exam} exam pattern for ${subject}.
          ${topic ? `Focus Topic: ${topic}` : ''}
          STRICT ACCURACY RULES:
          1. If exact PYQ text is restricted, generate a 'Concept Twin'.
          2. Maintain the exact difficulty level of ${year}.
          3. Output strictly JSON array.
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
      const prompt = `Generate ${count - officialCA.length} High-Quality Current Affairs MCQs for ${exam}. Period: Recent. Output strictly JSON array.`;
      
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
                    options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    explanation_hi: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['text', 'options', 'correctIndex']
            }
          } as Schema
        }
      });

      const aiData = JSON.parse(cleanJson(response.text || "[]"));

      const aiQs = aiData.map((q: any) => ({
          id: generateId('ca-q'),
          text: q.text,
          textHindi: q.text_hi,
          options: q.options,
          optionsHindi: q.options_hi,
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
      return officialCA;
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
      const prompt = `Retrieve 8 REAL, VERIFIED Current Affairs events for ${exam} preparation. Period: ${month} ${year}. Category: ${category}. STRICTLY NO FAKE DATES. Output JSON array with headline, summary, date.`;
      
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

      const aiNews = aiData.map((n: any) => ({
          id: generateId('news'),
          headline: n.headline,
          headlineHindi: n.headline_hi,
          summary: n.summary,
          summaryHindi: n.summary_hi,
          category: n.category || category || 'General',
          date: n.date || `${month} ${year}`,
          tags: n.tags || []
      }));

      return [...officialNews, ...aiNews];
  } catch (e) {
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
