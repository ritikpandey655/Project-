
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

/**
 * Log an error or system event to Firestore for admin monitoring.
 */
export const logSystemError = async (type: 'ERROR' | 'API_FAIL' | 'INFO', message: string, details?: any) => {
  try {
    // Ensure details is never undefined
    const safeDetails = details === undefined ? null : (typeof details === 'object' ? JSON.stringify(details) : details);

    // Fire and forget log
    await db.collection("system_logs").add({
      type: type || 'ERROR',
      message: message || 'Unknown Error',
      details: safeDetails,
      timestamp: Date.now()
    });
  } catch (e) {
    // Fail silently in production or log to console
    console.warn("Failed to write to system log", e);
  }
};

/**
 * Fetches recent system logs for the Admin Dashboard.
 */
export const getSystemLogs = async (): Promise<SystemLog[]> => {
  try {
    // Get last 50 logs
    const snapshot = await db.collection("system_logs")
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as SystemLog));
  } catch (e: any) {
    // Suppress permission-denied errors to avoid console spam for non-admins
    if (e.code !== 'permission-denied') {
        console.error("Failed to fetch logs", e);
    }
    return [];
  }
};

/**
 * Clears old system logs to keep Firestore costs low.
 */
export const clearSystemLogs = async () => {
  try {
    const snapshot = await db.collection("system_logs").limit(100).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (e) {}
};

// --- USER MANAGEMENT ---

export const saveUser = async (user: User): Promise<void> => {
  try {
    await db.collection("users").doc(user.id).set(user, { merge: true });
  } catch (e) {
    console.error("Error saving user:", e);
  }
};

export const updateUserActivity = async (userId: string): Promise<void> => {
  try {
    await db.collection("users").doc(userId).update({
      lastSeen: Date.now()
    });
  } catch (e) {
    // Fail silently
  }
};

export const updateUserSession = async (userId: string, sessionId: string): Promise<void> => {
  try {
    await db.collection("users").doc(userId).update({
      sessionId: sessionId
    });
  } catch (e) {
    // If update fails (e.g. user doc doesn't exist yet), setDoc will handle it
    await db.collection("users").doc(userId).set({ sessionId: sessionId }, { merge: true });
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const docSnap = await db.collection("users").doc(userId).get();
    if (docSnap.exists) {
      return docSnap.data() as User;
    }
    return null;
  } catch (e) {
    console.warn("Error getting user profile (Permission/Network issue):", e);
    return null; 
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map((doc) => doc.data() as User);
  } catch (e: any) {
    // If permission denied (common in default Firestore rules), return mock data for Admin UI
    if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
        console.warn("⚠️ Firestore: Access to 'users' collection denied. Returning mock users for Admin Dashboard.");
        return [
            { id: 'mock-1', name: 'Demo User (Mock)', email: 'demo@example.com', isPro: false, isAdmin: false } as User,
            { id: 'mock-2', name: 'Admin (Mock)', email: 'admin@pyqverse.in', isPro: true, isAdmin: true } as User
        ];
    }
    console.error("getAllUsers Failed:", e);
    return [];
  }
};

export const removeUser = async (userId: string): Promise<void> => {
  try {
    await db.collection("users").doc(userId).delete();
  } catch (e) {
    console.error("Error removing user:", e);
  }
};

export const toggleUserPro = async (userId: string, currentStatus: boolean): Promise<void> => {
  try {
    await db.collection("users").doc(userId).update({ isPro: !currentStatus });
  } catch (e) {}
};

// --- USER QUESTIONS (Notebook) ---

export const saveUserQuestion = async (userId: string, question: Question): Promise<void> => {
  try {
    await db.collection("users").doc(userId).collection("questions").doc(question.id).set(question);
  } catch (e) {
    console.error("Error saving question:", e);
  }
};

export const getUserQuestions = async (userId: string): Promise<Question[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("questions").get();
    return snapshot.docs.map((doc) => doc.data() as Question);
  } catch (e) {
    console.error("Error fetching questions:", e);
    return [];
  }
};

// --- ADMIN / GLOBAL BANK ---

export const saveAdminQuestion = async (question: Question): Promise<void> => {
  try {
    await db.collection("global_questions").doc(question.id).set(question);
  } catch (e) {
    console.error("Error uploading admin question:", e);
  }
};

export const deleteGlobalQuestion = async (id: string): Promise<void> => {
  try {
    await db.collection("global_questions").doc(id).delete();
  } catch (e) {}
};

export const getOfficialQuestions = async (exam: string, subject: string, count: number): Promise<Question[]> => {
  try {
    let q = db.collection("global_questions")
        .where("examType", "==", exam)
        .where("moderationStatus", "==", "APPROVED");

    if (subject !== 'Mixed') {
      q = q.where("subject", "==", subject);
    }
    
    // Note: limit is applied, but client-side shuffle happens after
    q = q.limit(50);

    const snapshot = await q.get();
    const all = snapshot.docs.map((d) => d.data() as Question);
    
    // Shuffle client-side for randomness since Firestore random sort is complex
    return all.sort(() => 0.5 - Math.random()).slice(0, count);
  } catch (e) {
    // Fail silently or mock
    return [];
  }
};

export const getAdminQuestions = async (): Promise<Question[]> => {
  try {
    const snapshot = await db.collection("global_questions").get();
    return snapshot.docs.map((d) => d.data() as Question);
  } catch (e: any) {
    if (e.code === 'permission-denied') return [];
    console.error("Error fetching admin questions:", e);
    return [];
  }
};

export const updateAdminQuestionStatus = async (id: string, status: string): Promise<void> => {
  try {
    await db.collection("global_questions").doc(id).update({ moderationStatus: status });
  } catch (e) {
    console.error("Error updating question status:", e);
  }
};

// --- ADMIN / SYLLABUS ---

export const saveSyllabus = async (data: SyllabusItem): Promise<void> => {
  try {
    await db.collection("syllabus").doc(`${data.examType}_${data.subject}`).set(data);
  } catch (e) {
    console.error("Error saving syllabus:", e);
    throw e;
  }
};

export const getSyllabus = async (exam: string, subject: string): Promise<SyllabusItem | null> => {
  try {
    const docSnap = await db.collection("syllabus").doc(`${exam}_${subject}`).get();
    if (docSnap.exists) return docSnap.data() as SyllabusItem;
    return null;
  } catch (e) {
    return null;
  }
};

export const getGlobalStats = async () => {
  try {
    // Note: Counting documents in Firestore can be expensive or restricted
    // We use a safe fallback here
    return {
       totalQuestions: 0,
       totalUsers: 0,
       activeUsers: 0
    };
  } catch(e) {
    console.error("Global Stats Failed:", e);
    return { totalQuestions: 0, totalUsers: 0, activeUsers: 0 };
  }
};

// --- DYNAMIC CONFIG & SYSTEM SETTINGS ---

export const saveSystemConfig = async (config: { aiProvider: 'gemini' | 'groq', modelName?: string }): Promise<void> => {
  try {
    localStorage.setItem('system_config', JSON.stringify(config));
    await db.collection("settings").doc("system").set(config, { merge: true });
  } catch (e) {
    console.error("Failed to save system config", e);
  }
};

export const getSystemConfig = async (): Promise<{ aiProvider: 'gemini' | 'groq', modelName?: string }> => {
  try {
    // 1. Try local storage for instant access
    const cached = localStorage.getItem('system_config');
    if (cached) {
       // Fire off async fetch to update cache, but return cached immediately
       db.collection("settings").doc("system").get().then(snap => {
          if (snap.exists) localStorage.setItem('system_config', JSON.stringify(snap.data()));
       });
       return JSON.parse(cached);
    }

    // 2. Fetch from DB
    const docSnap = await db.collection("settings").doc("system").get();
    if (docSnap.exists) {
      const data = docSnap.data() as any;
      localStorage.setItem('system_config', JSON.stringify(data));
      return data;
    }
  } catch (e) {
    // Ignore offline errors
  }
  
  // Default to Gemini if nothing found
  return { aiProvider: 'gemini' };
};

export const saveExamConfig = async (config: Record<string, string[]>): Promise<void> => {
  // Update local cache immediately for speed
  try {
    localStorage.setItem('cached_exam_config', JSON.stringify(config));
  } catch(e) {}

  try {
    await db.collection("settings").doc("exams").set({ config });
  } catch (e) {}
};

export const getExamConfig = async (): Promise<Record<string, string[]>> => {
  try {
    // Try Network First
    const docSnap = await db.collection("settings").doc("exams").get();
    if (docSnap.exists) {
      const data = docSnap.data() as any;
      const config = data?.config;
      // Update Cache
      localStorage.setItem('cached_exam_config', JSON.stringify(config));
      return config;
    }
  } catch (e) {
    // Fail silently to cache
  }

  // Fallback to Cache
  try {
    const cached = localStorage.getItem('cached_exam_config');
    if (cached) return JSON.parse(cached);
  } catch(e) {}

  // Final Fallback
  return EXAM_SUBJECTS as unknown as Record<string, string[]>;
};

// --- TRANSACTIONS ---

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const snapshot = await db.collection("transactions").get();
    return snapshot.docs.map((d) => d.data() as Transaction);
  } catch (e) {
    // Return mock if empty or permission failed
    return [
      { id: 'tx-1', userId: 'u1', userName: 'Rohan', amount: 199, planId: 'monthly', status: 'SUCCESS', date: Date.now() - 100000, method: 'UPI' },
      { id: 'tx-2', userId: 'u2', userName: 'Anjali', amount: 1499, planId: 'yearly', status: 'SUCCESS', date: Date.now() - 500000, method: 'Card' },
      { id: 'tx-3', userId: 'u3', userName: 'Rahul', amount: 199, planId: 'monthly', status: 'FAILED', date: Date.now() - 900000, method: 'NetBanking' }
    ];
  }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
  try {
    await db.collection("transactions").doc(transaction.id).set(transaction);
  } catch (e) {
    console.error("Error saving transaction:", e);
  }
};

// --- NEWS & CURRENT AFFAIRS ---

export const saveAdminNews = async (news: NewsItem): Promise<void> => {
  try {
    await db.collection("global_news").doc(news.id).set(news);
  } catch (e) {
    console.error("Error saving news:", e);
  }
};

export const getOfficialNews = async (category?: string, month?: string, year?: number): Promise<NewsItem[]> => {
  try {
    let q = db.collection("global_news");
    
    // Note: If reusing 'q', check types carefully. Here we just chain if needed, but Firestore v8 query chaining:
    // let query = db.collection(...); if(x) query = query.where(...);
    // Since 'q' above is collection ref (which is a query), this works.
    let queryRef: any = q;

    if (category && category !== 'All') {
      queryRef = queryRef.where("category", "==", category);
    }
    
    const snapshot = await queryRef.get();
    const allNews = snapshot.docs.map((d: any) => d.data() as NewsItem);
    
    return allNews.filter((n: NewsItem) => {
       if (!month || !year) return true;
       return n.date.includes(month) && n.date.includes(year.toString());
    });
  } catch (e) {
    // console.error("Error fetching news:", e);
    return [];
  }
};

// --- BOOKMARKS ---

export const toggleBookmark = async (userId: string, question: Question): Promise<boolean> => {
  try {
    const bookmarkRef = db.collection("users").doc(userId).collection("bookmarks").doc(question.id);
    const docSnap = await bookmarkRef.get();
    
    if (docSnap.exists) {
      await bookmarkRef.delete();
      return false; // Removed
    } else {
      await bookmarkRef.set({ ...question, isBookmarked: true });
      return true; // Added
    }
  } catch (e) {
    console.error("Error toggling bookmark:", e);
    return false;
  }
};

export const getBookmarks = async (userId: string): Promise<Question[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("bookmarks").get();
    return snapshot.docs.map((d) => d.data() as Question);
  } catch (e) {
    return [];
  }
};

// --- STATS & PREFS ---

export const getStats = async (userId: string): Promise<UserStats> => {
  try {
    const docRef = db.collection("users").doc(userId).collection("data").doc("stats");
    const docSnap = await docRef.get();
    if (docSnap.exists) return docSnap.data() as UserStats;
    return { ...INITIAL_STATS };
  } catch (e) {
    return { ...INITIAL_STATS };
  }
};

export const updateStats = async (userId: string, isCorrect: boolean, subject: string, examType: string): Promise<void> => {
  try {
    const stats = await getStats(userId);
    const today = new Date().toISOString().split('T')[0];

    // Update Logic (Same as before)
    stats.totalAttempted += 1;
    if (isCorrect) stats.totalCorrect += 1;

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
    if (stats.streakCurrent > stats.streakMax) stats.streakMax = stats.streakCurrent;

    // Deep merge protection
    if (!stats.subjectPerformance) stats.subjectPerformance = {};
    if (!stats.subjectPerformance[subject]) stats.subjectPerformance[subject] = { correct: 0, total: 0 };
    stats.subjectPerformance[subject].total += 1;
    if (isCorrect) stats.subjectPerformance[subject].correct += 1;

    const statsRef = db.collection("users").doc(userId).collection("data").doc("stats");
    await statsRef.set(stats);
  } catch (e) {
    console.error("Stats update failed", e);
  }
};

// --- PREFERENCES ---

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
  theme: 'PYQverse Prime'
};

export const getUserPref = async (userId: string): Promise<UserPrefs> => {
  try {
    const docRef = db.collection("users").doc(userId).collection("data").doc("prefs");
    const docSnap = await docRef.get();
    if (docSnap.exists) return { ...DEFAULT_PREFS, ...(docSnap.data() as any) };
    return { ...DEFAULT_PREFS };
  } catch (e) {
    return { ...DEFAULT_PREFS };
  }
};

export const saveUserPref = async (userId: string, newPrefs: Partial<UserPrefs>): Promise<void> => {
  try {
    const prefRef = db.collection("users").doc(userId).collection("data").doc("prefs");
    await prefRef.set(newPrefs, { merge: true });
  } catch (e) {
    console.error("Pref save failed", e);
  }
};

// --- QOTD & OFFLINE ---

export const getStoredQOTD = async (userId: string): Promise<Question | null> => {
  // QOTD is usually global, but if stored per user:
  try {
    const docRef = db.collection("users").doc(userId).collection("data").doc("qotd");
    const docSnap = await docRef.get();
    if(docSnap.exists) {
       const data = docSnap.data() as any;
       const today = new Date().toISOString().split('T')[0];
       if(data?.date === today) return data.question;
    }
    return null;
  } catch (e) { return null; }
};

export const saveQOTD = async (userId: string, question: Question) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await db.collection("users").doc(userId).collection("data").doc("qotd").set({ date: today, question });
  } catch (e) {}
};

export const saveOfflinePaper = async (userId: string, paper: QuestionPaper): Promise<void> => {
  try {
    await db.collection("users").doc(userId).collection("offline_papers").doc(paper.id).set(paper);
  } catch (e) {}
};

export const getOfflinePapers = async (userId: string): Promise<QuestionPaper[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("offline_papers").get();
    return snapshot.docs.map((d) => d.data() as QuestionPaper);
  } catch (e) { return []; }
};

export const removeOfflinePaper = async (userId: string, paperId: string): Promise<void> => {
  try {
    await db.collection("users").doc(userId).collection("offline_papers").doc(paperId).delete();
  } catch (e) {}
};

// --- HISTORY ---

export const saveExamResult = async (userId: string, result: ExamResult): Promise<void> => {
  try {
    await db.collection("users").doc(userId).collection("history").add(result);
  } catch (e) {}
};

export const getExamHistory = async (userId: string): Promise<ExamResult[]> => {
  try {
    const snapshot = await db.collection("users").doc(userId).collection("history").limit(20).get();
    return snapshot.docs.map((d) => d.data() as ExamResult);
  } catch (e) { return []; }
};

// --- LEADERBOARD ---
export const getLeaderboardData = async (currentUser: User): Promise<LeaderboardEntry[]> => {
  // Simplified: In a real app, query top users by 'xp' field
  // For now, return mock + current user
  return [
    { id: '1', rank: 1, name: 'Aarav Sharma', exam: 'UPSC', score: 9500, isCurrentUser: false },
    { id: '2', rank: 2, name: 'Priya Patel', exam: 'NEET', score: 8200, isCurrentUser: false },
    { id: currentUser.id, rank: 99, name: currentUser.name, exam: 'Your Exam', score: 0, isCurrentUser: true }
  ];
};

// --- FEEDBACK ---
export const saveFeedback = async (userId: string, message: string, email?: string): Promise<void> => {
  try {
    await db.collection("feedback").add({
      userId,
      message,
      email: email || 'Anonymous',
      createdAt: Date.now(),
      status: 'unread'
    });
  } catch (e) {
    console.error("Error saving feedback", e);
  }
};
