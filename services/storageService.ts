
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  orderBy,
  limit,
  Timestamp 
} from "firebase/firestore";
import { db } from "../src/firebaseConfig";
import { Question, UserStats, User, ExamResult, QuestionSource, QuestionPaper, LeaderboardEntry, NewsItem, Transaction } from '../types';
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

// --- USER MANAGEMENT ---

export const saveUser = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, "users", user.id);
    await setDoc(userRef, user, { merge: true });
  } catch (e) {
    console.error("Error saving user:", e);
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  } catch (e) {
    console.error("Error getting user:", e);
    return null;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(doc => doc.data() as User);
  } catch (e) {
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
    const colRef = collection(db, "users", userId, "questions");
    await setDoc(doc(colRef, question.id), question);
  } catch (e) {
    console.error("Error saving question:", e);
  }
};

export const getUserQuestions = async (userId: string): Promise<Question[]> => {
  try {
    const colRef = collection(db, "users", userId, "questions");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => doc.data() as Question);
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
    let q = query(
      collection(db, "global_questions"), 
      where("examType", "==", exam),
      where("moderationStatus", "==", "APPROVED"),
      limit(50) 
    );

    if (subject !== 'Mixed') {
      q = query(q, where("subject", "==", subject));
    }

    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(d => d.data() as Question);
    
    // Shuffle client-side for randomness since Firestore random sort is complex
    return all.sort(() => 0.5 - Math.random()).slice(0, count);
  } catch (e) {
    console.error("Error fetching official questions:", e);
    return [];
  }
};

export const getAdminQuestions = async (): Promise<Question[]> => {
  try {
    const snapshot = await getDocs(collection(db, "global_questions"));
    return snapshot.docs.map(d => d.data() as Question);
  } catch (e) {
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

export const getGlobalStats = async () => {
  try {
    const qSnap = await getDocs(collection(db, "global_questions"));
    const uSnap = await getDocs(collection(db, "users"));
    return {
       totalQuestions: qSnap.size,
       totalUsers: uSnap.size,
       activeUsers: Math.floor(uSnap.size * 0.7) // Mock active count
    };
  } catch(e) {
    return { totalQuestions: 0, totalUsers: 0, activeUsers: 0 };
  }
};

// --- DYNAMIC EXAM CONFIG ---

export const saveExamConfig = async (config: Record<string, string[]>): Promise<void> => {
  try {
    await setDoc(doc(db, "settings", "exams"), { config });
  } catch (e) {}
};

export const getExamConfig = async (): Promise<Record<string, string[]>> => {
  try {
    const docSnap = await getDoc(doc(db, "settings", "exams"));
    if (docSnap.exists()) {
      return docSnap.data().config;
    }
    return EXAM_SUBJECTS as unknown as Record<string, string[]>;
  } catch (e) {
    return EXAM_SUBJECTS as unknown as Record<string, string[]>;
  }
};

// --- TRANSACTIONS ---

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const snapshot = await getDocs(collection(db, "transactions"));
    return snapshot.docs.map(d => d.data() as Transaction);
  } catch (e) {
    // Return mock if empty
    return [
      { id: 'tx-1', userId: 'u1', userName: 'Rohan', amount: 199, planId: 'monthly', status: 'SUCCESS', date: Date.now() - 100000, method: 'UPI' },
      { id: 'tx-2', userId: 'u2', userName: 'Anjali', amount: 1499, planId: 'yearly', status: 'SUCCESS', date: Date.now() - 500000, method: 'Card' },
      { id: 'tx-3', userId: 'u3', userName: 'Rahul', amount: 199, planId: 'monthly', status: 'FAILED', date: Date.now() - 900000, method: 'NetBanking' }
    ];
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
    let q = query(collection(db, "global_news"));
    
    if (category && category !== 'All') {
      q = query(q, where("category", "==", category));
    }
    
    const snapshot = await getDocs(q);
    const allNews = snapshot.docs.map(d => d.data() as NewsItem);
    
    return allNews.filter(n => {
       if (!month || !year) return true;
       return n.date.includes(month) && n.date.includes(year.toString());
    });
  } catch (e) {
    console.error("Error fetching news:", e);
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
    const colRef = collection(db, "users", userId, "bookmarks");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => d.data() as Question);
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
       if(data.date === today) return data.question;
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
    return snapshot.docs.map(d => d.data() as QuestionPaper);
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
    const snapshot = await getDocs(query(collection(db, "users", userId, "history"), limit(20)));
    return snapshot.docs.map(d => d.data() as ExamResult);
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
