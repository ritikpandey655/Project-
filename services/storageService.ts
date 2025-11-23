
import { Question, UserStats, ExamType, User, ExamResult, QuestionSource } from '../types';

const QUESTIONS_KEY = 'exam_master_questions';
const STATS_KEY = 'exam_master_stats';
const PREFS_KEY = 'exam_master_prefs';
const USER_KEY = 'exam_master_user';
const RESULTS_KEY = 'exam_master_results';
const PRACTICE_SESSION_KEY = 'exam_master_practice_session';
const BOOKMARKS_KEY = 'exam_master_bookmarks';
const QOTD_KEY = 'exam_master_qotd';
const ADMIN_QUESTION_BANK_KEY = 'exam_master_admin_q_bank';

export const INITIAL_STATS: UserStats = {
  totalAttempted: 0,
  totalCorrect: 0,
  streakCurrent: 0,
  streakMax: 0,
  lastActiveDate: '',
  subjectPerformance: {},
  examPerformance: {}
};

// Helper to namespace keys by User ID
const getUserKey = (key: string, userId: string) => `${key}_${userId}`;

// User Auth Storage
export const saveUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

// Question Storage (User Uploads)
export const saveUserQuestion = (userId: string, question: Question): void => {
  const existing = getUserQuestions(userId);
  const updated = [...existing, question];
  localStorage.setItem(getUserKey(QUESTIONS_KEY, userId), JSON.stringify(updated));
};

export const getUserQuestions = (userId: string): Question[] => {
  const data = localStorage.getItem(getUserKey(QUESTIONS_KEY, userId));
  return data ? JSON.parse(data) : [];
};

export const deleteUserQuestion = (userId: string, id: string): void => {
  const existing = getUserQuestions(userId);
  const updated = existing.filter(q => q.id !== id);
  localStorage.setItem(getUserKey(QUESTIONS_KEY, userId), JSON.stringify(updated));
};

// --- ADMIN / GLOBAL BANK START ---
export const saveAdminQuestion = (question: Question): void => {
  const data = localStorage.getItem(ADMIN_QUESTION_BANK_KEY);
  const bank: Question[] = data ? JSON.parse(data) : [];
  bank.unshift(question); // Add to top
  localStorage.setItem(ADMIN_QUESTION_BANK_KEY, JSON.stringify(bank));
};

export const getAdminQuestions = (): Question[] => {
  const data = localStorage.getItem(ADMIN_QUESTION_BANK_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateAdminQuestionStatus = (id: string, status: 'APPROVED' | 'REJECTED'): void => {
  const questions = getAdminQuestions();
  const index = questions.findIndex(q => q.id === id);
  if (index !== -1) {
    questions[index].moderationStatus = status;
    localStorage.setItem(ADMIN_QUESTION_BANK_KEY, JSON.stringify(questions));
  }
};

// Mock Global Stats for Admin Dashboard
export const getGlobalStats = () => {
  return {
    totalUsers: 12450,
    activeExams: Object.keys(ExamType).length,
    totalQuestions: 85000 + getAdminQuestions().length,
    revenue: 450000,
    trafficData: [
      { name: 'Mon', visits: 4000 },
      { name: 'Tue', visits: 3000 },
      { name: 'Wed', visits: 2000 },
      { name: 'Thu', visits: 2780 },
      { name: 'Fri', visits: 1890 },
      { name: 'Sat', visits: 2390 },
      { name: 'Sun', visits: 3490 },
    ],
    revenueData: [
      { name: 'Jan', amount: 12000 },
      { name: 'Feb', amount: 19000 },
      { name: 'Mar', amount: 15000 },
      { name: 'Apr', amount: 22000 },
      { name: 'May', amount: 28000 },
      { name: 'Jun', amount: 35000 },
    ]
  };
};
// --- ADMIN END ---

// --- BOOKMARKS START ---
export const toggleBookmark = (userId: string, question: Question): boolean => {
  // Returns true if added, false if removed
  const key = getUserKey(BOOKMARKS_KEY, userId);
  const data = localStorage.getItem(key);
  const bookmarks: Question[] = data ? JSON.parse(data) : [];
  
  const existingIndex = bookmarks.findIndex(q => q.id === question.id);
  
  if (existingIndex >= 0) {
    // Remove
    bookmarks.splice(existingIndex, 1);
    localStorage.setItem(key, JSON.stringify(bookmarks));
    return false;
  } else {
    // Add (ensure isBookmarked is true)
    bookmarks.push({ ...question, isBookmarked: true });
    localStorage.setItem(key, JSON.stringify(bookmarks));
    return true;
  }
};

export const getBookmarks = (userId: string): Question[] => {
  const data = localStorage.getItem(getUserKey(BOOKMARKS_KEY, userId));
  return data ? JSON.parse(data) : [];
};

export const isQuestionBookmarked = (userId: string, questionId: string): boolean => {
  const bookmarks = getBookmarks(userId);
  return bookmarks.some(q => q.id === questionId);
};
// --- BOOKMARKS END ---

// --- QOTD START ---
export const getStoredQOTD = (userId: string): Question | null => {
  const key = getUserKey(QOTD_KEY, userId);
  const data = localStorage.getItem(key);
  if (!data) return null;
  
  const stored = JSON.parse(data);
  const today = new Date().toISOString().split('T')[0];
  
  // Check if date matches today
  if (stored.date === today) {
    return stored.question;
  }
  return null;
};

export const saveQOTD = (userId: string, question: Question) => {
  const key = getUserKey(QOTD_KEY, userId);
  const today = new Date().toISOString().split('T')[0];
  const payload = { date: today, question };
  localStorage.setItem(key, JSON.stringify(payload));
};
// --- QOTD END ---

// Stats Storage
export const getStats = (userId?: string): UserStats => {
  if (!userId) return { ...INITIAL_STATS };
  
  const data = localStorage.getItem(getUserKey(STATS_KEY, userId));
  const stats = data ? JSON.parse(data) : { ...INITIAL_STATS };
  
  if (!stats.examPerformance) stats.examPerformance = {};
  if (!stats.subjectPerformance) stats.subjectPerformance = {};
  
  return stats;
};

export const updateStats = (userId: string, isCorrect: boolean, subject: string, examType: string): void => {
  const stats = getStats(userId);
  const today = new Date().toISOString().split('T')[0];

  // Global Stats
  stats.totalAttempted += 1;
  if (isCorrect) stats.totalCorrect += 1;

  // Streak Logic
  if (stats.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (stats.lastActiveDate === yesterdayStr) {
      stats.streakCurrent += 1;
    } else {
      stats.streakCurrent = 1;
    }
    stats.lastActiveDate = today;
  }
  
  if (stats.streakCurrent > stats.streakMax) {
    stats.streakMax = stats.streakCurrent;
  }

  // Subject Performance
  if (!stats.subjectPerformance[subject]) {
    stats.subjectPerformance[subject] = { correct: 0, total: 0 };
  }
  stats.subjectPerformance[subject].total += 1;
  if (isCorrect) {
    stats.subjectPerformance[subject].correct += 1;
  }

  // Exam Specific Performance
  if (!stats.examPerformance) {
    stats.examPerformance = {};
  }
  
  if (!stats.examPerformance[examType]) {
    stats.examPerformance[examType] = {
      totalAttempted: 0,
      totalCorrect: 0,
      subjectPerformance: {}
    };
  }

  const examStats = stats.examPerformance[examType];
  examStats.totalAttempted += 1;
  if (isCorrect) examStats.totalCorrect += 1;

  if (!examStats.subjectPerformance[subject]) {
    examStats.subjectPerformance[subject] = { correct: 0, total: 0 };
  }
  examStats.subjectPerformance[subject].total += 1;
  if (isCorrect) examStats.subjectPerformance[subject].correct += 1;

  localStorage.setItem(getUserKey(STATS_KEY, userId), JSON.stringify(stats));
};

// Exam Result History Storage
export const saveExamResult = (userId: string, result: ExamResult): void => {
  const key = getUserKey(RESULTS_KEY, userId);
  const existingData = localStorage.getItem(key);
  const history: ExamResult[] = existingData ? JSON.parse(existingData) : [];
  history.push(result);
  if (history.length > 20) history.shift();
  localStorage.setItem(key, JSON.stringify(history));
};

export const getExamHistory = (userId: string): ExamResult[] => {
  const key = getUserKey(RESULTS_KEY, userId);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Practice Session Persistence
export interface SavedPracticeSession {
  queue: Question[];
  currentIndex: number;
  config: { mode: 'finite' | 'endless'; subject: string };
  timestamp: number;
}

export const savePracticeSession = (userId: string, session: SavedPracticeSession): void => {
  localStorage.setItem(getUserKey(PRACTICE_SESSION_KEY, userId), JSON.stringify(session));
};

export const getPracticeSession = (userId: string): SavedPracticeSession | null => {
  const data = localStorage.getItem(getUserKey(PRACTICE_SESSION_KEY, userId));
  if (!data) return null;
  const session: SavedPracticeSession = JSON.parse(data);
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
    clearPracticeSession(userId);
    return null;
  }
  return session;
};

export const clearPracticeSession = (userId: string): void => {
  localStorage.removeItem(getUserKey(PRACTICE_SESSION_KEY, userId));
};

// Preferences Storage
interface UserPrefs {
  selectedExam: ExamType | null;
  showTimer: boolean;
  hasSeenTutorial: boolean;
  darkMode: boolean;
  language: 'en' | 'hi';
  theme: string;
}

const DEFAULT_PREFS: UserPrefs = {
  selectedExam: null,
  showTimer: true,
  hasSeenTutorial: false,
  darkMode: false,
  language: 'en',
  theme: 'Ocean Blue'
};

export const saveUserPref = (userId: string, newPrefs: Partial<UserPrefs>): void => {
  const current = getUserPref(userId);
  const updated = { ...current, ...newPrefs };
  localStorage.setItem(getUserKey(PREFS_KEY, userId), JSON.stringify(updated));
};

export const getUserPref = (userId: string): UserPrefs => {
  const data = localStorage.getItem(getUserKey(PREFS_KEY, userId));
  return data ? { ...DEFAULT_PREFS, ...JSON.parse(data) } : { ...DEFAULT_PREFS };
};
