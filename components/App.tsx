
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ExamType, Question, User, ViewState, ExamResult } from '../types';
import { EXAM_SUBJECTS, THEME_PALETTES } from '../constants';
import { 
  getUserPref, getStats, saveUserPref, updateStats, 
  saveUser, getUser, toggleBookmark, getExamConfig,
  updateUserActivity, updateUserSession, getExamHistory, INITIAL_STATS, getSystemConfig, subscribeToSystemConfig
} from '../services/storageService';
import { generateExamQuestions, checkAIConnectivity } from '../services/geminiService';

// UI Components
import { Dashboard } from './Dashboard';
import { QuestionCard } from './QuestionCard';
import { UploadForm } from './UploadForm';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { ProfileScreen } from './ProfileScreen';
import { PaperGenerator } from './PaperGenerator';
import { PaperView } from './PaperView';
import { PracticeConfigModal } from './PracticeConfigModal';
import { Sidebar } from './Sidebar';
import { AdminDashboard } from './AdminDashboard';
import { SmartAnalytics } from './SmartAnalytics';
import { Leaderboard } from './Leaderboard';
import { BackgroundAnimation } from './BackgroundAnimation';
import { MobileBottomNav } from './MobileBottomNav';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { LandingPage } from './LandingPage'; 
import { BookmarksList } from './BookmarksList';
import { LogoIcon } from './LogoIcon';
import { PWAInstallBanner } from './PWAInstallBanner';

// Firebase Engine
import { auth, db } from '../src/firebaseConfig';

const LAST_VIEW_KEY = 'pyqverse_last_view';
const INSTALL_DISMISSED_KEY = 'pyqverse_install_dismissed_v2';

// Valid views list for sanitization
const VALID_VIEWS: ViewState[] = [
  'landing', 'login', 'signup', 'forgotPassword', 'dashboard', 'practice', 
  'upload', 'profile', 'admin', 'analytics', 'leaderboard', 'bookmarks', 
  'privacy', 'terms', 'paperGenerator', 'paperView'
];

interface PracticeConfig {
  mode: 'finite' | 'endless';
  subject: string;
  count: number;
  topic?: string;
}

// --- SEO: RICH KEYWORD MAPPING ---
const SEO_RICH_KEYWORDS: Record<string, string> = {
  'UPSC': 'IAS Preparation, UPSC Prelims 2025, UPSC Mains Syllabus, CSE Mock Test, Civil Services PYQ',
  'JEE Mains': 'IIT JEE Preparation, JEE Advanced, PCM Formulas, Engineering Entrance, NTA Mock Test',
  'NEET': 'NEET UG 2025, Biology NCERT, Medical Entrance Exam, NEET Physics PYQ, NEET Chemistry',
  'SSC CGL': 'SSC CGL Tier 1, SSC Reasoning, Quantitative Aptitude, Govt Job Exam Prep, SSC CHSL',
  'UP Board Class 10': 'UP Board High School, UPMSP Model Paper, Class 10 Hindi Medium, UP Board Result',
  'UP Board Class 12': 'UP Board Intermediate, UPMSP Class 12 Syllabus, UP Board Physics Math, Hindi Medium Exam',
  'Banking': 'IBPS PO, SBI Clerk, Banking Awareness, Quantitative Aptitude for Bank Exams',
  'Railways': 'RRB NTPC, Railway Group D, General Science for Railways, RRB ALP',
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'landing', 
    selectedExam: null,
    stats: INITIAL_STATS,
    user: null,
    showTimer: true,
    darkMode: true,
    language: 'en',
    theme: 'PYQverse Prime', 
    examConfig: EXAM_SUBJECTS as any
  });

  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig>({ mode: 'finite', subject: 'Mixed', count: 10 });
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [initialDoubtQuery, setInitialDoubtQuery] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  
  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  const [generationLatency, setGenerationLatency] = useState<number>(0);
  const currentSessionId = useRef<string>(Date.now().toString());

  // --- SEO: DYNAMIC TITLES & META ---
  useEffect(() => {
    let title = "PYQverse - India's Best AI Exam Prep App";
    let desc = "Practice unlimited Previous Year Questions (PYQ) for UPSC, SSC CGL, JEE Mains, NEET & UP Board. Features Instant AI Doubt Solving, Mock Tests, and Analytics.";
    let keywords = "PYQverse, Exam Prep, AI Doubt Solver, Previous Year Questions, Mock Tests, Online Test Series, Free Mock Test";
    let robotsContent = "index, follow";

    if (state.view === 'practice' && state.selectedExam) {
        title = `Practice ${state.selectedExam} Questions 2025 | PYQverse`;
        desc = `Attempt ${state.selectedExam} Previous Year Questions (PYQ) and Mock Tests with instant AI explanations. Improve your accuracy for ${state.selectedExam} 2025.`;
        const richKeywords = SEO_RICH_KEYWORDS[state.selectedExam] || `${state.selectedExam} Syllabus, ${state.selectedExam} Preparation`;
        keywords += `, ${state.selectedExam} PYQ, ${state.selectedExam} Mock Test, ${richKeywords}`;
    } else if (state.view === 'dashboard') {
        title = "My Dashboard | PYQverse";
        desc = "Track your exam preparation progress, daily streaks, and subject-wise performance analytics on PYQverse.";
    } else if (state.view === 'upload') {
        title = "AI Doubt Solver - Instant Solutions | PYQverse";
        desc = "Stuck on a question? Upload an image