
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
  // Remove Markdown code blocks
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Determine if it's an array or object based on which opening brace comes first
  const firstSquare = clean.indexOf('[');
  const firstCurly = clean.indexOf('{');

  let startIndex = -1;
  let endIndex = -1;

  // Check which one is first (and exists)
  if (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
    // It's likely an array
    startIndex = firstSquare;
    endIndex = clean.lastIndexOf(']');
  } else if (firstCurly !== -1) {
    // It's likely an object
    startIndex = firstCurly;
    endIndex = clean.lastIndexOf('}');
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    clean = clean.substring(startIndex, endIndex + 1);
  }
  
  return clean;
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
    ${topics.length > 0 ? `CRITICAL: STRICTLY generate questions ONLY related to these specific topics: "${topics.join(', ')}". Do not include general "${subject}" questions outside these topics.` : ''}
    
    TASK: Generate ${count} high-quality multiple-choice questions.
    
    CRITICAL REQUIREMENTS:
    1. CONTEXT: The questions must be specifically tailored for "${exam}".
    2. SOURCE: Prioritize ACTUAL Previous Year Questions (PYQs) or pattern mimics.
    3. FORMAT: Each question must have 4 options, one correct answer, and a concise explanation.
    
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
              text: { type: Type.STRING, description: "The question text" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctIndex: { type: Type.INTEGER, description: "Zero-based index of the correct option (0-3)" },
              explanation: { type: Type.STRING, description: "Concise reasoning" },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['text', 'options', 'correctIndex', 'explanation']
          }
        }
      }
    });

    let jsonStr = response.text;
    if (!jsonStr) return [];
    
    // Clean markdown if present
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

  // 1. Construct the structure for Non-MCQ sections (generated in one go)
  const nonMcqStructure = [];
  if (config.includeShort) nonMcqStructure.push({type:"ShortAnswer", count: 5, marks: 3, difficulty: difficulty.toLowerCase()});
  if (config.includeLong) nonMcqStructure.push({type:"LongAnswer", count: 3, marks: 10, difficulty: difficulty.toLowerCase()});
  if (config.includeViva) nonMcqStructure.push({type:"Viva", count: 5, marks: 2, difficulty: difficulty.toLowerCase()});

  // 2. Handle MCQ Batching (To allow 180 questions without token limit)
  const mcqTotal = config.includeMCQ ? (config.mcqCount || 10) : 0;
  const BATCH_SIZE = 30; // Max questions per API call to stay within output limits
  const mcqBatches = Math.ceil(mcqTotal / BATCH_SIZE);

  // Initial prompt only handles the 'Meta' and Non-MCQ structure to keep it light
  // We will inject MCQs later
  const initialPrompt = `
    Create the structure for a mock exam paper for:
    Exam: ${exam}
    Subject: ${subject}
    Non-MCQ Structure: ${JSON.stringify(nonMcqStructure)}
    Difficulty: ${difficulty}
    Seed Data: ${seedData}

    OUTPUT JSON Schema:
    {
      "meta": { "exam": string, "subject": string, "total_marks": number, "time_mins": number },
      "non_mcq_questions": [
         { "q_no": number, "type": "ShortAnswer"|"LongAnswer"|"Viva", "q_text": string, "answer": string, "marks": number }
      ]
    }
    If no Non-MCQ structure is provided, return empty array for "non_mcq_questions".
  `;

  try {
    // Step A: Generate Skeleton (Meta + Non-MCQs)
    const skeletonResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: initialPrompt,
      config: { responseMimeType: "application/json" }
    });

    const skeletonJson = cleanJson(skeletonResponse.text || "{}");
    const skeletonData = JSON.parse(skeletonJson);

    // Step B: Generate MCQs in Batches (Parallel)
    let allMcqs: any[] = [];
    if (mcqTotal > 0) {
      const batchPromises = [];
      for (let i = 0; i < mcqBatches; i++) {
        const count = Math.min(BATCH_SIZE, mcqTotal - (i * BATCH_SIZE));
        const startNum = (i * BATCH_SIZE) + 1;
        
        const batchPrompt = `
           Generate ${count} unique Multiple Choice Questions (MCQs) for ${exam} (${subject}).
           Batch: ${i + 1}/${mcqBatches}.
           Difficulty: ${difficulty}.
           Context: ${seedData || "Standard Syllabus"}.
           Starting Question Number: ${startNum}.
           
           STRICT JSON Output: Array of objects: 
           [{ "q_no": number, "q_text": string, "options": string[], "answer": string (Option text), "explanation": string, "marks": 1 }]
        `;

        batchPromises.push(
            ai.models.generateContent({
                model: 'gemini-2.5-flash', // Use Flash for batching efficiency
                contents: batchPrompt,
                config: { responseMimeType: "application/json" }
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

    // Step C: Merge Everything into QuestionPaper model
    const sectionsMap: Record<string, any> = {};

    // 1. Process MCQs
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
            })).filter(q => q.correctIndex !== -1), // Filter out malformed
            marksPerQuestion: 1
        };
    }

    // 2. Process Non-MCQs
    if (skeletonData.non_mcq_questions && Array.isArray(skeletonData.non_mcq_questions)) {
        skeletonData.non_mcq_questions.forEach((q: any) => {
            if (!sectionsMap[q.type]) {
                sectionsMap[q.type] = {
                    id: `sec-${q.type}`,
                    title: q.type === 'ShortAnswer' ? 'Section B: Short Answers' : 
                           q.type === 'LongAnswer' ? 'Section C: Detailed' : 'Section D: Viva',
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

    // Recalculate totals based on actual generation
    const sections = Object.values(sectionsMap);
    const totalMarks = sections.reduce((sum, sec) => sum + (sec.questions.length * sec.marksPerQuestion), 0);
    // Estimate duration: 1 min per MCQ, 5 min per Short, 10 min per Long
    const totalTime = (allMcqs.length * 1) + 
                      (sectionsMap['ShortAnswer']?.questions.length || 0) * 5 + 
                      (sectionsMap['LongAnswer']?.questions.length || 0) * 15;

    const paper: QuestionPaper = {
      id: `paper-${Date.now()}`,
      title: `${exam} Mock Paper (${subject})`,
      examType: exam as ExamType,
      subject: subject,
      difficulty: difficulty,
      totalMarks: totalMarks || skeletonData.meta?.total_marks || 100,
      durationMinutes: totalTime || skeletonData.meta?.time_mins || 60,
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
      model: 'gemini-2.5-flash', // Use Flash for standard image tasks
      contents: {
        parts: [
            { inlineData: { mimeType: mimeType, data: base64Image } },
            { text: `Extract question from image for ${examType} (${subject}). Output JSON: {text, options[], correctIndex, explanation, tags[]}` }
        ]
      },
      config: { responseMimeType: "application/json" }
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
