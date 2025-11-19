import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionSource } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";

// Initialize the client with the environment variable.
// Vite replaces 'process.env.API_KEY' with the actual string during build.
// We assign it directly so the replacement works. 
const apiKey = process.env.API_KEY;

// Check if key is actually present (after replacement) to prevent empty key errors
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  if (!apiKey) {
    console.warn("No API Key found, using mock data.");
    return MOCK_QUESTIONS_FALLBACK.map(q => ({...q, id: `mock-${Math.random()}`})) as unknown as Question[];
  }

  // Enhanced prompt to leverage "Internet" knowledge and "PYQ" focus
  const prompt = `
    Act as an expert exam setter for the Indian Competitive Exam: "${exam}".
    Subject: "${subject}".
    Difficulty Level: "${difficulty}".
    ${topics.length > 0 ? `CRITICAL: STRICTLY generate questions ONLY related to these specific topics: "${topics.join(', ')}". Do not include general "${subject}" questions outside these topics.` : ''}
    
    TASK: Generate ${count} multiple-choice questions.
    
    CRITICAL REQUIREMENTS:
    1. SOURCE: Prioritize ACTUAL Previous Year Questions (PYQs) that have appeared in ${exam} papers (2018-2024) found on the internet.
    2. PATTERN: If exact PYQs are not contextually fit, generate questions that strictly mimic the difficulty, style, and keywords of real ${exam} questions from top online resources.
    3. FORMAT: Each question must have 4 options, one correct answer, and a detailed explanation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text (e.g. 'Which article of the Constitution...')" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctIndex: { type: Type.INTEGER, description: "Zero-based index of the correct option (0-3)" },
              explanation: { type: Type.STRING, description: "Detailed reason why the answer is correct, citing rules or facts." },
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

    const jsonStr = response.text;
    if (!jsonStr) return [];

    const rawQuestions = JSON.parse(jsonStr);

    return rawQuestions.map((q: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      source: QuestionSource.PYQ_AI,
      examType: exam,
      subject: subject,
      createdAt: Date.now(),
      tags: q.tags || []
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
  if (!apiKey) return null;

  const prompt = `
    Generate 1 high-quality multiple-choice question for the exam: "${exam}".
    Subject: "${subject}".
    Topic/Keyword: "${topic}".
    
    The question should be based on real PYQ patterns found on the internet for this specific topic.
    Include a clear question, 4 plausible options, the correct answer, and a helpful explanation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

    const jsonStr = response.text;
    if (!jsonStr) return null;

    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Single question generation failed:", error);
    return null;
  }
};
