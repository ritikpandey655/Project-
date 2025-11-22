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
      // Use gemini-2.5-flash-latest with Google Search tool
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

  const prompt = `
    Act as an Exam Controller. Create a comprehensive practice paper for:
    Exam: ${exam}
    Subject: ${subject}
    Difficulty: ${difficulty}
    ${seedData ? `Seed Content/Topics (Focus on these): ${seedData}` : ''}

    Structure Requirements:
    ${config.includeMCQ ? '- Section A: 5 Multiple Choice Questions (MCQ). Provide options and correct index.' : ''}
    ${config.includeShort ? '- Section B: 3 Short Answer Questions. Provide a concise model answer.' : ''}
    ${config.includeLong ? '- Section C: 2 Long Answer/Descriptive Questions. Provide a detailed model answer/key points.' : ''}
    ${config.includeViva ? '- Section D: 3 Viva/Oral Questions. Provide expected answers.' : ''}

    Output must be a valid JSON object representing the paper structure with a marking scheme.
  `;

  try {
    // Use gemini-3-pro-preview with Thinking Mode for complex task
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Paper Title, e.g. 'UPSC History Mock 1'" },
            totalMarks: { type: Type.INTEGER },
            durationMinutes: { type: Type.INTEGER },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "e.g. 'Section A: MCQs'" },
                  instructions: { type: Type.STRING },
                  marksPerQuestion: { type: Type.INTEGER },
                  questionType: { type: Type.STRING, enum: [QuestionType.MCQ, QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER, QuestionType.VIVA] },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.INTEGER },
                        answer: { type: Type.STRING, description: "Model answer for non-MCQ questions or explanation for MCQ" }
                      },
                      required: ['text']
                    }
                  }
                },
                required: ['title', 'questions', 'marksPerQuestion']
              }
            }
          },
          required: ['title', 'totalMarks', 'sections']
        }
      }
    });

    let jsonStr = response.text;
    if (!jsonStr) return null;
    
    // Thinking models can sometimes output markdown blocks even with JSON schema
    jsonStr = cleanJson(jsonStr);

    const rawPaper = JSON.parse(jsonStr);

    // Hydrate with local IDs and types
    const paper: QuestionPaper = {
      id: `paper-${Date.now()}`,
      title: rawPaper.title,
      examType: exam as ExamType,
      subject: subject,
      difficulty: difficulty,
      totalMarks: rawPaper.totalMarks,
      durationMinutes: rawPaper.durationMinutes || 60,
      createdAt: Date.now(),
      sections: rawPaper.sections.map((sec: any, sIdx: number) => ({
        id: `sec-${sIdx}`,
        title: sec.title,
        instructions: sec.instructions || '',
        marksPerQuestion: sec.marksPerQuestion,
        questions: sec.questions.map((q: any, qIdx: number) => ({
          id: `q-${sIdx}-${qIdx}`,
          text: q.text,
          options: q.options || [],
          correctIndex: q.correctIndex ?? -1,
          explanation: q.answer, // Map model answer to explanation field for compatibility
          answer: q.answer,
          type: sec.questionType as QuestionType || QuestionType.SHORT_ANSWER,
          examType: exam as ExamType,
          source: QuestionSource.PYQ_AI,
          createdAt: Date.now(),
          marks: sec.marksPerQuestion
        }))
      }))
    };

    return paper;

  } catch (error) {
    console.error("Full paper generation failed (retrying with Flash):", error);
    // Fallback to Flash if Pro/Thinking fails
    try {
        const fallbackAi = new GoogleGenAI({ apiKey });
        const response = await fallbackAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        let jsonStr = cleanJson(response.text || '');
        if (!jsonStr) return null;
        const rawPaper = JSON.parse(jsonStr);
        
        // Same hydration logic...
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
                instructions: sec.instructions || '',
                marksPerQuestion: sec.marksPerQuestion || 1,
                questions: (sec.questions || []).map((q: any, qIdx: number) => ({
                    id: `q-${sIdx}-${qIdx}`,
                    text: q.text,
                    options: q.options || [],
                    correctIndex: q.correctIndex ?? -1,
                    explanation: q.answer,
                    answer: q.answer,
                    type: sec.questionType || QuestionType.SHORT_ANSWER,
                    examType: exam as ExamType,
                    source: QuestionSource.PYQ_AI,
                    createdAt: Date.now(),
                    marks: sec.marksPerQuestion || 1
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