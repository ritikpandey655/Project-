import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";

// Initialize the client with the environment variable.
// Vite replaces 'process.env.API_KEY' with the actual string during build.
const apiKey = process.env.API_KEY;

const cleanJson = (text: string) => {
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
    return MOCK_QUESTIONS_FALLBACK.map(q => ({...q, id: `mock-${Math.random()}`})) as unknown as Question[];
  }

  const ai = new GoogleGenAI({ apiKey });

  // Use Search Grounding for Current Affairs or dynamic topics
  const useSearch = subject.toLowerCase().includes('current affairs') || 
                    topics.some(t => t.toLowerCase().includes('news') || t.toLowerCase().includes('latest'));

  const prompt = `
    Act as an expert exam setter for the Indian Competitive Exam: "${exam}".
    Subject: "${subject}".
    Difficulty Level: "${difficulty}".
    ${topics.length > 0 ? `CRITICAL: STRICTLY generate questions ONLY related to these specific topics: "${topics.join(', ')}". Do not include general "${subject}" questions outside these topics.` : ''}
    
    TASK: Generate ${count} high-quality multiple-choice questions.
    
    CRITICAL REQUIREMENTS:
    1. CONTEXT: The questions must be specifically tailored for "${exam}". For example, if the exam is UPSC, focus on analytical depth. If SSC CGL, focus on factual accuracy.
    2. SOURCE: Prioritize ACTUAL Previous Year Questions (PYQs) or questions that strictly mimic the pattern of ${exam} papers (2018-2024).
    3. FORMAT: Each question must have 4 options, one correct answer, and a detailed explanation.
    ${useSearch ? '4. INFO: Use the Google Search tool to get the most up-to-date information.' : ''}
    
    Output a JSON array of objects with keys: text, options, correctIndex, explanation, tags.
  `;

  try {
    let response;
    if (useSearch) {
      // Use gemini-2.5-flash with Google Search tool
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
          // Response Schema is often not compatible with tools in raw mode, so we parse text
        }
      });
    } else {
      // Use standard generation
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
                explanation: { type: Type.STRING, description: "Detailed reasoning" },
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
    }

    let jsonStr = response.text;
    if (!jsonStr) return [];
    
    // Clean markdown if present
    jsonStr = cleanJson(jsonStr);

    const rawQuestions = JSON.parse(jsonStr);
    
    // Append search sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let sourcesText = "";
    if (groundingChunks) {
        const urls = groundingChunks
            .map((c: any) => c.web?.uri)
            .filter((uri: string) => uri)
            .join(', ');
        if (urls) sourcesText = `\n\nSources: ${urls}`;
    }

    return rawQuestions.map((q: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation + (index === 0 ? sourcesText : ""), // Append sources to first question or spread them out
      source: QuestionSource.PYQ_AI,
      examType: exam as ExamType,
      subject: subject,
      createdAt: Date.now(),
      tags: q.tags || [],
      type: QuestionType.MCQ
    }));

  } catch (error) {
    console.error("Gemini generation failed:", error);
    return MOCK_QUESTIONS_FALLBACK.map(q => ({...q, id: `fallback-${Math.random()}`})) as unknown as Question[];
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
    
    The question should be specifically designed for "${exam}" candidates.
    Include a clear question, 4 plausible options, the correct answer, and a helpful explanation.
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
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
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
  }
): Promise<QuestionPaper | null> => {
  if (!apiKey || apiKey.trim() === '') return null;

  const ai = new GoogleGenAI({ apiKey });

  // Construct paper structure for the prompt
  const paperStructure = [];
  if (config.includeMCQ) paperStructure.push({type:"MCQ", count: 10, marks: 1, difficulty: "mixed"});
  if (config.includeShort) paperStructure.push({type:"ShortAnswer", count: 5, marks: 3, difficulty: difficulty.toLowerCase()});
  if (config.includeLong) paperStructure.push({type:"LongAnswer", count: 3, marks: 10, difficulty: difficulty.toLowerCase()});
  if (config.includeViva) paperStructure.push({type:"Viva", count: 5, marks: 2, difficulty: difficulty.toLowerCase()});

  const totalMarks = paperStructure.reduce((acc, curr) => acc + (curr.count * curr.marks), 0);
  const timeLimit = Math.min(180, Math.max(30, totalMarks * 1.5)); // Approx 1.5 mins per mark

  const prompt = `
    SYSTEM: Aap ek experienced exam paper setter hain for Indian competitive exam style. Har question bilkul exam-suitable, balanced difficulty aur marking scheme ke saath banaiye. Avoid verbatim copying of public PYQs; ensure originality.

    USER:
    Exam: ${exam}
    Subject/Section: ${subject}
    Audience: Aspirants of ${exam}
    Paper settings:
    - Total marks: ${totalMarks}
    - Time limit (mins): ${timeLimit}
    - Structure: ${JSON.stringify(paperStructure)}
    - Difficulty: ${difficulty}
    - Seed Data/Constraints: ${seedData || "None"}

    Output requirements (strict):
    1. Return a valid JSON object with the exact keys below.
    2. For MCQs: exactly ONE correct option; generate 3 plausible distractors.
    3. For each long/short Q include concise model answer and marking rubric.
    4. Language: English (or Hindi if specified in seed data).

    Output JSON Schema:
    {
      "meta": {"exam":"String","subject":"String","total_marks":Number,"time_mins":Number},
      "paper": [
        { 
          "q_no": Number, 
          "type": "MCQ" | "ShortAnswer" | "LongAnswer" | "Viva", 
          "q_text": "String", 
          "options": ["String"] (Only for MCQ), 
          "answer": "String" (Option letter for MCQ, Model Answer for others), 
          "marks": Number, 
          "difficulty": "String", 
          "explanation": "String" (Reasoning or Rubric)
        }
      ]
    }
    Return only the JSON.
  `;

  try {
    // Use gemini-3-pro-preview with Thinking Mode for complex task
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        // Defining schema explicitly helps structure stability
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                meta: { 
                    type: Type.OBJECT, 
                    properties: { 
                        exam: {type: Type.STRING},
                        subject: {type: Type.STRING},
                        total_marks: {type: Type.INTEGER},
                        time_mins: {type: Type.INTEGER}
                    }
                },
                paper: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            q_no: {type: Type.INTEGER},
                            type: {type: Type.STRING},
                            q_text: {type: Type.STRING},
                            options: {type: Type.ARRAY, items: {type: Type.STRING}},
                            answer: {type: Type.STRING},
                            marks: {type: Type.INTEGER},
                            difficulty: {type: Type.STRING},
                            explanation: {type: Type.STRING}
                        },
                        required: ['q_no', 'type', 'q_text', 'answer', 'marks']
                    }
                }
            },
            required: ['meta', 'paper']
        }
      }
    });

    let jsonStr = response.text;
    if (!jsonStr) return null;
    
    jsonStr = cleanJson(jsonStr);
    const rawData = JSON.parse(jsonStr);

    // Transform flat paper array into Sections for App Data Model
    const sectionsMap: Record<string, any> = {};
    
    rawData.paper.forEach((q: any) => {
        const type = q.type;
        if (!sectionsMap[type]) {
            sectionsMap[type] = {
                id: `sec-${type}`,
                title: type === 'MCQ' ? 'Section A: Multiple Choice' : 
                       type === 'ShortAnswer' ? 'Section B: Short Answers' : 
                       type === 'LongAnswer' ? 'Section C: Detailed Questions' : 'Section D: Viva / Oral',
                questions: [],
                marksPerQuestion: q.marks
            };
        }
        
        // Normalize data for Question interface
        sectionsMap[type].questions.push({
            id: `q-${q.q_no}`,
            text: q.q_text,
            options: q.options || [],
            correctIndex: q.type === 'MCQ' && q.options ? q.options.findIndex((o: string) => o.startsWith(q.answer) || q.answer.includes(o)) : -1,
            // If index calc failed but we have an answer letter (e.g. 'B'), map it
            answer: q.answer, 
            explanation: q.explanation,
            type: q.type === 'MCQ' ? QuestionType.MCQ : 
                  q.type === 'ShortAnswer' ? QuestionType.SHORT_ANSWER :
                  q.type === 'LongAnswer' ? QuestionType.LONG_ANSWER : QuestionType.VIVA,
            examType: exam as ExamType,
            source: QuestionSource.PYQ_AI,
            createdAt: Date.now(),
            marks: q.marks
        });
    });

    // Fix correctIndex for MCQs if strictly letters were returned
    Object.values(sectionsMap).forEach((sec: any) => {
        sec.questions.forEach((q: any) => {
             if (q.type === QuestionType.MCQ && q.correctIndex === -1 && typeof q.answer === 'string') {
                 // Try to map 'A', 'B', 'C', 'D' to 0, 1, 2, 3
                 const charCode = q.answer.trim().toUpperCase().charCodeAt(0);
                 if (charCode >= 65 && charCode <= 68) {
                     q.correctIndex = charCode - 65;
                 }
             }
        });
    });

    const paper: QuestionPaper = {
      id: `paper-${Date.now()}`,
      title: `${exam} Mock Paper (${subject})`,
      examType: exam as ExamType,
      subject: subject,
      difficulty: difficulty,
      totalMarks: rawData.meta.total_marks || totalMarks,
      durationMinutes: rawData.meta.time_mins || timeLimit,
      createdAt: Date.now(),
      sections: Object.values(sectionsMap)
    };

    return paper;

  } catch (error) {
    console.error("Full paper generation failed (Gemini Pro):", error);
    
    // Fallback to Flash model with simpler prompt if Pro fails
    try {
        console.log("Retrying with Gemini Flash...");
        const fallbackAi = new GoogleGenAI({ apiKey });
        const simplePrompt = `Create a ${exam} exam paper for ${subject}. Return JSON with title, totalMarks, durationMinutes, and sections (title, questions array). Questions must have text, options (for MCQ), answer, marks.`;
        
        const response = await fallbackAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: simplePrompt,
            config: { responseMimeType: "application/json" }
        });
        
        const rawPaper = JSON.parse(cleanJson(response.text || ''));
        // Basic Hydration for fallback
        return {
            id: `paper-${Date.now()}`,
            title: rawPaper.title || `${exam} Practice Paper`,
            examType: exam as ExamType,
            subject: subject,
            difficulty: difficulty,
            totalMarks: rawPaper.totalMarks || 100,
            durationMinutes: rawPaper.durationMinutes || 60,
            createdAt: Date.now(),
            sections: (rawPaper.sections || []).map((sec: any, sIdx: number) => ({
                id: `sec-${sIdx}`,
                title: sec.title || 'Section',
                instructions: '',
                marksPerQuestion: 1,
                questions: (sec.questions || []).map((q: any, qIdx: number) => ({
                    id: `q-${sIdx}-${qIdx}`,
                    text: q.text,
                    options: q.options || [],
                    correctIndex: 0, // Fallback assumption
                    answer: q.answer || '',
                    type: QuestionType.MCQ,
                    examType: exam as ExamType,
                    source: QuestionSource.PYQ_AI,
                    createdAt: Date.now(),
                    marks: q.marks || 1
                }))
            }))
        };

    } catch (fallbackError) {
        console.error("Fallback generation failed:", fallbackError);
        return null;
    }
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
    // Use gemini-3-pro-preview for Image Understanding
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
            {
                inlineData: {
                    mimeType: mimeType, 
                    data: base64Image
                }
            },
            {
                text: `Analyze this image. It contains a question relevant to ${examType} (${subject}). 
                Extract the question text, options (if any), and provide the correct answer and explanation.
                If it's handwritten, transcribe it accurately.
                Output JSON with keys: text, options, correctIndex, explanation, tags.`
            }
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
            required: ['text', 'explanation']
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