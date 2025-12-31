
import { db } from "../src/firebaseConfig";
import { Question, UserStats, User, ExamResult, QuestionSource, QuestionPaper, LeaderboardEntry, NewsItem, Transaction, SyllabusItem, SystemLog } from '../types';
import { ExamType } from '../types';
import { EXAM_SUBJECTS } from '../constants';

export const INITIAL_STATS: UserStats = {
  totalAttempted: 0,
  totalCorrect: 0,
  streakCurrent: 0,
  streakMax: 0,
  lastActiveDate: '',
  subjectPerformance: {},
  examPerformance: {}
};

// --- SYSTEM LOGGING (NEW) ---

export const logSystemError = async (type: 'ERROR' | 'API_FAIL' | 'INFO', message: string, details?: any) => {
  try {
    const safeDetails = details === undefined ? null : (typeof details === 'object' ? JSON.stringify(details) : details);
    await db.collection("system_logs").add({
      type: type || 'ERROR',
      message: message || 'Unknown Error',
      details: safeDetails,
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn("Failed to write to system log", e);
  }
};

export const getSystemLogs = async (): Promise<SystemLog[]> => {
  try {
    const snapshot = await db.collection("system_logs")
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as SystemLog));
  } catch (e: any) {
    if (e.code !== 'permission-denied') console.error("Failed to fetch logs", e);
    return [];
  }
};

export const clearSystemLogs = async () => {
  try {
    const snapshot = await db.collection("system_logs").limit(100).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (e) {}
};

// --- API KEY MANAGEMENT (NEW) ---

export const saveApiKeys = (keys: { gemini?: string; groq?: string }) => {
  if (keys.gemini) localStorage.setItem('custom_gemini_key', keys.gemini);
  if (keys.groq) localStorage.setItem('custom_groq_key', keys.groq);
};

export const getApiKeys = () => {
  return {
    gemini: localStorage.getItem('custom_gemini_key') || "",
    groq: localStorage.getItem('custom_groq_key') || ""
  };
};

// --- USER MANAGEMENT ---

export const saveUser = async (user: User): Promise<void> => {
  try {
    await db.collection("users").doc(user.id).set(user, { merge: true });
  } catch (e) { console.error("Error saving user:", e); }
};

export const updateUserActivity = async (userId: string): Promise<void> => {
  try { await db.collection("users").doc(userId).update({ lastSeen: Date.now() }); } catch (e) {}
};

export const updateUserSession = async (userId: string, sessionId: string): Promise<void> => {
  try {
    await db.collection("users").doc(userId).update({ sessionId: sessionId });
  } catch (e) {
    await db.collection("users").doc(userId).set({ sessionId: sessionId }, { merge: true });
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const docSnap = await db.collection("users").doc(userId).get();
    if (docSnap.exists) return docSnap.data() as User;
    return null;
  } catch (e) { return null; }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map((doc) => doc.data() as User);
  } catch (e: any) {
    if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
        return [
            { id: 'mock-1', name: 'Demo User (Mock)', email: 'demo@example.com', isPro: false, isAdmin: false } as User,
            { id: 'mock-2', name: 'Admin (Mock)', email: 'admin@pyqverse.in', isPro: true, isAdmin: true } as User
        ];
    }
    return [];
  }
};

export const removeUser = async (userId: string): Promise<void> => {
  try { await db.collection("users").doc(userId).delete(); } catch (e) {}
};

export const toggleUserPro = async (userId: string, currentStatus: boolean): Promise<void> => {
  try { await db.collection("users").doc(userId).update({ isPro: !currentStatus }); } catch (e) {}
};

// --- QUESTIONS ---

export const saveUserQuestion = async (userId: string, question: Question): Promise<void> => {
  try { await db.collection("users").doc(userId).collection("questions").doc(question.id).set(question); } catch (e) {}
};

export const getUserQuestions = async (userId: string): Promise<Question[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("questions").get();
    return snapshot.docs.map((doc) => doc.data() as Question);
  } catch (e) { return []; }
};

export const getOfficialQuestions = async (exam: string, subject: string, count: number): Promise<Question[]> => {
  try {
    let q = db.collection("global_questions")
        .where("examType", "==", exam)
        .where("moderationStatus", "==", "APPROVED");
    if (subject !== 'Mixed') q = q.where("subject", "==", subject);
    q = q.limit(50);
    const snapshot = await q.get();
    const all = snapshot.docs.map((d) => d.data() as Question);
    return all.sort(() => 0.5 - Math.random()).slice(0, count);
  } catch (e) { return []; }
};

// --- CONFIG ---

export const saveSystemConfig = async (config: { aiProvider: 'gemini' | 'groq', modelName?: string }): Promise<void> => {
  try {
    localStorage.setItem('system_config', JSON.stringify(config));
    await db.collection("settings").doc("system").set(config, { merge: true });
  } catch (e) {}
};

export const getSystemConfig = async (): Promise<{ aiProvider: 'gemini' | 'groq', modelName?: string }> => {
  try {
    // CRITICAL FIX: Always try to fetch fresh config from Firestore first.
    // This ensures that when Admin switches to 'groq', all users immediately get the new config.
    // Previous behavior (cache-first) caused users to stay on 'gemini' indefinitely, causing 500 errors.
    const docSnap = await db.collection("settings").doc("system").get();
    if (docSnap.exists) {
      const data = docSnap.data() as any;
      localStorage.setItem('system_config', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    // Only use cache if network fails or Firestore is unreachable
    console.warn("Config fetch failed, using cache", e);
    const cached = localStorage.getItem('system_config');
    if (cached) return JSON.parse(cached);
  }
  // Default fallback if everything fails
  return { aiProvider: 'gemini' };
};

export const getExamConfig = async (): Promise<Record<string, string[]>> => {
  try {
    const cached = localStorage.getItem('cached_exam_config');
    if (cached) return JSON.parse(cached);
  } catch(e) {}
  return EXAM_SUBJECTS as unknown as Record<string, string[]>;
};

// --- MISC ---

export const toggleBookmark = async (userId: string, question: Question): Promise<boolean> => {
  try {
    const bookmarkRef = db.collection("users").doc(userId).collection("bookmarks").doc(question.id);
    const docSnap = await bookmarkRef.get();
    if (docSnap.exists) { await bookmarkRef.delete(); return false; } 
    else { await bookmarkRef.set({ ...question, isBookmarked: true }); return true; }
  } catch (e) { return false; }
};

export const getBookmarks = async (userId: string): Promise<Question[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("bookmarks").get();
    return snapshot.docs.map((d) => d.data() as Question);
  } catch (e) { return []; }
};

export const getStats = async (userId: string): Promise<UserStats> => {
  try {
    const docRef = db.collection("users").doc(userId).collection("data").doc("stats");
    const docSnap = await docRef.get();
    if (docSnap.exists) return docSnap.data() as UserStats;
    return { ...INITIAL_STATS };
  } catch (e) { return { ...INITIAL_STATS }; }
};

export const updateStats = async (userId: string, isCorrect: boolean, subject: string, examType: string): Promise<void> => {
  try {
    const stats = await getStats(userId);
    const today = new Date().toISOString().split('T')[0];
    stats.totalAttempted += 1;
    if (isCorrect) stats.totalCorrect += 1;
    if (stats.lastActiveDate !== today) {
      stats.streakCurrent = (stats.lastActiveDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) ? stats.streakCurrent + 1 : 1;
      stats.lastActiveDate = today;
    }
    if (stats.streakCurrent > stats.streakMax) stats.streakMax = stats.streakCurrent;
    if (!stats.subjectPerformance) stats.subjectPerformance = {};
    if (!stats.subjectPerformance[subject]) stats.subjectPerformance[subject] = { correct: 0, total: 0 };
    stats.subjectPerformance[subject].total += 1;
    if (isCorrect) stats.subjectPerformance[subject].correct += 1;
    await db.collection("users").doc(userId).collection("data").doc("stats").set(stats);
  } catch (e) {}
};

export const getUserPref = async (userId: string) => {
  try {
    const docSnap = await db.collection("users").doc(userId).collection("data").doc("prefs").get();
    if (docSnap.exists) return { ...docSnap.data() };
    return {};
  } catch (e) { return {}; }
};

export const saveUserPref = async (userId: string, newPrefs: any) => {
  try { await db.collection("users").doc(userId).collection("data").doc("prefs").set(newPrefs, { merge: true }); } catch (e) {}
};

export const saveOfflinePaper = async (userId: string, paper: QuestionPaper) => {
  try { await db.collection("users").doc(userId).collection("offline_papers").doc(paper.id).set(paper); } catch (e) {}
};

export const getOfflinePapers = async (userId: string): Promise<QuestionPaper[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("offline_papers").get();
    return snapshot.docs.map((d) => d.data() as QuestionPaper);
  } catch (e) { return []; }
};

export const removeOfflinePaper = async (userId: string, paperId: string) => {
  try { await db.collection("users").doc(userId).collection("offline_papers").doc(paperId).delete(); } catch (e) {}
};

export const saveExamResult = async (userId: string, result: ExamResult) => {
  try { await db.collection("users").doc(userId).collection("history").add(result); } catch (e) {}
};

export const getExamHistory = async (userId: string): Promise<ExamResult[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("history").limit(20).get();
    return snapshot.docs.map((d) => d.data() as ExamResult);
  } catch (e) { return []; }
};

export const getLeaderboardData = async (currentUser: User): Promise<LeaderboardEntry[]> => {
  return [
    { id: '1', rank: 1, name: 'Aarav Sharma', exam: 'UPSC', score: 9500, isCurrentUser: false },
    { id: '2', rank: 2, name: 'Priya Patel', exam: 'NEET', score: 8200, isCurrentUser: false },
    { id: currentUser.id, rank: 99, name: currentUser.name, exam: 'Your Exam', score: 0, isCurrentUser: true }
  ];
};
