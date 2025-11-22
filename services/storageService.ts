
import { Question, UserStats, ExamType, User } from '../types';

const QUESTIONS_KEY = 'exam_master_questions';
const STATS_KEY = 'exam_master_stats';
const PREFS_KEY = 'exam_master_prefs';
const USER_KEY = 'exam_master_user';

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
// Keeps track of the currently logged-in user session
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