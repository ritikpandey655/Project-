
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
  const [antigravityMode, setAntigravityMode] = useState(false); // New Antigravity State
  
  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  const [generationLatency, setGenerationLatency] = useState<number>(0);
  const currentSessionId = useRef<string>(Date.now().toString());

  // --- ANTIGRAVITY EFFECT INJECTOR ---
  useEffect(() => {
    if (antigravityMode) {
      document.body.classList.add('antigravity-active');
    } else {
      document.body.classList.remove('antigravity-active');
    }
  }, [antigravityMode]);

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
        desc = "Stuck on a question? Upload an image or type your doubt. Our AI solves UPSC, JEE, NEET, and SSC questions instantly.";
        keywords += ", AI Doubt Solver, Homework Helper, Exam Solution App, Scan Question";
    } else if (state.view === 'paperGenerator') {
        title = "Free Mock Test Generator | PYQverse";
        desc = "Generate unlimited custom mock test papers for UPSC, JEE, and NEET. Set your difficulty and topics for targeted practice.";
        keywords += ", Mock Test Generator, Free Exam Papers, Custom Test Maker, Printable Exam Papers";
    } else if (state.view === 'signup') {
        title = "Join PYQverse - Start Preparing";
        desc = "Create a free account on PYQverse. Access unlimited AI practice questions and join the community of toppers.";
    } else if (state.view === 'landing') {
        title = "PYQverse - AI Exam Preparation for UPSC, JEE, NEET";
        keywords += ", UPSC, JEE, NEET, SSC, UP Board, Best Exam App";
    } else if (['profile', 'admin', 'bookmarks', 'paperView'].includes(state.view)) {
        robotsContent = "noindex, nofollow";
    }
    
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) metaKeywords.setAttribute('content', keywords);
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots) metaRobots.setAttribute('content', robotsContent);

  }, [state.view, state.selectedExam]);

  // --- THEME ENGINE ---
  const applyTheme = (themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    
    // Set the data-theme attribute for CSS overrides (E-Ink)
    root.setAttribute('data-theme', themeName);

    root.style.setProperty('--brand-primary', palette[500]);
    root.style.setProperty('--primary-50', palette[50]);
    root.style.setProperty('--primary-100', palette[100]);
    root.style.setProperty('--primary-200', palette[200]);
    root.style.setProperty('--primary-300', palette[300]);
    root.style.setProperty('--primary-400', palette[400]);
    root.style.setProperty('--primary-500', palette[500]);
    root.style.setProperty('--primary-600', palette[600]);
    root.style.setProperty('--primary-700', palette[700]);
    root.style.setProperty('--primary-800', palette[800]);
    root.style.setProperty('--primary-900', palette[900]);
  };

  useEffect(() => {
    applyTheme(state.theme);
  }, [state.theme]);

  // --- APP LIFECYCLE ---
  useEffect(() => {
    // 1. Check Global Prompt
    if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        checkInstallDismissal();
    }

    const pwaReadyHandler = () => {
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            checkInstallDismissal();
        }
    };
    window.addEventListener('pwa-ready', pwaReadyHandler);

    const pwaHandler = (e: any) => { 
      e.preventDefault(); 
      setDeferredPrompt(e); 
      checkInstallDismissal();
    };
    window.addEventListener('beforeinstallprompt', pwaHandler);
    
    // --- SEO: HANDLE QUERY PARAMETERS ---
    const searchParams = new URLSearchParams(window.location.search);
    
    // 1. Google Search Action (?q=query)
    const searchQuery = searchParams.get('q');
    
    // 2. Share Target (?text=... or ?title=...)
    const sharedText = searchParams.get('text');
    const sharedTitle = searchParams.get('title');
    
    // 3. Protocol / Shortcuts
    const noteAction = searchParams.get('note');
    const protocolUrl = searchParams.get('action');

    const intentText = searchQuery || sharedText || sharedTitle;

    if (intentText) {
        setInitialDoubtQuery(intentText);
        // Clean URL cleanly
        window.history.replaceState({}, document.title, "/");
    } else if (noteAction === 'new') {
        setInitialDoubtQuery(""); 
        window.history.replaceState({}, document.title, "/");
    } else if (protocolUrl) {
        const decodedAction = decodeURIComponent(protocolUrl).replace('web+pyq://', '');
        if (decodedAction.includes('practice')) setShowPracticeConfig(true);
        else if (decodedAction.includes('camera') || decodedAction.includes('doubts')) setInitialDoubtQuery(""); 
        window.history.replaceState({}, document.title, "/");
    }

    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    const unsubscribeConfig = subscribeToSystemConfig((newConfig) => {
        console.log("System Config Synced:", newConfig);
    });

    checkAIConnectivity();

    return () => {
      window.removeEventListener('beforeinstallprompt', pwaHandler);
      window.removeEventListener('pwa-ready', pwaReadyHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      unsubscribeConfig();
    };
  }, []);

  const checkInstallDismissal = () => {
      const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
      const lastDismissedTime = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      if (!dismissed || (now - lastDismissedTime > 3 * 24 * 60 * 60 * 1000)) {
          setShowInstallBanner(true);
      }
  };

  const navigateTo = useCallback((newView: ViewState) => {
    setState(prev => ({ ...prev, view: newView }));
    localStorage.setItem(LAST_VIEW_KEY, newView);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      // 1. Generate & Update Session ID immediately to secure One Device Login
      const newSessionId = Date.now().toString();
      currentSessionId.current = newSessionId;
      await updateUserSession(userId, newSessionId);

      const [profile, prefs, statsData, config, history, sysConfig] = await Promise.all([
        getUser(userId),
        getUserPref(userId),
        getStats(userId),
        getExamConfig(),
        getExamHistory(userId),
        getSystemConfig()
      ]);
      
      setExamHistory(history);
      const lastView = localStorage.getItem(LAST_VIEW_KEY) as ViewState;
      const sanitizedView = (lastView && VALID_VIEWS.includes(lastView)) ? lastView : 'dashboard';

      if (prefs.theme) {
          applyTheme(prefs.theme);
      }

      // Determine initial view based on intent
      let initialView = sanitizedView;
      const searchParams = new URLSearchParams(window.location.search);
      // If we have an initial query from URL (set in useEffect), force upload view
      if (initialDoubtQuery !== null || searchParams.get('note') === 'new') {
          initialView = 'upload';
      }

      setState(prev => ({
        ...prev,
        user: profile,
        selectedExam: prefs.selectedExam,
        stats: statsData || INITIAL_STATS, 
        showTimer: prefs.showTimer,
        darkMode: prefs.darkMode ?? true,
        language: prefs.language,
        theme: prefs.theme || 'PYQverse Prime',
        examConfig: config,
        view: (['landing', 'login', 'signup'].includes(initialView) ? 'dashboard' : initialView) as ViewState
      }));

      updateUserActivity(userId);
    } catch (e) {
      console.error("Failed to load user data:", e);
      navigateTo('dashboard');
    }
  }, [navigateTo, initialDoubtQuery]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser.uid);
      } else {
        setState(prev => ({ 
          ...prev, 
          user: null, 
          view: 'landing',
          stats: INITIAL_STATS,
          selectedExam: null
        }));
        localStorage.removeItem(LAST_VIEW_KEY);
      }
    });
    return () => unsubscribe();
  }, [loadUserData]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setState({
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
      localStorage.removeItem(LAST_VIEW_KEY);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Logout Error:", error);
      window.location.reload();
    }
  };

  // --- ONE USER ONE DEVICE ENFORCEMENT ---
  useEffect(() => {
    let unsubscribe: () => void;

    if (state.user) {
        // Monitor user document for session ID changes
        unsubscribe = db.collection("users").doc(state.user.id).onSnapshot((doc) => {
            const data = doc.data();
            // If remote session ID exists and doesn't match our current ID -> Logout
            if (data && data.sessionId && data.sessionId !== currentSessionId.current) {
                alert("You have been logged out because your account was logged in on another device.");
                handleLogout();
            }
        }, (error) => {
            console.error("Session listener error:", error);
        });
    }

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [state.user]);

  const handleStartPractice = useCallback(async (conf?: PracticeConfig) => {
    const configToUse = conf || practiceConfig;
    if (!state.selectedExam) return;
    setIsLoading(true);
    setShowPracticeConfig(false);
    setSessionCorrect(0);
    setSessionWrong(0);
    
    try {
      const qs = await generateExamQuestions(
          state.selectedExam, 
          configToUse.subject, 
          configToUse.count, 
          'Medium', 
          configToUse.topic ? [configToUse.topic] : [],
          state.language
      );
      setPracticeQueue(qs);
      setCurrentQIndex(0);
      navigateTo('practice');
    } catch (e) {
      alert("AI Service busy. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [state.selectedExam, practiceConfig, navigateTo, state.language]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
      if (isCorrect) setSessionCorrect(prev => prev + 1);
      else setSessionWrong(prev => prev + 1);
      if (state.user && state.selectedExam) {
        updateStats(state.user.id, isCorrect, practiceQueue[currentQIndex]?.subject || 'General', state.selectedExam);
      }
  }, [state.user, state.selectedExam, practiceQueue, currentQIndex]);

  const handleNextQuestion = useCallback(async () => {
    if (practiceConfig.mode === 'endless') {
      if (currentQIndex >= practiceQueue.length - 2) {
        setIsFetchingMore(true);
        try {
          const moreQs = await generateExamQuestions(
              state.selectedExam!, 
              practiceConfig.subject, 
              5, 
              'Medium', 
              [], 
              state.language
          );
          setPracticeQueue(prev => [...prev, ...moreQs]);
        } catch (e) {}
        setIsFetchingMore(false);
      }
      setCurrentQIndex(prev => prev + 1);
    } else {
      if (currentQIndex < practiceQueue.length - 1) setCurrentQIndex(prev => prev + 1);
      else navigateTo('dashboard');
    }
  }, [practiceConfig, currentQIndex, practiceQueue, state.selectedExam, navigateTo, state.language]);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    } else {
      alert("To install, use your browser's 'Add to Home Screen' option.");
    }
  };

  const handleDismissInstall = () => {
      setShowInstallBanner(false);
      localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString());
  };

  const isEntryView = ['landing', 'login', 'signup', 'forgotPassword', 'privacy', 'terms'].includes(state.view);

  return (
    <div className={`${state.darkMode ? 'dark' : ''} min-h-screen font-sans bg-white dark:bg-[#0a0814] text-slate-900 dark:text-white transition-colors selection:bg-brand-500/30 flex flex-col`}>
      <BackgroundAnimation darkMode={state.darkMode} />
      
      {!isOnline && (
        <div className="bg-red-600 text-white text-[10px] font-bold text-center py-1 uppercase tracking-widest sticky top-0 z-[100] shadow-lg">
          Offline Mode Active
        </div>
      )}

      {showInstallBanner && deferredPrompt && (
        <PWAInstallBanner onInstall={handleInstallApp} onDismiss={handleDismissInstall} />
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-[#0a0814]/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <div className="sand-timer mb-10">
              <div className="sand-top"></div>
              <div className="sand-bottom"></div>
              <div className="sand-stream"></div>
           </div>
           <h3 className="text-3xl font-display font-black tracking-tighter uppercase mb-2">Syncing with AI</h3>
           <p className="text-brand-400 font-mono text-[10px] uppercase tracking-widest animate-pulse">Calculating Exam Patterns...</p>
        </div>
      )}

      <main className="relative z-10 flex-1 w-full flex flex-col pb-24 sm:pb-0"> 
        {!isEntryView && state.view !== 'practice' && (
          <header className="flex justify-between items-center px-6 py-4 pt-safe sticky top-0 bg-white/80 dark:bg-[#0a0814]/80 backdrop-blur-xl z-40 border-b border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('dashboard')}>
                  <LogoIcon size="sm" />
                  <h1 className="font-display font-black text-2xl text-brand-600 dark:text-white tracking-tighter group-hover:scale-105 transition-transform">PYQverse</h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 active:scale-90 transition-all shadow-md dark:shadow-xl"
              >
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
              </button>
          </header>
        )}

        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {state.view === 'landing' && <LandingPage onLogin={() => navigateTo('login')} onSignup={(q) => { if(q) setInitialDoubtQuery(q); navigateTo('signup'); }} onNavigate={navigateTo} />}
          {state.view === 'login' && <LoginScreen onLogin={(user) => loadUserData(user.id)} onNavigateToSignup={() => navigateTo('signup')} onForgotPassword={() => navigateTo('forgotPassword')} isOnline={isOnline} onNavigateToPrivacy={() => navigateTo('privacy')} onNavigateToTerms={() => navigateTo('terms')} />}
          {state.view === 'signup' && <SignupScreen onSignup={() => {}} onBackToLogin={() => navigateTo('login')} onNavigateToPrivacy={() => navigateTo('privacy')} onNavigateToTerms={() => navigateTo('terms')} />}
          
          {state.view === 'dashboard' && (
            <Dashboard 
              stats={state.stats} 
              user={state.user} 
              showTimer={state.showTimer}
              darkMode={state.darkMode}
              onStartPractice={() => setShowPracticeConfig(true)} 
              onUpload={() => navigateTo('upload')} 
              onToggleTimer={() => setState(s => ({ ...s, showTimer: !s.showTimer }))}
              onToggleDarkMode={() => setState(s => ({ ...s, darkMode: !s.darkMode }))}
              onGeneratePaper={() => navigateTo('paperGenerator')} 
              onStartCurrentAffairs={() => {}}
              onReadCurrentAffairs={() => {}}
              onReadNotes={() => {}}
              onEnableNotifications={() => {}}
              onOpenBookmarks={() => navigateTo('bookmarks')} 
              onOpenAnalytics={() => navigateTo('analytics')} 
              onOpenLeaderboard={() => navigateTo('leaderboard')} 
              onOpenPYQLibrary={() => navigateTo('paperGenerator')} 
              selectedExam={state.selectedExam} 
              isOnline={isOnline} 
              onNavigate={navigateTo}
              language={state.language}
              onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))}
              currentTheme={state.theme}
              onThemeChange={(t) => {
                setState(s => ({ ...s, theme: t }));
                applyTheme(t);
              }}
            />
          )}

          {state.view === 'practice' && practiceQueue[currentQIndex] && (
              <QuestionCard 
                question={practiceQueue[currentQIndex]} 
                onAnswer={handleAnswer} onNext={handleNextQuestion} 
                onBack={() => navigateTo('dashboard')} 
                isLast={currentQIndex === practiceQueue.length - 1 && practiceConfig.mode !== 'endless'} 
                isLoadingNext={isFetchingMore} language={state.language} 
                onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))} 
                onBookmarkToggle={(q) => state.user && toggleBookmark(state.user.id, q)} 
                sessionStats={{ 
                  currentIndex: currentQIndex, 
                  total: practiceConfig.mode === 'endless' ? 1000 : practiceConfig.count, 
                  correct: sessionCorrect, 
                  wrong: sessionWrong 
                }} 
                latency={generationLatency}
              />
          )}

          {state.view === 'upload' && state.user && state.selectedExam && <UploadForm userId={state.user.id} examType={state.selectedExam} initialQuery={initialDoubtQuery || undefined} onSuccess={() => { setInitialDoubtQuery(null); navigateTo('dashboard'); }} />}
          {state.view === 'paperGenerator' && state.selectedExam && <PaperGenerator examType={state.selectedExam} onGenerate={(p) => { setState(s => ({ ...s, generatedPaper: p })); navigateTo('paperView'); }} onBack={() => navigateTo('dashboard')} onExamChange={() => {}} />}
          {state.view === 'paperView' && state.generatedPaper && state.user && <PaperView paper={state.generatedPaper} userId={state.user.id} onClose={() => navigateTo('dashboard')} language={state.language} />}
          {state.view === 'leaderboard' && state.user && <Leaderboard user={state.user} onBack={() => navigateTo('dashboard')} />}
          {state.view === 'analytics' && <SmartAnalytics stats={state.stats} history={examHistory} onBack={() => navigateTo('dashboard')} />}
          {state.view === 'bookmarks' && state.user && <BookmarksList userId={state.user.id} onBack={() => navigateTo('dashboard')} />}
          {state.view === 'profile' && state.user && state.selectedExam && <ProfileScreen user={state.user} stats={state.stats} selectedExam={state.selectedExam} onBack={() => navigateTo('dashboard')} onLogout={handleLogout} onUpdateUser={(u) => saveUser(u)} />}
          {state.view === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} onToggleAntigravity={() => setAntigravityMode(!antigravityMode)} />}
          {state.view === 'privacy' && <PrivacyPolicy onBack={() => navigateTo(state.user ? 'dashboard' : 'landing')} />}
          {state.view === 'terms' && <TermsOfService onBack={() => navigateTo(state.user ? 'dashboard' : 'landing')} />}
        </div>

        {showPracticeConfig && state.selectedExam && (
          <PracticeConfigModal 
            examType={state.selectedExam} 
            onClose={() => setShowPracticeConfig(false)} 
            onStart={(conf) => { setPracticeConfig(conf); handleStartPractice(conf); }} 
            onExamChange={(e) => setState(s => ({ ...s, selectedExam: e }))} 
            isPro={state.user?.isPro} 
            isAdmin={state.user?.isAdmin} 
          />
        )}
        
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          user={state.user} stats={state.stats} 
          darkMode={state.darkMode} onToggleDarkMode={() => setState(s => ({ ...s, darkMode: !s.darkMode }))} 
          showTimer={state.showTimer} onToggleTimer={() => setState(s => ({ ...s, showTimer: !s.showTimer }))} 
          language={state.language} onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))} 
          currentTheme={state.theme} 
          onThemeChange={(t) => {
            setState(s => ({ ...s, theme: t }));
            applyTheme(t);
          }} 
          onNavigate={navigateTo} onLogout={handleLogout} 
          onInstallApp={deferredPrompt ? handleInstallApp : undefined}
          onEnableNotifications={() => {}}
        />
        
        {!isEntryView && state.view !== 'practice' && state.view !== 'paperView' && (
          <MobileBottomNav currentView={state.view} onNavigate={navigateTo} onAction={() => setShowPracticeConfig(true)} />
        )}
      </main>
    </div>
  );
};

export default App;
