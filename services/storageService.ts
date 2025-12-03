
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

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const docSnap = await db.collection("users").doc(userId).get();
    if (docSnap.exists) {
      return docSnap.data() as User;
    }
    return null;
  } catch (e) {
    // This catches "Missing or insufficient permissions" which happens
    // when a user is logged in but not yet verified, and rules deny access.
    // Returning null allows the app to handle this as "user data not loaded" 
    // rather than crashing, eventually leading to the VerifyScreen.
    console.warn("Error getting user profile (Permission/Network issue):", e);
    return null; 
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map((doc: any) => doc.data() as User);
  } catch (e) {
    console.error("getAllUsers Failed (Check Firestore Rules):", e);
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
    return snapshot.docs.map((doc: any) => doc.data() as Question);
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
    // Basic query
    let q = db.collection("global_questions")
      .where("examType", "==", exam)
      .where("moderationStatus", "==", "APPROVED")
      .limit(50);

    if (subject !== 'Mixed') {
      q = q.where("subject", "==", subject);
    }

    const snapshot = await q.get();
    const all = snapshot.docs.map((d: any) => d.data() as Question);
    
    // Shuffle client-side for randomness since Firestore random sort is complex
    return all.sort(() => 0.5 - Math.random()).slice(0, count);
  } catch (e) {
    console.error("Error fetching official questions:", e);
    return [];
  }
};

export const getAdminQuestions = async (): Promise<Question[]> => {
  try {
    const snapshot = await db.collection("global_questions").get();
    return snapshot.docs.map((d: any) => d.data() as Question);
  } catch (e) {
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

export const getGlobalStats = async () => {
  try {
    const qSnap = await db.collection("global_questions").get();
    const uSnap = await db.collection("users").get();
    
    // Calculate REAL Active Users (active in last 7 days)
    const now = Date.now();
    let activeCount = 0;
    uSnap.forEach((doc: any) => {
       const data = doc.data();
       if (data.lastSeen && (now - data.lastSeen) < (7 * 24 * 60 * 60 * 1000)) {
          activeCount++;
       }
    });

    return {
       totalQuestions: qSnap.size,
       totalUsers: uSnap.size,
       activeUsers: activeCount
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
    await db.collection("settings").doc("exams").set({ config });
  } catch (e) {}
};

export const getExamConfig = async (): Promise<Record<string, string[]>> => {
  try {
    // Try Network First
    const docSnap = await db.collection("settings").doc("exams").get();
    if (docSnap.exists) {
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
    const snapshot = await db.collection("transactions").get();
    return snapshot.docs.map((d: any) => d.data() as Transaction);
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
    
    // Note: Firestore v8 Query building is slightly different, cannot reassign 'q' type easily if strict,
    // but in JS/loose TS it works.
    let query: any = q;

    if (category && category !== 'All') {
      query = query.where("category", "==", category);
    }
    
    const snapshot = await query.get();
    const allNews = snapshot.docs.map((d: any) => d.data() as NewsItem);
    
    return allNews.filter((n: NewsItem) => {
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
    return snapshot.docs.map((d: any) => d.data() as Question);
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
    if (docSnap.exists) return { ...DEFAULT_PREFS, ...docSnap.data() };
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
    return snapshot.docs.map((d: any) => d.data() as QuestionPaper);
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
    return snapshot.docs.map((d: any) => d.data() as ExamResult);
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
