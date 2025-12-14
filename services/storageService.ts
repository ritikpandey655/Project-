
import { db } from "../src/firebaseConfig";
import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, 
  query, where, limit, addDoc, orderBy 
} from "firebase/firestore";
import { Question, UserStats, User, ExamResult, QuestionSource, QuestionPaper, LeaderboardEntry, NewsItem, Transaction, SyllabusItem } from '../types';
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

export interface SystemLog {
  id: string;
  type: 'ERROR' | 'INFO' | 'API_FAIL';
  message: string;
  details?: string;
  timestamp: number;
}

export const logSystemError = async (type: 'ERROR' | 'API_FAIL' | 'INFO', message: string, details?: any) => {
  try {
    // Fire and forget log
    addDoc(collection(db, "system_logs"), {
      type,
      message,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Failed to write to system log", e);
  }
};

export const getSystemLogs = async (): Promise<SystemLog[]> => {
  try {
    // Get last 50 logs
    const q = query(collection(db, "system_logs"), orderBy("timestamp", "desc"), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog));
  } catch (e) {
    console.error("Failed to fetch logs", e);
    return [];
  }
};

export const clearSystemLogs = async () => {
  try {
    const q = query(collection(db, "system_logs"), limit(100));
    const snapshot = await getDocs(q);
    const batch = [];
    for (const doc of snapshot.docs) {
      deleteDoc(doc.ref);
    }
  } catch (e) {}
};

// --- USER MANAGEMENT ---

export const saveUser = async (user: User): Promise<void> => {
  try {
    await setDoc(doc(db, "users", user.id), user, { merge: true });
  } catch (e) {
    console.error("Error saving user:", e);
  }
};

export const updateUserActivity = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "users", userId), {
      lastSeen: Date.now()
    });
  } catch (e) {
    // Fail silently
  }
};

export const updateUserSession = async (userId: string, sessionId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "users", userId), {
      sessionId: sessionId
    });
  } catch (e) {
    // If update fails (e.g. user doc doesn't exist yet), setDoc will handle it
    await setDoc(doc(db, "users", userId), { sessionId: sessionId }, { merge: true });
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    if (docSnap.exists()) {
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
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map((doc) => doc.data() as User);
  } catch (e: any) {
    // If permission denied (common in default Firestore rules), return mock data for Admin UI
    if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
        console.warn("⚠️ Firestore: Access to 'users' collection denied. Returning mock users for Admin Dashboard.");
        return [
            { id: 'mock-1', name: 'Demo User (Mock)', email: 'demo@example.com', isPro: false, isAdmin: false },
            { id: 'mock-2', name: 'Admin (Mock)', email: 'admin@pyqverse.in', isPro: true, isAdmin: true }
        ];
    }
    console.error("getAllUsers Failed:", e);
    return [];
  }
};

export const removeUser = async (userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (e) {
    console.error("Error removing user:", e);
  }
};

export const toggleUserPro = async (userId: string, currentStatus: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, "users", userId), { isPro: !currentStatus });
  } catch (e) {}
};

// --- USER QUESTIONS (Notebook) ---

export const saveUserQuestion = async (userId: string, question: Question): Promise<void> => {
  try {
    await setDoc(doc(db, "users", userId, "questions", question.id), question);
  } catch (e) {
    console.error("Error saving question:", e);
  }
};

export const getUserQuestions = async (userId: string): Promise<Question[]> => {
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "questions"));
    return snapshot.docs.map((doc) => doc.data() as Question);
  } catch (e) {
    console.error("Error fetching questions:", e);
    return [];
  }
};

// --- ADMIN / GLOBAL BANK ---

export const saveAdminQuestion = async (question: Question): Promise<void> => {
  try {
    await setDoc(doc(db, "global_questions", question.id), question);
  } catch (e) {
    console.error("Error uploading admin question:", e);
  }
};

export const deleteGlobalQuestion = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "global_questions", id));
  } catch (e) {}
};

export const getOfficialQuestions = async (exam: string, subject: string, count: number): Promise<Question[]> => {
  try {
    // Basic query
    let constraints = [
      where("examType", "==", exam),
      where("moderationStatus", "==", "APPROVED"),
      limit(50)
    ];

    if (subject !== 'Mixed') {
      constraints.push(where("subject", "==", subject));
    }

    const q = query(collection(db, "global_questions"), ...constraints);
    const snapshot = await getDocs(q);
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
    const snapshot = await getDocs(collection(db, "global_questions"));
    return snapshot.docs.map((d) => d.data() as Question);
  } catch (e: any) {
    if (e.code === 'permission-denied') return [];
    console.error("Error fetching admin questions:", e);
    return [];
  }
};

export const updateAdminQuestionStatus = async (id: string, status: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "global_questions", id), { moderationStatus: status });
  } catch (e) {
    console.error("Error updating question status:", e);
  }
};

// --- ADMIN / SYLLABUS ---

export const saveSyllabus = async (data: SyllabusItem): Promise<void> => {
  try {
    await setDoc(doc(db, "syllabus", `${data.examType}_${data.subject}`), data);
  } catch (e) {
    console.error("Error saving syllabus:", e);
    throw e;
  }
};

export const getSyllabus = async (exam: string, subject: string): Promise<SyllabusItem | null> => {
  try {
    const docSnap = await getDoc(doc(db, "syllabus", `${exam}_${subject}`));
    if (docSnap.exists()) return docSnap.data() as SyllabusItem;
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

// --- DYNAMIC EXAM CONFIG (TANK MODE CACHING) ---

export const saveExamConfig = async (config: Record<string, string[]>): Promise<void> => {
  // Update local cache immediately for speed
  try {
    localStorage.setItem('cached_exam_config', JSON.stringify(config));
  } catch(e) {}

  try {
    await setDoc(doc(db, "settings", "exams"), { config });
  } catch (e) {}
};

export const getExamConfig = async (): Promise<Record<string, string[]>> => {
  try {
    // Try Network First
    const docSnap = await getDoc(doc(db, "settings", "exams"));
    if (docSnap.exists()) {
      const config = docSnap.data()?.config;
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
    const snapshot = await getDocs(collection(db, "transactions"));
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
    await setDoc(doc(db, "transactions", transaction.id), transaction);
  } catch (e) {
    console.error("Error saving transaction:", e);
  }
};

// --- NEWS & CURRENT AFFAIRS ---

export const saveAdminNews = async (news: NewsItem): Promise<void> => {
  try {
    await setDoc(doc(db, "global_news", news.id), news);
  } catch (e) {
    console.error("Error saving news:", e);
  }
};

export const getOfficialNews = async (category?: string, month?: string, year?: number): Promise<NewsItem[]> => {
  try {
    let constraints = [];
    if (category && category !== 'All') {
      constraints.push(where("category", "==", category));
    }
    
    const q = query(collection(db, "global_news"), ...constraints);
    const snapshot = await getDocs(q);
    const allNews = snapshot.docs.map((d) => d.data() as NewsItem);
    
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
    const bookmarkRef = doc(db, "users", userId, "bookmarks", question.id);
    const docSnap = await getDoc(bookmarkRef);
    
    if (docSnap.exists()) {
      await deleteDoc(bookmarkRef);
      return false; // Removed
    } else {
      await setDoc(bookmarkRef, { ...question, isBookmarked: true });
      return true; // Added
    }
  } catch (e) {
    console.error("Error toggling bookmark:", e);
    return false;
  }
};

export const getBookmarks = async (userId: string): Promise<Question[]> => {
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "bookmarks"));
    return snapshot.docs.map((d) => d.data() as Question);
  } catch (e) {
    return [];
  }
};

// --- STATS & PREFS ---

export const getStats = async (userId: string): Promise<UserStats> => {
  try {
    const docRef = doc(db, "users", userId, "data", "stats");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data() as UserStats;
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

    const statsRef = doc(db, "users", userId, "data", "stats");
    await setDoc(statsRef, stats);
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
    const docRef = doc(db, "users", userId, "data", "prefs");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { ...DEFAULT_PREFS, ...docSnap.data() };
    return { ...DEFAULT_PREFS };
  } catch (e) {
    return { ...DEFAULT_PREFS };
  }
};

export const saveUserPref = async (userId: string, newPrefs: Partial<UserPrefs>): Promise<void> => {
  try {
    const prefRef = doc(db, "users", userId, "data", "prefs");
    await setDoc(prefRef, newPrefs, { merge: true });
  } catch (e) {
    console.error("Pref save failed", e);
  }
};

// --- QOTD & OFFLINE ---

export const getStoredQOTD = async (userId: string): Promise<Question | null> => {
  // QOTD is usually global, but if stored per user:
  try {
    const docRef = doc(db, "users", userId, "data", "qotd");
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()) {
       const data = docSnap.data();
       const today = new Date().toISOString().split('T')[0];
       if(data?.date === today) return data.question;
    }
    return null;
  } catch (e) { return null; }
};

export const saveQOTD = async (userId: string, question: Question) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await setDoc(doc(db, "users", userId, "data", "qotd"), { date: today, question });
  } catch (e) {}
};

export const saveOfflinePaper = async (userId: string, paper: QuestionPaper): Promise<void> => {
  try {
    await setDoc(doc(db, "users", userId, "offline_papers", paper.id), paper);
  } catch (e) {}
};

export const getOfflinePapers = async (userId: string): Promise<QuestionPaper[]> => {
  try {
    const snapshot = await getDocs(collection(db, "users", userId, "offline_papers"));
    return snapshot.docs.map((d) => d.data() as QuestionPaper);
  } catch (e) { return []; }
};

export const removeOfflinePaper = async (userId: string, paperId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "users", userId, "offline_papers", paperId));
  } catch (e) {}
};

// --- HISTORY ---

export const saveExamResult = async (userId: string, result: ExamResult): Promise<void> => {
  try {
    await addDoc(collection(db, "users", userId, "history"), result);
  } catch (e) {}
};

export const getExamHistory = async (userId: string): Promise<ExamResult[]> => {
  try {
    const q = query(collection(db, "users", userId, "history"), limit(20));
    const snapshot = await getDocs(q);
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
    await addDoc(collection(db, "feedback"), {
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
