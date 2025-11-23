import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";

// Initialize the client with the environment variable.
// Vite replaces 'process.env.API_KEY' with the actual string during build.
const apiKey = process.env.API_KEY;

// Helper to warn in production if key is missing (debugging Vercel issues)
if (typeof window !== 'undefined' && !apiKey) {
  console.error("⚠️ API_KEY is missing! The app cannot contact Gemini. Please check your Vercel Environment Variables.");
}

const cleanJson = (text: string) => {
  // Use Regex to find the first JSON object or array
  // This handles markdown wrappers (```json ... ```) and conversational intros
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
      return match[0];
  }
  // Fallback cleanup
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  // strict check for key existence
  if (!apiKey || apiKey.trim() === '') {
    console.warn("No API Key found, using mock data.");
    return MOCK_QUESTIONS_FALLBACK.map(q => ({
      ...q, 
      id: `mock-${Math.random()}`,
      type: QuestionType.MCQ // Explicitly add type to mock data
    })) as unknown as Question[];
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Act as an expert exam setter for the Indian Competitive Exam: "${exam}".
    Subject: "${subject}".
    Difficulty Level: "${difficulty}".
    ${topics.length > 0 ? `CRITICAL: STRICTLY generate questions ONLY related to these specific topics: "${topics.join(', ')}".` : ''}
    
    TASK: Generate ${count} high-quality multiple-choice questions.
    
    Output a JSON array of objects with keys: text, options, correctIndex, explanation, tags.
  `;

  try {
    // Use gemini-flash-lite-latest for speed
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
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['text', 'options', 'correctIndex', 'explanation']
          }
        }
      }
    });

    let jsonStr = response.text;
    if (!jsonStr) return [];
    
    jsonStr = cleanJson(jsonStr);

    const rawQuestions = JSON.parse(jsonStr);
    
    return rawQuestions.map((q: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation, 
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
      id: `fallback-${Math.random()}`,
      type: QuestionType.MCQ
    })) as unknown as Question[];
  }
};

export const generateSingleQuestion = async (
  exam: string,
  subject: string,
  topic: string
): Promise<Partial<Question> | null> => {
  if (!apiKey || apiKey.trim() === '') return null;
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate 1 high-quality multiple-choice question for the exam: "${exam}".
    Subject: "${subject}".
    Topic/Keyword: "${topic}".
    Output JSON.
  `;

  try {
    // Use gemini-flash-lite-latest for low latency
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['text', 'options', 'correctIndex', 'explanation']
        }
      }
    });

    let jsonStr = response.text;
    if (!jsonStr) return null;
    jsonStr = cleanJson(jsonStr);

    return JSON.parse(jsonStr);

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
    alert("API Key is missing in production. Please configure Vercel env vars.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Construct the structure for Non-MCQ sections
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

    OUTPUT JSON with keys: meta (exam, subject, total_marks, time_mins), non_mcq_questions array.
  `;

  try {
    // Step A: Generate Skeleton (Meta + Non-MCQs)
    // Using 2.5-flash for structure intelligence
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
                            answer: { type: Type.STRING },
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

    // Step B: Generate MCQs in Batches (Parallel) using Flash Lite
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
        `;

        batchPromises.push(
            ai.models.generateContent({
                model: 'gemini-flash-lite-latest', // Faster & cheaper for batches
                contents: batchPrompt,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                q_text: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                answer: { type: Type.STRING },
                                explanation: { type: Type.STRING }
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

    // Step C: Merge
    const sectionsMap: Record<string, any> = {};

    if (allMcqs.length > 0) {
        sectionsMap['MCQ'] = {
            id: 'sec-mcq',
            title: 'Section A: Multiple Choice',
            questions: allMcqs.map((q: any, idx: number) => ({
                id: `q-mcq-${idx}`,
                text: q.q_text,
                options: q.options || [],
                correctIndex: q.options ? q.options.findIndex((o: string) => o === q.answer || o.startsWith(q.answer)) : -1,
                answer: q.answer,
                explanation: q.explanation,
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
        skeletonData.non_mcq_questions.forEach((q: any) => {
            if (!sectionsMap[q.type]) {
                sectionsMap[q.type] = {
                    id: `sec-${q.type}`,
                    title: q.type === 'ShortAnswer' ? 'Section B: Short Answers' : 'Section C: Non-MCQ',
                    questions: [],
                    marksPerQuestion: q.marks
                };
            }
            sectionsMap[q.type].questions.push({
                id: `q-${q.q_no}`,
                text: q.q_text,
                options: [],
                correctIndex: -1,
                answer: q.answer,
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
    // Recalculate totals
    const totalMarks = sections.reduce((sum, sec) => sum + (sec.questions.length * sec.marksPerQuestion), 0);
    const totalTime = (allMcqs.length * 1) + 
                      (sectionsMap['ShortAnswer']?.questions.length || 0) * 5 + 
                      (sectionsMap['LongAnswer']?.questions.length || 0) * 15;

    const paper: QuestionPaper = {
      id: `paper-${Date.now()}`,
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
            { text: `Extract question from image for ${examType} (${subject}).` }
        ]
      },
      config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['text', 'options', 'correctIndex', 'explanation']
          }
      }
    });

    let jsonStr = response.text;
    if (!jsonStr) return null;
    jsonStr = cleanJson(jsonStr);
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Image analysis failed:", error);
    return null;
  }
};