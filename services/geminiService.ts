
import { Question, QuestionSource, QuestionType, QuestionPaper, ExamType, NewsItem } from "../types";
import { MOCK_QUESTIONS_FALLBACK } from "../constants";
import { getOfficialQuestions, getOfficialNews } from "./storageService";

// Helpers
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Generic API Fetcher with Timeout and Error Handling
const fetchAI = async (endpoint: string, payload: any) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s Timeout

        const res = await fetch(`/api/ai/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
        }

        const json = await res.json();
        if (json.success) return json.data;
        throw new Error(json.error || 'AI Error');
    } catch (e) {
        console.warn(`AI Fetch Failed (${endpoint}):`, e);
        return null; // Return null to trigger fallback
    }
};

export const parseSmartInput = async (
  input: string,
  type: 'text' | 'image',
  examContext: string
): Promise<any[]> => {
  const data = await fetchAI('extract', {
      text: type === 'text' ? input : undefined,
      image: type === 'image' ? input : undefined,
      exam: examContext
  });
  return data || [];
};

export const generateExamQuestions = async (
  exam: string,
  subject: string,
  count: number = 5,
  difficulty: string = 'Medium',
  topics: string[] = []
): Promise<Question[]> => {
  
  // 1. Hybrid: Try Official DB first
  const officialQs = await getOfficialQuestions(exam, subject, count);
  if (officialQs.length >= count) return officialQs;
  
  const remainingCount = count - officialQs.length;
  
  // 2. Fetch from Backend AI
  const aiData = await fetchAI('questions', {
      exam, subject, count: remainingCount, topic: topics.join(', ')
  });

  // 3. Fallback Mechanism (Tank Mode)
  if (!aiData || !Array.isArray(aiData)) {
      // If AI fails, use MOCK fallback to keep app running
      return [...officialQs, ...(MOCK_QUESTIONS_FALLBACK as unknown as Question[])];
  }

  // Backend already formats mostly, but we ensure structure
  const aiQuestions = aiData.map((q: any) => ({
      ...q,
      id: generateId('ai-q'),
      source: QuestionSource.PYQ_AI,
      examType: exam as ExamType,
      subject: subject,
      type: QuestionType.MCQ
  }));

  return [...officialQs, ...aiQuestions];
};

export const generatePYQList = async (
  exam: string,
  subject: string,
  year: number,
  topic?: string
): Promise<Question[]> => {
  // Hybrid Check
  const allOfficial = await getOfficialQuestions(exam, subject, 50);
  const officialPYQs = allOfficial.filter(q => q.pyqYear === year);
  if (officialPYQs.length >= 5) return officialPYQs;

  // Backend Call
  const aiData = await fetchAI('questions', {
      exam, subject, count: 15, mode: 'pyq', year, topic
  });

  if (!aiData) return officialPYQs;

  const aiPYQs = aiData.map((q: any) => ({
      ...q,
      id: generateId(`pyq-${year}`),
      source: QuestionSource.PYQ_AI,
      examType: exam as ExamType,
      subject: subject,
      pyqYear: year
  }));

  return [...officialPYQs, ...aiPYQs];
};

export const generateCurrentAffairs = async (
  exam: string,
  count: number = 10
): Promise<Question[]> => {
  const officialCA = await getOfficialQuestions(exam, 'Current Affairs', count);
  if (officialCA.length >= count) return officialCA;

  const aiData = await fetchAI('news', {
      exam, type: 'quiz', count: count - officialCA.length
  });

  if (!aiData) return officialCA;

  const aiQs = aiData.map((q: any) => ({
      id: generateId('ca-q'),
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

  return [...officialCA, ...aiQs];
};

export const generateNews = async (
  exam: string,
  month?: string,
  year?: number,
  category?: string
): Promise<NewsItem[]> => {
  const officialNews = await getOfficialNews(category, month, year);
  
  const aiData = await fetchAI('news', {
      exam, type: 'news', month, year, category
  });

  if (!aiData) return officialNews;

  const aiNews = aiData.map((n: any) => ({
      id: generateId('news'),
      headline: n.headline,
      headlineHindi: n.headline_hi,
      summary: n.summary,
      summaryHindi: n.summary_hi,
      category: n.category || category || 'General',
      date: n.date || `${month} ${year}`,
      tags: n.tags || []
  }));

  return [...officialNews, ...aiNews];
};

export const generateStudyNotes = async (
  exam: string,
  subject?: string
): Promise<NewsItem[]> => {
  const aiData = await fetchAI('news', {
      exam, type: 'notes', subject
  });

  if (!aiData) return [];

  return aiData.map((n: any) => ({
      id: generateId('note'),
      headline: n.headline || n.title, // Handle backend variations
      headlineHindi: n.headline_hi,
      summary: n.summary || n.content,
      summaryHindi: n.summary_hi,
      category: subject || 'Notes',
      date: 'Key Concept',
      tags: n.tags || []
  }));
};

export const generateSingleQuestion = async (
  exam: string,
  subject: string,
  topic: string
): Promise<Partial<Question> | null> => {
  const data = await fetchAI('doubt', {
      exam, subject, topic
  });
  
  if (!data) return null;
  
  return {
      text: data.text,
      textHindi: data.text_hi,
      options: data.options,
      optionsHindi: data.options_hi,
      correctIndex: data.correctIndex,
      explanation: data.explanation,
      explanationHindi: data.explanation_hi,
      tags: data.tags
  };
};

export const generateQuestionFromImage = async (
  base64Image: string,
  mimeType: string,
  examType: string,
  subject: string
): Promise<Partial<Question> | null> => {
  const data = await fetchAI('doubt', {
      image: base64Image, mimeType, exam: examType, subject
  });
  
  if (!data) return null;

  return {
      text: data.text,
      textHindi: data.text_hi,
      options: data.options,
      optionsHindi: data.options_hi,
      correctIndex: data.correctIndex,
      explanation: data.explanation,
      explanationHindi: data.explanation_hi,
      tags: data.tags
  };
};

export const generateFullPaper = async (
  exam: string,
  subject: string,
  difficulty: string,
  seedData: string,
  config: any
): Promise<QuestionPaper | null> => {
  const data = await fetchAI('paper', {
      exam, subject, difficulty, seedData, config
  });

  if (!data) return null;

  // Map Backend Data to QuestionPaper Interface
  const sections = data.sections?.map((sec: any, sIdx: number) => ({
      id: `sec-${sIdx}`,
      title: sec.title || `Section ${sIdx+1}`,
      instructions: "Attempt all questions",
      marksPerQuestion: sec.marksPerQuestion || 1,
      questions: sec.questions?.map((q: any, qIdx: number) => ({
          id: generateId(`p-q-${sIdx}-${qIdx}`),
          text: q.text,
          textHindi: q.text_hi,
          options: q.options || [],
          correctIndex: q.options ? q.options.findIndex((o: string) => o === q.answer) : -1,
          answer: q.answer,
          explanation: q.explanation,
          type: q.options ? QuestionType.MCQ : QuestionType.SHORT_ANSWER,
          examType: exam as ExamType,
          source: QuestionSource.PYQ_AI,
          createdAt: Date.now(),
          marks: sec.marksPerQuestion
      }))
  }));

  return {
      id: generateId('paper'),
      title: data.title || `${exam} Mock Paper`,
      examType: exam as ExamType,
      subject: subject,
      difficulty: difficulty,
      totalMarks: data.totalMarks || 100,
      durationMinutes: data.duration || 60,
      sections: sections || [],
      createdAt: Date.now()
  };
};
