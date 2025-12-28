
export enum ExamType {
  UPSC = 'UPSC',
  SSC_CGL = 'SSC CGL',
  SSC_CHSL = 'SSC CHSL',
  SSC_MTS = 'SSC MTS',
  JEE_MAINS = 'JEE Mains',
  NEET = 'NEET',
  UP_BOARD_10 = 'UP Board Class 10',
  UP_BOARD_12 = 'UP Board Class 12',
  BANKING = 'Banking',
  RAILWAYS = 'Railways',
  RRB_NTPC = 'RRB NTPC',
  GATE = 'GATE',
  NDA = 'NDA',
  CDS = 'CDS',
  STATE_PSC = 'State PSC',
  TEACHING_CTET = 'Teaching (CTET)',
  POLICE_CONSTABLE = 'Police Constable'
}

export enum QuestionSource {
  PYQ_AI = 'PYQ_AI',
  USER = 'USER',
  OFFICIAL = 'OFFICIAL'
}

export enum QuestionType {
  MCQ = 'MCQ',
  SHORT_ANSWER = 'SHORT_ANSWER',
  LONG_ANSWER = 'LONG_ANSWER',
  NUMERICAL = 'NUMERICAL',
  VIVA = 'VIVA'
}

export interface Question {
  id: string;
  text: string;
  textHindi?: string;
  options: string[];
  optionsHindi?: string[];
  correctIndex: number;
  explanation?: string;
  explanationHindi?: string;
  source: QuestionSource;
  examType: ExamType | string;
  subject?: string;
  createdAt: number;
  tags?: string[];
  type?: QuestionType;
  marks?: number;
  answer?: string;
  answerHindi?: string;
  userAnswer?: string;
  isBookmarked?: boolean;
  pyqYear?: number;
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface SystemLog {
  id: string;
  type: 'ERROR' | 'INFO' | 'API_FAIL';
  message: string;
  details?: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string | null;
  isAdmin?: boolean;
  isPro?: boolean;
  mobile?: string;
  currentClass?: string;
  address?: string;
  state?: string;
  pincode?: string;
}

export interface UserStats {
  totalAttempted: number;
  totalCorrect: number;
  streakCurrent: number;
  streakMax: number;
  lastActiveDate: string;
  subjectPerformance: Record<string, { correct: number; total: number }>;
  examPerformance?: Record<string, any>;
}

export interface ExamResult {
  id: string;
  examType: string;
  paperTitle: string;
  score: number;
  totalMarks: number;
  accuracy: number;
  date: number;
  timeTakenSeconds: number;
  topicAnalysis: Record<string, any>;
}

/** Missing interfaces required by other services and components **/

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: string;
  features: string[];
  recommended?: boolean;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  category: string;
  date: string;
  tags: string[];
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  planId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  date: number;
  method: string;
}

export interface SyllabusItem {
  examType: string;
  subject: string;
  topics: string[];
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  exam: string;
  score: number;
  isCurrentUser: boolean;
}

export interface QuestionSection {
  id: string;
  title: string;
  instructions: string;
  questions: Question[];
  marksPerQuestion?: number;
}

export interface QuestionPaper {
  id: string;
  title: string;
  totalMarks: number;
  durationMinutes: number;
  sections: QuestionSection[];
  examType: string;
  subject: string;
  difficulty: string;
  createdAt: number;
}

export type ViewState = 'landing' | 'login' | 'signup' | 'forgotPassword' | 'dashboard' | 'practice' | 'upload' | 'profile' | 'admin' | 'analytics' | 'leaderboard' | 'bookmarks' | 'privacy' | 'terms' | 'paperGenerator' | 'paperView';

export interface AppState {
  view: ViewState;
  selectedExam: ExamType | null;
  stats: UserStats;
  user: User | null;
  showTimer: boolean;
  generatedPaper?: any;
  darkMode: boolean;
  language: 'en' | 'hi';
  theme: string;
  examConfig?: Record<string, string[]>;
  qotd?: Question | null;
  newsFeed?: NewsItem[];
}
