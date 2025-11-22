
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";

// Initialize the client with the environment variable.
// Vite replaces 'process.env.API_KEY' with the actual string during build.
const apiKey = process.env.API_KEY;

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
    Create a complete mock exam paper for:
    Exam: ${exam}
    Subject: ${subject}
    Structure: ${JSON.stringify(paperStructure)}
    Total Marks: ${totalMarks}
    Time: ${timeLimit} mins
    Difficulty: ${difficulty}
    Context/Seed Data: ${seedData || "Standard Exam Syllabus"}

    STRICTLY OUTPUT JSON following this schema:
    {
      "meta": {
        "exam": "${exam}",
        "subject": "${subject}",
        "total_marks": ${totalMarks},
        "time_mins": ${timeLimit}
      },
      "paper": [
        { 
          "q_no": 1, 
          "type": "MCQ", 
          "q_text": "Question text here...", 
          "options": ["A", "B", "C", "D"], 
          "answer": "Option Text or Letter", 
          "marks": 1, 
          "difficulty": "${difficulty}", 
          "explanation": "Explanation here..."
        }
      ]
    }
    For ShortAnswer/LongAnswer/Viva, "options" should be empty [], and "answer" should be the model answer.
    Ensure unique questions.
  `;

  try {
    // Use gemini-2.5-flash for reliability and speed (Thinking mode removed for Flash)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
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
