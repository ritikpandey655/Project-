
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";

// Initialize the client with the environment variable.
const apiKey = process.env.API_KEY;

// Helper to warn in production if key is missing
if (typeof window !== 'undefined' && !apiKey) {
  console.error("⚠️ API_KEY is missing! The app cannot contact Gemini.");
}

const cleanJson = (text: string) => {
  // First, try to match a JSON block
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
      return match[0];
  }
  // Fallback cleanup
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// Helper for unique IDs - Added random suffix to strictly prevent collisions
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  if (!apiKey || apiKey.trim() === '') {
    console.warn("No API Key found, using mock data.");
    return MOCK_QUESTIONS_FALLBACK.map(q => ({
      ...q, 
      id: generateId('mock'),
      type: QuestionType.MCQ
    })) as unknown as Question[];
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Act as an expert exam setter for the Indian Competitive Exam: "${exam}".
    Subject: "${subject}".
    Difficulty Level: "${difficulty}".
    ${topics.length > 0 ? `CRITICAL: STRICTLY generate questions ONLY related to these specific topics: "${topics.join(', ')}".` : ''}
    
    TASK: Generate ${count} high-quality multiple-choice questions.
    REQUIREMENT: Provide content in BOTH English and Hindi (Devanagari script).
    IMPORTANT: Return raw JSON only. Do not use Markdown formatting.
    
    Output a JSON array of objects with keys: 
    text (English), text_hi (Hindi), 
    options (English Array), options_hi (Hindi Array), 
    correctIndex, 
    explanation (English), explanation_hi (Hindi), 
    tags.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
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
            required: ['text', 'options', 'correctIndex', 'explanation']
          }
        }
      }
    });

    let jsonStr = response.text || "[]";
    
    jsonStr = cleanJson(jsonStr);
    const rawQuestions = JSON.parse(jsonStr);
    
    return rawQuestions.map((q: any, index: number) => ({
      id: generateId(`ai-q${index}`),
      text: q.text,
      textHindi: q.text_hi,
      options: q.options,
      optionsHindi: q.options_hi,
      correctIndex: q.correctIndex,
      explanation: q.explanation, 
      explanationHindi: q.explanation_hi,
      source: QuestionSource.PYQ_AI,
      examType: exam as ExamType,
      subject: subject,
      createdAt: Date.now(),
      tags: q.tags || [],
      type: QuestionType.MCQ
    }));

  } catch (error) {
    console.error("Gemini generation failed:", error);
    return MOCK_QUESTIONS_FALLBACK.map(q => ({
      ...q, 
      id: generateId('fallback'),
      type: QuestionType.MCQ
    })) as unknown as Question[];
  }
};

export const generateCurrentAffairs = async (
  exam: string,
  count: number = 10
): Promise<Question[]> => {
  if (!apiKey || apiKey.trim() === '') return [];

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Act as an expert exam setter for ${exam}.
    TASK: Generate ${count} Current Affairs MCQs based on events from the LAST 6-12 MONTHS.
    Focus on: National/International News, Awards, Sports, Science, Govt Schemes relevant to ${exam}.
    REQUIREMENT: Provide content in BOTH English and Hindi.
    IMPORTANT: Return raw JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
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
            required: ['text', 'options', 'correctIndex', 'explanation']
          }
        }
      }
    });

    const jsonStr = cleanJson(response.text || "[]");
    const rawQuestions = JSON.parse(jsonStr);
    
    return rawQuestions.map((q: any, index: number) => ({
      id: generateId(`ca-q${index}`),
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
  } catch (error) {
    console.error("Current Affairs generation failed:", error);
    return [];
  }
};

export const generateSingleQuestion = async (
  exam: string,
  subject: string,
  topic: string
): Promise<Partial<Question> | null> => {
  if (!apiKey || apiKey.trim() === '') return null;
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate 1 high-quality multiple-choice question for ${exam}, Subject: ${subject}, Topic: ${topic}. Provide English and Hindi. Output JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
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
          required: ['text', 'options', 'correctIndex', 'explanation']
        }
      }
    });

    const jsonStr = cleanJson(response.text || "{}");
    const q = JSON.parse(jsonStr);
    
    // Normalize keys
    return {
        text: q.text,
        textHindi: q.text_hi,
        options: q.options,
        optionsHindi: q.options_hi,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        explanationHindi: q.explanation_hi,
        tags: q.tags
    };

  } catch (error) {
    console.error("Single question generation failed:", error);
    return null;
  }
};

export const generateFullPaper = async (
  exam: string,
  subject: string,
  difficulty: string,
  seedData: string,
  config: {
    includeMCQ: boolean;
    includeShort: boolean;
    includeLong: boolean;
    includeViva: boolean;
    mcqCount?: number;
  }
): Promise<QuestionPaper | null> => {
  if (!apiKey || apiKey.trim() === '') {
    alert("API Key is missing in production.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  const nonMcqStructure = [];
  if (config.includeShort) nonMcqStructure.push({type:"ShortAnswer", count: 5, marks: 3});
  if (config.includeLong) nonMcqStructure.push({type:"LongAnswer", count: 3, marks: 10});
  if (config.includeViva) nonMcqStructure.push({type:"Viva", count: 5, marks: 2});

  const mcqTotal = config.includeMCQ ? (config.mcqCount || 10) : 0;
  const BATCH_SIZE = 30;
  const mcqBatches = Math.ceil(mcqTotal / BATCH_SIZE);

  const initialPrompt = `
    Create structure for a mock exam paper:
    Exam: ${exam}
    Subject: ${subject}
    Non-MCQ Structure: ${JSON.stringify(nonMcqStructure)}
    Difficulty: ${difficulty}
    Seed Data: ${seedData}
    
    REQUIREMENT: Provide questions in English and Hindi (Devanagari).
    IMPORTANT: Return raw JSON only.

    OUTPUT JSON with keys: meta (exam, subject, total_marks, time_mins), non_mcq_questions array.
  `;

  try {
    const skeletonResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: initialPrompt,
      config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                meta: {
                    type: Type.OBJECT,
                    properties: {
                        exam: { type: Type.STRING },
                        subject: { type: Type.STRING },
                        total_marks: { type: Type.INTEGER },
                        time_mins: { type: Type.INTEGER }
                    }
                },
                non_mcq_questions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            q_no: { type: Type.INTEGER },
                            type: { type: Type.STRING },
                            q_text: { type: Type.STRING },
                            q_text_hi: { type: Type.STRING },
                            answer: { type: Type.STRING },
                            answer_hi: { type: Type.STRING },
                            marks: { type: Type.INTEGER }
                        }
                    }
                }
            }
          }
      }
    });

    const skeletonJson = cleanJson(skeletonResponse.text || "{}");
    const skeletonData = JSON.parse(skeletonJson);

    let allMcqs: any[] = [];
    if (mcqTotal > 0) {
      const batchPromises = [];
      for (let i = 0; i < mcqBatches; i++) {
        const count = Math.min(BATCH_SIZE, mcqTotal - (i * BATCH_SIZE));
        const startNum = (i * BATCH_SIZE) + 1;
        
        const batchPrompt = `
           Generate ${count} unique MCQs for ${exam} (${subject}).
           Batch: ${i + 1}/${mcqBatches}.
           Context: ${seedData}.
           Start Q#: ${startNum}.
           REQUIREMENT: English and Hindi.
        `;

        batchPromises.push(
            ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: batchPrompt,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                q_text: { type: Type.STRING },
                                q_text_hi: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                                answer: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                explanation_hi: { type: Type.STRING }
                            },
                            required: ['q_text', 'options', 'answer', 'explanation']
                        }
                    }
                }
            }).then(res => {
                const txt = cleanJson(res.text || "[]");
                return JSON.parse(txt);
            }).catch(err => {
                console.error(`Batch ${i} failed`, err);
                return [];
            })
        );
      }

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(batch => allMcqs = [...allMcqs, ...batch]);
    }

    const sectionsMap: Record<string, any> = {};

    if (allMcqs.length > 0) {
        sectionsMap['MCQ'] = {
            id: 'sec-mcq',
            title: 'Section A: Multiple Choice',
            questions: allMcqs.map((q: any, idx: number) => ({
                id: generateId(`q-mcq-${idx}`),
                text: q.q_text,
                textHindi: q.q_text_hi,
                options: q.options || [],
                optionsHindi: q.options_hi || [],
                correctIndex: q.options ? q.options.findIndex((o: string) => o === q.answer || o.startsWith(q.answer)) : -1,
                answer: q.answer,
                explanation: q.explanation,
                explanationHindi: q.explanation_hi,
                type: QuestionType.MCQ,
                examType: exam as ExamType,
                source: QuestionSource.PYQ_AI,
                createdAt: Date.now(),
                marks: 1
            })).filter(q => q.correctIndex !== -1),
            marksPerQuestion: 1
        };
    }

    if (skeletonData.non_mcq_questions && Array.isArray(skeletonData.non_mcq_questions)) {
        skeletonData.non_mcq_questions.forEach((q: any, idx: number) => {
            if (!sectionsMap[q.type]) {
                sectionsMap[q.type] = {
                    id: `sec-${q.type}`,
                    title: q.type === 'ShortAnswer' ? 'Section B: Short Answers' : 'Section C: Non-MCQ',
                    questions: [],
                    marksPerQuestion: q.marks
                };
            }
            sectionsMap[q.type].questions.push({
                id: generateId(`q-${q.type}-${idx}`),
                text: q.q_text,
                textHindi: q.q_text_hi,
                options: [],
                correctIndex: -1,
                answer: q.answer,
                answerHindi: q.answer_hi,
                type: q.type === 'ShortAnswer' ? QuestionType.SHORT_ANSWER : 
                      q.type === 'LongAnswer' ? QuestionType.LONG_ANSWER : QuestionType.VIVA,
                examType: exam as ExamType,
                source: QuestionSource.PYQ_AI,
                createdAt: Date.now(),
                marks: q.marks
            });
        });
    }

    const sections = Object.values(sectionsMap);
    const totalMarks = sections.reduce((sum, sec) => sum + (sec.questions.length * sec.marksPerQuestion), 0);
    const totalTime = (allMcqs.length * 1) + 
                      (sectionsMap['ShortAnswer']?.questions.length || 0) * 5 + 
                      (sectionsMap['LongAnswer']?.questions.length || 0) * 15;

    const paper: QuestionPaper = {
      id: generateId('paper'),
      title: `${exam} Mock Paper (${subject})`,
      examType: exam as ExamType,
      subject: subject,
      difficulty: difficulty,
      totalMarks: totalMarks || 100,
      durationMinutes: totalTime || 60,
      createdAt: Date.now(),
      sections: sections
    };

    return paper;

  } catch (error) {
    console.error("Full paper generation failed:", error);
    return null;
  }
};

export const generateQuestionFromImage = async (
  base64Image: string,
  mimeType: string,
  examType: string,
  subject: string
): Promise<Partial<Question> | null> => {
  if (!apiKey || apiKey.trim() === '') return null;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
            { inlineData: { mimeType: mimeType, data: base64Image } },
            { text: `Extract question from image for ${examType} (${subject}). Include Hindi translation if possible.` }
        ]
      },
      config: { 
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
            required: ['text', 'options', 'correctIndex', 'explanation']
          }
      }
    });

    const jsonStr = cleanJson(response.text || "{}");
    const q = JSON.parse(jsonStr);
    
    return {
        text: q.text,
        textHindi: q.text_hi,
        options: q.options,
        optionsHindi: q.options_hi,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        explanationHindi: q.explanation_hi,
        tags: q.tags
    };

  } catch (error) {
    console.error("Image analysis failed:", error);
    return null;
  }
};
