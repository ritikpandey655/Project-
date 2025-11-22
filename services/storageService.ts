
import { Question, UserStats, ExamType, User, ExamResult } from '../types';

const QUESTIONS_KEY = 'exam_master_questions';
const STATS_KEY = 'exam_master_stats';
const PREFS_KEY = 'exam_master_prefs';
const USER_KEY = 'exam_master_user';
const RESULTS_KEY = 'exam_master_results';
const PRACTICE_SESSION_KEY = 'exam_master_practice_session';

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

// Question Storage
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

// Stats Storage
export const getStats = (userId?: string): UserStats => {
  if (!userId) return { ...INITIAL_STATS };
  
  const data = localStorage.getItem(getUserKey(STATS_KEY, userId));
  const stats = data ? JSON.parse(data) : { ...INITIAL_STATS };
  
  // Ensure examPerformance exists for migration
  if (!stats.examPerformance) stats.examPerformance = {};
  // Ensure subjectPerformance exists
  if (!stats.subjectPerformance) stats.subjectPerformance = {};
  
  return stats;
};

export const updateStats = (userId: string, isCorrect: boolean, subject: string, examType: string): void => {
  const stats = getStats(userId);
  const today = new Date().toISOString().split('T')[0];

  // Global Stats
  stats.totalAttempted += 1;
  if (isCorrect) stats.totalCorrect += 1;

  // Streak Logic (Global)
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

  // Subject Performance (Global)
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
  
  // Append new result
  history.push(result);
  
  // Keep only last 20 results to save space
  if (history.length > 20) {
    history.shift();
  }
  
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
  // Check if session is stale (e.g., older than 24 hours)
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
}

const DEFAULT_PREFS: UserPrefs = {
  selectedExam: null,
  showTimer: true,
  hasSeenTutorial: false,
  darkMode: false
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
