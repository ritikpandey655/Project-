import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionSource } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";

// Initialize the client with the environment variable
// Assuming process.env.API_KEY is injected by the runtime environment
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5
): Promise<Question[]> => {
  if (!apiKey) {
    console.warn("No API Key found, using mock data.");
    // Return simulated data derived from mocks, filtered slightly if possible, or just raw mocks
    return MOCK_QUESTIONS_FALLBACK.map(q => ({...q, id: `mock-${Math.random()}`})) as unknown as Question[];
  }

  const prompt = `
    Generate ${count} high-quality multiple-choice questions for the Indian Competitive Exam: "${exam}".
    Subject: "${subject}".
    The questions should be similar in difficulty and style to previous year questions (PYQs).
    Each question must have 4 options, one correct answer, and a detailed explanation.
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
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctIndex: { type: Type.INTEGER, description: "Zero-based index of the correct option (0-3)" },
              explanation: { type: Type.STRING },
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
