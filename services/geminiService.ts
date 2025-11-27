
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";

// Initialize the client with the environment variable.
const apiKey = process.env.API_KEY;

// Helper to warn in production if key is missing
if (typeof window !== 'undefined' && !apiKey) {
  console.error("⚠️ API_KEY is missing! The app cannot contact Gemini.");
}

const cleanJson = (text: string) => {
  // First, try to match a JSON block
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  let cleaned = match ? match[0] : text;
  
  // Basic cleanup
  cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find first [ or {
  const firstOpen = cleaned.search(/[\{\[]/);
  const lastClose = cleaned.search(/[\]\}][^\]\}]*$/);
  
  if (firstOpen !== -1 && lastClose !== -1) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned;
};

// Helper for unique IDs - Added random suffix to strictly prevent collisions
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const parseSmartInput = async (
  input: string,
  type: 'text' | 'image',
  examContext: string
): Promise<any> => {
  if (!apiKey || apiKey.trim() === '') return null;
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Act as a data entry assistant for the ${examContext} exam.
    Analyze the provided ${type} and extract the Multiple Choice Question details accurately.
    
    TASK:
    1. Extract the Question Text (English).
    2. Extract Hindi translation if present in input.
    3. Extract Options.
    4. Solve the question to find the Correct Index (0-3).
    5. Write a detailed Explanation for the answer.
    6. Guess the Subject based on content.
    
    OUTPUT JSON FORMAT:
    {
      "text": "Question string",
      "text_hi": "Hindi string or null",
      "options": ["A", "B", "C", "D"],
      "options_hi": ["A Hindi", ... ] or null,
      "correct_index": Integer (0-3),
      "explanation": "String",
      "subject": "String (e.g. History, Physics)"
    }
    
    CLEANING RULES:
    - Remove question numbers (e.g. "Q1.", "5.") from text.
    - Remove option labels (e.g. "(a)", "A.") from options.
  `;

  try {
    const parts: any[] = [];
    if (type === 'image') {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: input } });
        parts.push({ text: prompt });
    } else {
        parts.push({ text: `${prompt}\n\nRAW INPUT:\n${input}` });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: { responseMimeType: "application/json" }
    });

    return JSON.parse(cleanJson(response.text || "{}"));
  } catch (error) {
    console.error("Smart extraction failed:", error);
    return null;
  }
};

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  
  // --- HYBRID LOGIC START ---
  // 1. Try to fetch Official/Admin questions first
  const officialQs = await getOfficialQuestions(exam, subject, count);
  
  if (officialQs.length >= count) {
    console.log("Serving 100% Official Questions");
    return officialQs;
  }
  
  // 2. If not enough, calculate remaining needed
  const remainingCount = count - officialQs.length;
  console.log(`Serving ${officialQs.length} Official Qs and generating ${remainingCount} AI Qs`);
  
  if (remainingCount <= 0) return officialQs;
  // --- HYBRID LOGIC END ---

  if (!apiKey || apiKey.trim() === '') {
    console.warn("No API Key found, using mock data.");
    return [...officialQs, ...MOCK_QUESTIONS_FALLBACK.map(q => ({
      ...q, 
      id: generateId('mock'),
      type: QuestionType.MCQ
    }))] as unknown as Question[];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // --- PARALLEL FETCHING LOGIC ---
  // Split the request into small batches of 5 to speed up generation
  const BATCH_SIZE = 5;
  const numBatches = Math.ceil(remainingCount / BATCH_SIZE);
  const aiPromises = [];

  for (let i = 0; i < numBatches; i++) {
    const currentBatchCount = Math.min(BATCH_SIZE, remainingCount - (i * BATCH_SIZE));
    
    // STRICT PROMPT FOR ACCURACY
    const prompt = `
      You are an expert examiner for ${exam}. 
      Generate ${currentBatchCount} HIGH-ACCURACY multiple-choice questions for subject: ${subject}.
      Difficulty Level: ${difficulty}.
      ${topics.length > 0 ? `Focus Topics: ${topics.join(', ')}` : 'Topics: Standard Syllabus Coverage'}
      
      STRICT RULES:
      1. SOURCE OF TRUTH: Questions must be based on standard textbooks (NCERT/Standard Reference). NO made-up scenarios.
      2. MATH/SCIENCE: Use integers or simple fractions. Ensure the calculation leads to a clean, exact answer. No complex decimals unless standard for the exam.
      3. HISTORY/GK: Only use verified historical dates and facts.
      4. OPTIONS: Must be distinct and unambiguous.
      5. Batch: ${i + 1} (Ensure variety).
      
      Output strictly JSON array.
      Include 'text', 'text_hi' (Hindi translation), 'options', 'options_hi', 'correctIndex', 'explanation' (Step-by-step verification), 'explanation_hi'.
    `;

    aiPromises.push(
      ai.models.generateContent({
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
      }).then(response => {
         const jsonStr = cleanJson(response.text || "[]");
         return JSON.parse(jsonStr);
      }).catch(err => {
         console.error(`Batch ${i} failed`, err);
         return [];
      })
    );
  }

  try {
    const results = await Promise.all(aiPromises);
    const rawQuestions = results.flat();
    
    const aiQuestions = rawQuestions.map((q: any, index: number) => ({
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

    // Merge Official + AI
    return [...officialQs, ...aiQuestions];

  } catch (error) {
    console.error("Gemini generation failed:", error);
    return [...officialQs, ...(MOCK_QUESTIONS_FALLBACK.map(q => ({
      ...q, 
      id: generateId('fallback'),
      type: QuestionType.MCQ
    })) as unknown as Question[])];
  }
};

export const generatePYQList = async (
  exam: string,
  subject: string,
  year: number,
  topic?: string
): Promise<Question[]> => {
  if (!apiKey || apiKey.trim() === '') return [];

  // Hybrid: Check for Official PYQs
  const allOfficial = await getOfficialQuestions(exam, subject, 50);
  const officialPYQs = allOfficial.filter(q => q.pyqYear === year);
  if (officialPYQs.length >= 5) return officialPYQs;

  const ai = new GoogleGenAI({ apiKey });
  
  // PARALLEL FETCHING: 15 questions = 3 batches of 5
  const TOTAL_REQ = 15;
  const BATCH_SIZE = 5;
  const numBatches = TOTAL_REQ / BATCH_SIZE;
  const aiPromises = [];

  for (let i = 0; i < numBatches; i++) {
    const prompt = `
      Simulate ${BATCH_SIZE} high-yield questions based on the ${year} ${exam} exam pattern for ${subject}.
      ${topic ? `Focus Topic: ${topic}` : ''}
      Batch: ${i + 1}
      
      STRICT ACCURACY RULES:
      1. If exact PYQ text is copyright-restricted, generate a 'Concept Twin': Use the EXACT same logic/formula/concept but change the values/entities slightly.
      2. Maintain the exact difficulty level of ${year}.
      3. For Numerical: Ensure calculations are solvable without a calculator (Integer/Clean Fractions).
      4. FACT CHECK: Verify the answer before generating explanation.
      
      Output strictly JSON array.
      Mix MCQs and 1 short answer.
    `;

    aiPromises.push(
        ai.models.generateContent({
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
                  text_hi: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  options_hi: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  answer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  explanation_hi: { type: Type.STRING },
                  type: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['text', 'explanation', 'type']
              }
            }
          }
        }).then(res => JSON.parse(cleanJson(res.text || "[]"))).catch(e => [])
    );
  }

  try {
    const results = await Promise.all(aiPromises);
    const rawQuestions = results.flat();
    
    if (rawQuestions.length === 0) return officialPYQs;

    const aiPYQs = rawQuestions.map((q: any, index: number) => ({
      id: generateId(`pyq-${year}-${index}`),
      text: q.text,
      textHindi: q.text_hi,
      options: q.options || [],
      optionsHindi: q.options_hi || [],
      correctIndex: q.correctIndex ?? -1,
      answer: q.answer, 
      explanation: q.explanation, 
      explanationHindi: q.explanation_hi,
      source: QuestionSource.PYQ_AI,
      examType: exam as ExamType,
      subject: subject,
      createdAt: Date.now(),
      tags: q.tags || [],
      type: q.type === 'MCQ' ? QuestionType.MCQ : 
            q.type === 'NUMERICAL' ? QuestionType.NUMERICAL : QuestionType.SHORT_ANSWER,
      pyqYear: year
    }));

    return [...officialPYQs, ...aiPYQs];

  } catch (error) {
    console.error("PYQ generation failed:", error);
    return officialPYQs;
  }
};

export const generateCurrentAffairs = async (
  exam: string,
  count: number = 10
): Promise<Question[]> => {
  const officialCA = await getOfficialQuestions(exam, 'Current Affairs', count);
  if (officialCA.length >= count) return officialCA;
  
  const remaining = count - officialCA.length;
  if (!apiKey || apiKey.trim() === '') return [];

  const ai = new GoogleGenAI({ apiKey });
  const BATCH_SIZE = 5;
  const numBatches = Math.ceil(remaining / BATCH_SIZE);
  const aiPromises = [];
  
  const focuses = [
      "Recent Awards & Honours (Verified)",
      "Important Government Schemes",
      "Major Sports Events (Olympics/World Cups)",
      "Constitutional Articles (Static GK)",
      "Scientific Discoveries (Verified)"
  ];

  for (let i = 0; i < numBatches; i++) {
      const currentBatchCount = Math.min(BATCH_SIZE, remaining - (i * BATCH_SIZE));
      const randomFocus = focuses[i % focuses.length]; 

      const prompt = `
        Generate ${currentBatchCount} High-Quality MCQs for ${exam}.
        Focus Area: ${randomFocus}.
        
        CRITICAL INSTRUCTIONS:
        1. DO NOT HALLUCINATE. Only ask about events that definitively happened.
        2. If asking about dates, use well-known historical or major recent dates.
        3. Include 'Static GK' questions if recent news is ambiguous or uncertain.
        4. Include English & Hindi content.
        
        Output strictly JSON array.
      `;
      
      aiPromises.push(
          ai.models.generateContent({
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
          }).then(res => JSON.parse(cleanJson(res.text || "[]"))).catch(e => [])
      );
  }

  try {
    const results = await Promise.all(aiPromises);
    const rawQuestions = results.flat();
    
    const aiQuestions = rawQuestions.map((q: any, index: number) => ({
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

    return [...officialCA, ...aiQuestions];

  } catch (error) {
    console.error("Current Affairs generation failed:", error);
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
  if (!apiKey || apiKey.trim() === '') return officialNews;

  const ai = new GoogleGenAI({ apiKey });
  
  const timeContext = month && year 
      ? `Period: ${month} ${year}` 
      : 'Recent (Last 1 Year)';
  
  const categoryContext = category && category !== 'All' 
      ? `Category: ${category}` 
      : 'General News';

  // Strict prompt to avoid fake dates
  const prompt = `
    Retrieve 8 REAL, VERIFIED Current Affairs events for ${exam} preparation.
    ${timeContext}. ${categoryContext}.
    
    STRICT RULES:
    1. NO FAKE NEWS. If you do not have specific data for ${month} ${year}, provide "Static General Knowledge" or "Historical Facts" related to ${category || 'India'} instead.
    2. REQUIRED: Exact date (DD Month YYYY) if known, otherwise write "General Fact" or "Static GK".
    3. Focus on: Appointments, Awards, Summits, Schemes.
    
    Output strictly JSON array.
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
              headline: { type: Type.STRING },
              headline_hi: { type: Type.STRING },
              summary: { type: Type.STRING },
              summary_hi: { type: Type.STRING },
              category: { type: Type.STRING },
              date: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['headline', 'summary', 'category', 'date']
          }
        }
      }
    });

    const jsonStr = cleanJson(response.text || "[]");
    const rawNews = JSON.parse(jsonStr);
    
    const aiNews = rawNews.map((n: any, index: number) => ({
      id: generateId(`news-${index}`),
      headline: n.headline,
      headlineHindi: n.headline_hi,
      summary: n.summary,
      summaryHindi: n.summary_hi,
      category: n.category,
      date: n.date || `${month || 'Unknown'} ${year || ''}`,
      tags: n.tags || []
    }));

    return [...officialNews, ...aiNews];

  } catch (error) {
    console.error("News generation failed:", error);
    return officialNews;
  }
};

export const generateStudyNotes = async (
  exam: string,
  subject?: string
): Promise<NewsItem[]> => {
  if (!apiKey || apiKey.trim() === '') return [];

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Generate 8 High-Yield Study Notes/Formulas for ${exam}.
    Subject: ${subject || 'Key Concepts'}.
    Include English & Hindi.
    
    Format:
    - Title: Name of the Concept/Theorem.
    - Content: The Formula, Definition, or Key Fact.
    
    Output strictly JSON array.
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
              title: { type: Type.STRING },
              title_hi: { type: Type.STRING },
              content: { type: Type.STRING },
              content_hi: { type: Type.STRING },
              subject: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'content', 'subject']
          }
        }
      }
    });

    const jsonStr = cleanJson(response.text || "[]");
    const rawNotes = JSON.parse(jsonStr);
    
    return rawNotes.map((n: any, index: number) => ({
      id: generateId(`note-${index}`),
      headline: n.title,
      headlineHindi: n.title_hi,
      summary: n.content,
      summaryHindi: n.content_hi,
      category: n.subject,
      date: 'Key Concept',
      tags: n.tags || []
    }));
  } catch (error) {
    console.error("Study Notes generation failed:", error);
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
  const prompt = `
    Generate 1 High-Quality MCQ for ${exam}. Subject: ${subject}, Topic: ${topic}.
    Ensure the question is FACTUALLY CORRECT and unambiguous.
    Output strictly JSON.
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
  // BATCH SIZE for Paper is larger as it is a single big task
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
           
           STRICT ACCURACY:
           1. Questions must be technically correct and solvable.
           2. Options must be distinct.
           3. Explanation must be step-by-step verified.
           
           REQUIREMENT: English and Hindi.
        `;

        batchPromises.push(
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
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
            { text: `Extract question from image for ${examType} (${subject}). Include Hindi translation if possible. EXPLANATION: Step-by-step reasoning.` }
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
