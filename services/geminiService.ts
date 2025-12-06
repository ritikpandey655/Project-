
import { Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";

// --- CONFIGURATION ---

// Helper to call Backend Proxy instead of Direct SDK
const callGeminiBackend = async (params: { model: string, contents: any, config?: any }) => {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Backend generation failed');
    }
    // Return object mimicking SDK response structure for compatibility
    return { text: result.data }; 
  } catch (error) {
    console.error("Backend Call Failed:", error);
    throw error;
  }
};

// 2. Groq Client Helper (Now only for local override)
const getLocalGroqKey = () => {
  return localStorage.getItem('groq_api_key') || "";
};

// Helpers
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const cleanJson = (text: string) => {
  if (!text) return "[]";
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  
  // Find the first { or [ and the last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const start = (firstBrace === -1) ? firstBracket : (firstBracket === -1) ? firstBrace : Math.min(firstBrace, firstBracket);
  
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);

  if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned.trim();
};

const safeOptions = (opts: any): string[] => {
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') return opts.split(',').map(s => s.trim());
    return [];
};

const commonConfig = {
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
};

// --- GROQ API HANDLER (For Super Speed) ---
const fetchFromGroq = async (prompt: string, model = "llama3-70b-8192", jsonMode = false): Promise<any> => {
    // CHECK USER PREFERENCE: If Admin selected Gemini explicitly, skip Groq
    const preferredProvider = localStorage.getItem('selected_ai_provider');
    if (preferredProvider === 'gemini') return null;

    try {
        const body: any = {
            messages: [{ role: "user", content: prompt + (jsonMode ? " Respond ONLY in valid JSON. No Markdown." : "") }],
            model: model,
            jsonMode: jsonMode // Passed to proxy to handle formatting
        };

        // Case 1: User has their own custom key in LocalStorage (BYOK)
        const customKey = getLocalGroqKey();
        
        if (customKey) {
            // Direct Client Call (User's Key)
            const reqBody = { ...body, temperature: 0.2 }; // STRICT FACTUALITY
            if (jsonMode) reqBody.response_format = { type: "json_object" };
            
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${customKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(reqBody)
            });
            if (!response.ok) throw new Error("Groq API Error");
            const data = await response.json();
            return JSON.parse(cleanJson(data.choices[0].message.content));
        } 
        
        // Case 2: Use Backend Proxy (Server Key) - SECURE
        else {
            const response = await fetch('/api/ai/groq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            const content = result.data.choices[0].message.content;
            return JSON.parse(cleanJson(content));
        }

    } catch (e) {
        // Fail silently so Gemini fallback kicks in
        return null;
    }
};

// --- SUBJECT ISOLATION LOGIC ---
const getSubjectConstraint = (subject: string): string => {
    const s = subject.toLowerCase();
    
    if (s.includes('history')) return "STRICTLY History (Ancient, Medieval, Modern, Art & Culture). DO NOT ask Science, Polity, or Geography questions.";
    if (s.includes('polity') || s.includes('civics')) return "STRICTLY Polity, Constitution, Governance. DO NOT ask History or Science.";
    if (s.includes('geography')) return "STRICTLY Geography (Physical, Indian, World). NO History/Economy.";
    if (s.includes('economy') || s.includes('economics')) return "STRICTLY Economy. NO History/Polity.";
    if (s.includes('physics')) return "STRICTLY Physics. NO Biology, Chemistry, or General Knowledge.";
    if (s.includes('chemistry')) return "STRICTLY Chemistry. NO Physics, Biology.";
    if (s.includes('biology') || s.includes('botany') || s.includes('zoology')) return "STRICTLY Biology. NO Physics/Maths.";
    if (s.includes('math') || s.includes('quantitative')) return "STRICTLY Mathematics/Quant. NO Theory/GK.";
    if (s.includes('hindi')) return "STRICTLY Hindi Vyakaran (Grammar) & Sahitya (Literature). ABSOLUTELY NO History, Science, or Social Science allowed.";
    if (s.includes('english')) return "STRICTLY English Grammar, Vocab, Comprehension. NO GK/History.";
    if (s.includes('computer')) return "STRICTLY Computer Science/Application. NO General Subjects.";
    
    return `STRICTLY ${subject}. Do not stray into other subjects.`;
};

// --- MAIN GENERATION FUNCTIONS ---

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  
  // 1. Try Official DB First
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const needed = count - officialQs.length;
  const isUPBoard = exam.includes('UP Board');
  
  // Get Strict Constraints
  const subjectConstraint = getSubjectConstraint(subject);
  
  const basePrompt = `
      ACT AS A STRICT EXAMINER for ${exam}.
      SUBJECT: ${subject}.
      CONSTRAINT: ${subjectConstraint}
      DIFFICULTY: ${difficulty}.
      ${topics.length > 0 ? `SPECIFIC TOPICS: ${topics.join(', ')}` : ''}
      ${isUPBoard ? 'LANGUAGE: Hinglish (Hindi terms in Roman) or Hindi (Devanagari) where appropriate.' : ''}
      
      Create distinct, high-quality MCQs.
      OUTPUT FORMAT (JSON ARRAY ONLY):
      [
        {
          "text": "Question Statement",
          "text_hi": "Hindi Translation (Optional)",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "Reason"
        }
      ]
  `;

  // 2. SEQUENTIAL BATCHING STRATEGY (Fixes "10 out of 50" issue)
  // Instead of firing all requests at once (which hits rate limits), we do it in chunks.
  const batchSize = 10;
  const batches = Math.ceil(needed / batchSize);
  let aiQuestions: Question[] = [];

  for (let i = 0; i < batches; i++) {
      const currentBatchCount = Math.min(batchSize, needed - aiQuestions.length);
      if (currentBatchCount <= 0) break;

      const batchPrompt = `${basePrompt} \n Generate ${currentBatchCount} unique questions. Ensure no repetition from previous sets.`;

      try {
          // A. Try Groq (Fastest)
          let batchData = await fetchFromGroq(batchPrompt, "llama3-70b-8192", true);
          
          // B. Fallback to Gemini if Groq fails
          if (!batchData) {
              try {
                  // Try Primary Model (2.5)
                  const response = await callGeminiBackend({
                      model: 'gemini-2.5-flash',
                      contents: batchPrompt,
                      config: { ...commonConfig, temperature: 0.4, responseMimeType: "application/json" }
                  });
                  batchData = JSON.parse(cleanJson(response.text || "[]"));
              } catch (err) {
                  // Retry with Fallback Model (1.5) if 2.5 fails/overloaded
                  console.warn("Gemini 2.5 failed, retrying with 1.5-flash...");
                  const responseRetry = await callGeminiBackend({
                      model: 'gemini-1.5-flash',
                      contents: batchPrompt,
                      config: { ...commonConfig, temperature: 0.4, responseMimeType: "application/json" }
                  });
                  batchData = JSON.parse(cleanJson(responseRetry.text || "[]"));
              }
          }

          // Normalize and Add to List
          let items = [];
          if (Array.isArray(batchData)) items = batchData;
          else if (batchData && batchData.questions) items = batchData.questions;
          
          const validItems = items.map((q: any) => {
              const qText = q.text || q.question;
              if (!qText) return null;
              return {
                  ...q,
                  text: qText,
                  textHindi: q.text_hi || (isUPBoard ? qText : undefined),
                  id: generateId('ai-q'),
                  source: QuestionSource.PYQ_AI,
                  examType: exam as ExamType,
                  subject: subject,
                  type: QuestionType.MCQ,
                  options: safeOptions(q.options),
                  correctIndex: q.correctIndex ?? 0
              };
          }).filter((q: any) => q !== null);

          aiQuestions = [...aiQuestions, ...validItems];

          // Small delay to prevent rate limiting (429) during large generation
          if (batches > 1) await new Promise(r => setTimeout(r, 800));

      } catch (e) {
          console.warn(`Batch ${i+1} failed. Continuing...`, e);
      }
  }

  const finalQuestions = [...officialQs, ...aiQuestions];

  if (finalQuestions.length === 0) {
      if (subject === 'Mixed' || subject === 'General Awareness') {
          console.warn("Generation failed. Using Generic Fallback.");
          return MOCK_QUESTIONS_FALLBACK.map(q => ({...q, id: generateId('fall'), examType: exam as ExamType})) as unknown as Question[];
      } else {
          console.error(`Generation failed for ${subject}. Returning empty to avoid subject mixing.`);
          return [{
             id: generateId('err'),
             text: `AI Server Busy: Could not generate questions for ${subject}. Please try again in a few seconds.`,
             options: ["Retry", "Wait", "Check Internet", "Contact Support"],
             correctIndex: 0,
             explanation: "The AI model is currently overloaded or your request timed out. We prevented showing you wrong subject questions.",
             source: QuestionSource.PYQ_AI,
             examType: exam as ExamType,
             subject: subject,
             createdAt: Date.now(),
             type: QuestionType.MCQ
          }];
      }
  }

  return finalQuestions;
};

// ... (Rest of existing functions remain largely unchanged) ...

export const generateFullPaper = async (exam: string, subject: string, difficulty: string, seed: string, config: any): Promise<QuestionPaper | null> => {
    try {
        const subjectConstraint = getSubjectConstraint(subject);
        
        // --- 1. SYLLABUS & CONTEXT HANDLING ---
        const hasSyllabus = config.syllabus && config.syllabus.data;
        let syllabusContext = "";

        if (hasSyllabus) {
            syllabusContext = `
            CRITICAL INSTRUCTION: A specific syllabus/content file has been uploaded by the user.
            1. ANALYZE the provided image/PDF content strictly.
            2. GENERATE questions **ONLY** based on the topics, chapters, or concepts visible in the file.
            3. Do NOT include topics outside this provided syllabus file.
            `;
        } else {
            syllabusContext = `
            INSTRUCTION: No specific syllabus file provided. 
            1. Use your **EXPERT KNOWLEDGE** of the official ${exam} syllabus for ${subject}.
            2. Generate questions that are **standard**, **historically accurate** (based on PYQ patterns), and **factually verified**.
            3. STRICTLY AVOID hallucinations or fake concepts. If the user provided a hint ("${seed}"), focus on that. Otherwise, cover high-yield topics.
            4. Ensure the difficulty level matches: ${difficulty}.
            `;
        }

        // STEP 1: GENERATE BLUEPRINT (Structure)
        const blueprintPromptText = `
            Act as a strict exam setter for ${exam}. Create a blueprint for a Mock Paper.
            Subject: ${subject}
            Constraint: ${subjectConstraint}
            Difficulty: ${difficulty}.
            ${syllabusContext}
            Configuration:
            - Total MCQs: ${config.mcqCount || 10}
            - Include Short/Long answers: ${config.includeShort ? 'Yes' : 'No'}
            
            OUTPUT STRICT VALID JSON ONLY:
            {
              "title": "string",
              "totalMarks": number,
              "duration": number (minutes),
              "sections": [
                { 
                  "title": "string", 
                  "instructions": "string",
                  "questionCount": number, 
                  "marksPerQuestion": number,
                  "type": "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER"
                }
              ]
            }
        `;

        let blueprint = null;
        
        // If syllabus provided, we MUST use Gemini to see the image/pdf
        if (hasSyllabus) {
             const contents = { parts: [
                 { inlineData: { mimeType: config.syllabus.mimeType, data: config.syllabus.data } },
                 { text: blueprintPromptText }
             ]};
             
             const response = await callGeminiBackend({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: { ...commonConfig, temperature: 0.2, responseMimeType: "application/json" }
             });
             blueprint = JSON.parse(cleanJson(response.text || "{}"));
        } else {
            // Standard Flow (Try Groq first)
            try {
                 if (localStorage.getItem('selected_ai_provider') !== 'gemini') {
                     blueprint = await fetchFromGroq(blueprintPromptText, "llama3-70b-8192", true);
                 }
            } catch(e) {}

            if (!blueprint) {
                const response = await callGeminiBackend({
                    model: 'gemini-2.5-flash',
                    contents: blueprintPromptText,
                    config: { ...commonConfig, temperature: 0.2, responseMimeType: "application/json" }
                });
                blueprint = JSON.parse(cleanJson(response.text || "{}"));
            }
        }

        if (!blueprint || !blueprint.sections) return null;

        // STEP 2: GENERATE CONTENT FOR SECTIONS
        const filledSections = [];
        
        for (const [sIdx, sec] of blueprint.sections.entries()) {
            if (!sec.questionCount || sec.questionCount <= 0) {
                filledSections.push({ ...sec, id: `sec-${sIdx}`, questions: [] });
                continue;
            }

            const qPromptText = `
                Generate ${sec.questionCount} ${sec.type} questions for ${exam}.
                Subject: ${subject}
                Section: ${sec.title}.
                Difficulty: ${difficulty}.
                ${syllabusContext}
                
                CRITICAL: Questions must be factually correct.
                
                OUTPUT STRICT VALID JSON ARRAY of objects:
                {
                  "text": "Question text",
                  "options": ["Option A", "Option B", ...], (Required for MCQs)
                  "answer": "Correct Answer Text",
                  "explanation": "Reason"
                }
            `;

            let questions = [];
            
            // If syllabus exists, continue using Gemini with the image context for EVERY section generation
            if (hasSyllabus) {
                 const contents = { parts: [
                     { inlineData: { mimeType: config.syllabus.mimeType, data: config.syllabus.data } },
                     { text: qPromptText }
                 ]};
                 const response = await callGeminiBackend({
                    model: 'gemini-2.5-flash',
                    contents: contents,
                    config: { ...commonConfig, temperature: 0.3, responseMimeType: "application/json" }
                 });
                 questions = JSON.parse(cleanJson(response.text || "[]"));
            } else {
                // Standard text-only generation
                try {
                    if (localStorage.getItem('selected_ai_provider') !== 'gemini') {
                        const qData = await fetchFromGroq(qPromptText, "llama3-70b-8192", true);
                        if (qData) questions = Array.isArray(qData) ? qData : (qData.questions || []);
                    }
                } catch(e) {}

                if (questions.length === 0) {
                    const response = await callGeminiBackend({
                        model: 'gemini-2.5-flash',
                        contents: qPromptText,
                        config: { ...commonConfig, temperature: 0.3, responseMimeType: "application/json" }
                    });
                    questions = JSON.parse(cleanJson(response.text || "[]"));
                }
            }
            
            if (!Array.isArray(questions) && (questions as any).questions) questions = (questions as any).questions;

            filledSections.push({
                id: `sec-${sIdx}`,
                title: sec.title,
                instructions: sec.instructions || "Attempt all questions",
                marksPerQuestion: sec.marksPerQuestion || 1,
                questions: (questions || []).map((q: any, qIdx: number) => {
                    const opts = safeOptions(q.options);
                    // Smart correct index finder
                    let cIndex = q.correctIndex;
                    if (cIndex === undefined || cIndex === -1) {
                        cIndex = opts.findIndex((o: string) => o === q.answer);
                        if (cIndex === -1 && q.answer) {
                             cIndex = opts.findIndex((o: string) => o.toLowerCase().includes(q.answer.toLowerCase()));
                        }
                        if (cIndex === -1) cIndex = 0; // Fallback
                    }

                    return {
                        id: generateId(`p-q-${sIdx}-${qIdx}`),
                        text: q.text || q.question || "Question text missing",
                        textHindi: q.text_hi,
                        options: opts,
                        correctIndex: cIndex,
                        answer: q.answer || (opts.length > cIndex ? opts[cIndex] : ""),
                        explanation: q.explanation,
                        type: sec.type === 'MCQ' ? QuestionType.MCQ : QuestionType.SHORT_ANSWER,
                        examType: exam as ExamType,
                        source: QuestionSource.PYQ_AI,
                        createdAt: Date.now(),
                        marks: sec.marksPerQuestion
                    };
                })
            });
            
            // Add slight delay between sections
            if (sIdx < blueprint.sections.length - 1) await new Promise(r => setTimeout(r, 200));
        }

        return {
            id: generateId('paper'),
            title: blueprint.title || `${exam} Mock Paper`,
            examType: exam as ExamType,
            subject: subject,
            difficulty: difficulty,
            totalMarks: blueprint.totalMarks || 100,
            durationMinutes: blueprint.duration || 60,
            sections: filledSections,
            createdAt: Date.now()
        };

    } catch (e) { 
        console.error("Generate Paper Error:", e);
        return null; 
    }
};

// ... (Export other existing functions to ensure file integrity) ...
export const generateCurrentAffairs = async (exam: string, count: number = 10): Promise<Question[]> => {
  // Groq cannot search the web, so we MUST use Gemini for News
  const officialCA = await getOfficialQuestions(exam, 'Current Affairs', count);
  if (officialCA.length >= count) return officialCA;

  try {
      const fetchCount = Math.min(count - officialCA.length, 10);
      const prompt = `
        Search for ${fetchCount} LATEST & VERIFIED Current Affairs news for ${exam} exams (India).
        Based on results, create ${fetchCount} MCQs.
        STRICTLY NO FAKE NEWS. Verify dates and facts.
        Format: JSON Array of objects with text, options, correctIndex, explanation.
      `;
      
      const response = await callGeminiBackend({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...commonConfig,
          temperature: 0.2, // Strict
          tools: [{ googleSearch: {} }],
        }
      });

      const text = response.text || "[]";
      const aiData = JSON.parse(cleanJson(text));

      const aiQs = aiData.map((q: any) => ({
          id: generateId('ca-q'),
          text: q.text || q.question,
          textHindi: q.text_hi || (q.text || q.question),
          options: safeOptions(q.options),
          optionsHindi: safeOptions(q.options_hi || q.options),
          correctIndex: q.correctIndex || 0,
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
      return officialCA.length > 0 ? officialCA : MOCK_QUESTIONS_FALLBACK as unknown as Question[];
  }
};

export const parseSmartInput = async (input: string, type: 'text' | 'image', examContext: string): Promise<any[]> => {
  // Use Groq for text only
  if (type === 'text') {
      const groqResp = await fetchFromGroq(`Extract questions from this text for ${examContext}. Return JSON Array. Text: ${input}`, "llama3-70b-8192", true);
      // Handle wrapped JSON
      if (groqResp) {
          if (Array.isArray(groqResp)) return groqResp;
          if (groqResp.questions && Array.isArray(groqResp.questions)) return groqResp.questions;
      }
  }

  // Use Gemini for Image or Fallback
  try {
    const prompt = `
      Analyze this ${type === 'image' ? 'Image' : 'Input'} related to ${examContext}.
      
      TASK:
      1. If the image contains explicit questions (MCQs), extract them exactly.
      2. If the image contains CONTENT (like News, Notes, Bullet Points, Current Affairs facts), GENERATE high-quality MCQs based on that content.
      
      RULES:
      - Detect language (English, Hindi, or Hinglish). Return explicit 'text' and 'text_hi' if possible.
      - If converting notes to questions, ensure the question is factual and derived directly from the image text.
      - Provide 4 distinct options for MCQs.
      - Identify the correct answer (index 0-3).
      - Add a short explanation based on the text.
      
      OUTPUT FORMAT (Strict JSON Array):
      [
        {
          "text": "Question in English (or transliterated)",
          "text_hi": "Question in Hindi (Devanagari)",
          "options": ["A", "B", "C", "D"],
          "options_hi": ["A (Hindi)", "B (Hindi)", ...],
          "correct_index": 0,
          "explanation": "Derived explanation",
          "subject": "Current Affairs or specific subject"
        }
      ]
    `;
    
    const contents = { parts: [] as any[] };
    if(type === 'image') {
        contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: input } });
        contents.parts.push({ text: prompt });
    } else {
        contents.parts.push({ text: `${prompt}\n\n${input}` });
    }
    
    const response = await callGeminiBackend({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { ...commonConfig, temperature: 0.1, responseMimeType: "application/json" }
    });
    
    const parsed = JSON.parse(cleanJson(response.text || "[]"));
    return Array.isArray(parsed) ? parsed : (parsed.questions || []);
  } catch (e) { 
      console.error("Smart Parse Error:", e);
      return []; 
  }
};

export const generateNews = async (exam: string, month?: string, year?: number, category?: string): Promise<NewsItem[]> => {
  // News needs Gemini Search
  try {
      const prompt = `Search verified news for ${exam} (${month} ${year}, ${category}). Return 8 items as JSON Array {headline, summary, date, category}. Ensure facts are correct.`;
      const response = await callGeminiBackend({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { ...commonConfig, temperature: 0.2, tools: [{ googleSearch: {} }] }
      });
      const aiData = JSON.parse(cleanJson(response.text || "[]"));
      return aiData.map((n: any) => ({
          id: generateId('news'),
          headline: n.headline,
          headlineHindi: n.headline_hi,
          summary: n.summary,
          summaryHindi: n.summary_hi,
          category: n.category || category || 'General',
          date: n.date || `${month} ${year}`,
          tags: n.tags || []
      }));
  } catch (e) { return []; }
};

export const generateStudyNotes = async (exam: string, subject?: string): Promise<NewsItem[]> => {
  // Groq is excellent for generating static notes
  const prompt = `Generate 8 High-Yield Formula/Notes for ${exam} (${subject}). Return JSON Array {headline, summary}. Strictly accurate formulas.`;
  
  const groqResp = await fetchFromGroq(prompt, "llama3-70b-8192", true);
  if (groqResp) {
      const notes = Array.isArray(groqResp) ? groqResp : (groqResp.notes || groqResp.items || []);
      if (notes.length > 0) {
        return notes.map((n: any) => ({
            id: generateId('note'),
            headline: n.headline || n.title,
            summary: n.summary || n.content,
            category: subject || 'Notes',
            date: 'Key Concept',
            tags: []
        }));
      }
  }

  try {
      const response = await callGeminiBackend({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { ...commonConfig, temperature: 0.2, responseMimeType: "application/json" } 
      });
      const aiData = JSON.parse(cleanJson(response.text || "[]"));
      return aiData.map((n: any) => ({
          id: generateId('note'),
          headline: n.headline || n.title,
          summary: n.summary || n.content,
          category: subject || 'Notes',
          date: 'Key Concept',
          tags: []
      }));
  } catch (e) { return []; }
};

export const generateSingleQuestion = async (exam: string, subject: string, topic: string): Promise<Partial<Question> | null> => {
  const prompt = `Generate 1 High-Quality, Factually Correct MCQ for ${exam} (${subject}: ${topic}). JSON.`;
  
  const groqResp = await fetchFromGroq(prompt, "llama3-70b-8192", true);
  if (groqResp) {
      // Handle single object or array wrapped
      const q = Array.isArray(groqResp) ? groqResp[0] : groqResp;
      return {
          ...q,
          text: q.text || q.question,
          options: safeOptions(q.options)
      };
  }

  try {
      const response = await callGeminiBackend({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { ...commonConfig, temperature: 0.2, responseMimeType: "application/json" }
      });
      const data = JSON.parse(cleanJson(response.text || "{}"));
      return {
          ...data,
          text: data.text || data.question,
          options: safeOptions(data.options)
      };
  } catch (e) { return null; }
};

export const generateQuestionFromImage = async (base64: string, mime: string, exam: string, subject: string): Promise<Partial<Question> | null> => {
  // Images require Gemini
  try {
      const response = await callGeminiBackend({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: `Solve this ${exam} question accurately. Return JSON {text, options, correctIndex, explanation}.` }] },
        config: { ...commonConfig, temperature: 0.1, responseMimeType: "application/json" } // Very strict for solving
      });
      const data = JSON.parse(cleanJson(response.text || "{}"));
      return {
          ...data,
          text: data.text || data.question,
          options: safeOptions(data.options)
      };
  } catch (e) { return null; }
};

export const generatePYQList = async (exam: string, subject: string, year: number, topic?: string): Promise<Question[]> => {
    const prompt = `Simulate 10 authentic questions for ${year} ${exam} (${subject}). ${topic ? `Topic: ${topic}` : ''}. Return JSON Array. Ensure questions are historically accurate to that year's pattern.`;
    
    const groqResp = await fetchFromGroq(prompt, "llama3-70b-8192", true);
    if (groqResp) {
        const list = Array.isArray(groqResp) ? groqResp : (groqResp.questions || []);
        if (list.length > 0) {
            return list.map((q: any) => ({
                ...q,
                id: generateId(`pyq-${year}`),
                text: q.text || q.question,
                source: QuestionSource.PYQ_AI,
                examType: exam as ExamType,
                subject: subject,
                pyqYear: year,
                type: QuestionType.MCQ,
                options: safeOptions(q.options)
            }));
        }
    }

    try {
        const response = await callGeminiBackend({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { ...commonConfig, temperature: 0.2, responseMimeType: "application/json" }
        });
        const aiData = JSON.parse(cleanJson(response.text || "[]"));
        return aiData.map((q: any) => ({
            ...q,
            id: generateId(`pyq-${year}`),
            text: q.text || q.question,
            source: QuestionSource.PYQ_AI,
            examType: exam as ExamType,
            subject: subject,
            pyqYear: year,
            type: QuestionType.MCQ,
            options: safeOptions(q.options)
        }));
    } catch(e) { return []; }
};
