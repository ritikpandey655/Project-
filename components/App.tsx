import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ExamType, Question, User, ViewState, ExamResult } from '../types';
import { EXAM_SUBJECTS, THEME_PALETTES } from '../constants';
import { 
  getUserPref, 
  getStats, 
  saveUserPref, 
  updateStats, 
  saveUser,
  getUser,
  toggleBookmark,
  getExamConfig,
  updateUserActivity,
  updateUserSession,
  getExamHistory,
  INITIAL_STATS
} from '../services/storageService';
import { generateExamQuestions } from '../services/geminiService';
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
import { SafariInstallPrompt } from './SafariInstallPrompt';
import { InstallModal } from './InstallModal';
import { BookmarksList } from './BookmarksList';
import { auth } from '../src/firebaseConfig';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogoIcon } from './LogoIcon';

const LAST_VIEW_KEY = 'pyqverse_last_view';

interface PracticeConfig {
  mode: 'finite' | 'endless';
  subject: string;
  count: number;
  topic?: string;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'landing', 
    selectedExam: null,
    stats: INITIAL_STATS,
    user: null,
    showTimer: true,
    generatedPaper: null,
    darkMode: false, 
    language: 'en',
    theme: 'PYQverse Prime', 
    qotd: null,
    newsFeed: [],
    examConfig: EXAM_SUBJECTS as unknown as Record<string, string[]> 
  });

  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig>({ mode: 'finite', subject: 'Mixed', count: 10 });
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [initialDoubtQuery, setInitialDoubtQuery] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  
  // Install Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  
  const currentSessionId = useRef<string>(Date.now().toString() + Math.random().toString());

  // Check if app is running in standalone mode (already installed)
  useEffect(() => {
    const checkStandalone = () => {
      const isStd = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(!!isStd);
    };
    checkStandalone();
    window.addEventListener('resize', checkStandalone); 
    
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', checkStandalone);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
          setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  }, [deferredPrompt]);

  const applyTheme = useCallback((themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', palette[500]);
    Object.keys(palette).forEach(key => {
      root.style.setProperty(`--primary-${key}`, (palette as any)[key]);
    });
  }, []);

  useEffect(() => { 
    applyTheme(state.theme); 
  }, [state.theme, applyTheme]);

  const navigateTo = useCallback((newView: ViewState) => {
    setState(prev => ({ ...prev, view: newView }));
    localStorage.setItem(LAST_VIEW_KEY, newView);
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [profile, prefs, statsData, config, history] = await Promise.all([
        getUser(userId),
        getUserPref(userId),
        getStats(userId),
        getExamConfig(),
        getExamHistory(userId)
      ]);
      const lastView = localStorage.getItem(LAST_VIEW_KEY) as ViewState || 'dashboard';
      
      setExamHistory(history);

      setState(prev => ({
        ...prev,
        user: profile,
        selectedExam: prefs.selectedExam,
        stats: statsData,
        showTimer: prefs.showTimer,
        darkMode: prefs.darkMode ?? false,
        language: prefs.language,
        theme: prefs.theme || 'PYQverse Prime',
        examConfig: config,
        view: initialDoubtQuery ? 'upload' : (['landing', 'login', 'signup'].includes(lastView) ? 'dashboard' : lastView)
      }));
      if (prefs.theme) applyTheme(prefs.theme);
      updateUserActivity(userId);
      updateUserSession(userId, currentSessionId.current);
    } catch (e) {
      navigateTo('dashboard');
    }
  }, [applyTheme, navigateTo, initialDoubtQuery]);

  const handleLogout = useCallback(async () => {
    setIsSidebarOpen(false);
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser.uid);
      } else {
        setState(prev => ({ ...prev, user: null, view: 'landing' }));
      }
      setIsAppInitializing(false);
    });
    return () => unsubscribe();
  }, [loadUserData]);

  const handleStartPractice = useCallback(async (conf?: PracticeConfig) => {
    const configToUse = conf || practiceConfig;
    if (!state.selectedExam) return;
    setIsLoading(true);
    setShowPracticeConfig(false);
    setSessionCorrect(0);
    setSessionWrong(0);
    try {
      const qs = await generateExamQuestions(state.selectedExam, configToUse.subject, configToUse.count, 'Medium', configToUse.topic ? [configToUse.topic] : []);
      setPracticeQueue(qs);
      setCurrentQIndex(0);
      navigateTo('practice');
    } catch (e) {
      alert("AI Connection busy. Using fallback questions.");
      setPracticeQueue([]); 
      navigateTo('practice');
    } finally {
      setIsLoading(false);
    }
  }, [state.selectedExam, practiceConfig, navigateTo]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
      if (isCorrect) setSessionCorrect(prev => prev + 1);
      else setSessionWrong(prev => prev + 1);
      if (state.user && state.selectedExam) updateStats(state.user.id, isCorrect, practiceQueue[currentQIndex]?.subject || 'General', state.selectedExam);
  }, [state.user, state.selectedExam, practiceQueue, currentQIndex]);

  const handleNextQuestion = useCallback(async () => {
    if (practiceConfig.mode === 'endless') {
      if (currentQIndex >= practiceQueue.length - 2) {
        setIsFetchingMore(true);
        try {
          const moreQs = await generateExamQuestions(state.selectedExam!, practiceConfig.subject, 5);
          setPracticeQueue(prev => [...prev, ...moreQs]);
        } catch (e) {}
        setIsFetchingMore(false);
      }
      setCurrentQIndex(prev => prev + 1);
    } else {
      if (currentQIndex < practiceQueue.length - 1) setCurrentQIndex(prev => prev + 1);
      else navigateTo('dashboard');
    }
  }, [practiceConfig.mode, practiceConfig.subject, currentQIndex, practiceQueue.length, state.selectedExam, navigateTo]);

  const isEntryView = ['landing', 'login', 'signup', 'forgotPassword', 'privacy', 'terms'].includes(state.view);

  return (
    <div className={`${state.darkMode ? 'dark' : ''} min-h-screen font-sans transition-colors duration-300 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100`}>
      <BackgroundAnimation darkMode={state.darkMode} />
      
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <div className="mb-8">
              <div className="hourglass"></div>
           </div>
           <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white tracking-widest uppercase mb-2">Generating Universe</h3>
           <p className="text-brand-500 dark:text-brand-300 font-mono text-xs animate-pulse">Aligning constellations...</p>
        </div>
      )}

      <main className="relative z-10 min-h-screen w-full flex flex-col">
        {!isEntryView && state.view !== 'practice' && (
          <div className="flex justify-between items-center px-4 py-3 pt-safe sm:px-6 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-40 border-b border-slate-100 dark:border-white/5 transition-colors">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('dashboard')}>
                  <LogoIcon size="sm" />
                  <h1 className="font-display font-black text-xl text-brand-600 dark:text-white tracking-tighter">PYQverse</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all">
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
          </div>
        )}

        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {state.view === 'landing' && <LandingPage onLogin={() => navigateTo('login')} onSignup={(q) => { if(q) setInitialDoubtQuery(q); navigateTo('signup'); }} onNavigate={navigateTo} />}
          {state.view === 'login' && <LoginScreen onLogin={(user) => loadUserData(user.id)} onNavigateToSignup={() => navigateTo('signup')} onForgotPassword={() => navigateTo('forgotPassword')} isOnline={isOnline} onNavigateToPrivacy={() => navigateTo('privacy')} onNavigateToTerms={() => navigateTo('terms')} />}
          {state.view === 'signup' && <SignupScreen onSignup={() => {}} onBackToLogin={() => navigateTo('login')} onNavigateToPrivacy={() => navigateTo('privacy')} onNavigateToTerms={() => navigateTo('terms')} />}
          {state.view === 'forgotPassword' && <ForgotPasswordScreen onBackToLogin={() => navigateTo('login')} />}
          {state.view === 'dashboard' && <Dashboard stats={state.stats} user={state.user} onStartPractice={() => setShowPracticeConfig(true)} onUpload={() => navigateTo('upload')} onGeneratePaper={() => navigateTo('paperGenerator')} onOpenBookmarks={() => navigateTo('bookmarks')} onOpenAnalytics={() => navigateTo('analytics')} onOpenLeaderboard={() => navigateTo('leaderboard')} selectedExam={state.selectedExam} darkMode={state.darkMode} language={state.language} onToggleTimer={() => {}} onToggleDarkMode={() => {}} onStartCurrentAffairs={() => {}} onReadCurrentAffairs={() => {}} onReadNotes={() => {}} onEnableNotifications={() => {}} showTimer={true} onInstall={handleInstallClick} canInstall={!isStandalone} onNavigate={navigateTo} />}
          {state.view === 'practice' && practiceQueue[currentQIndex] && (
              <QuestionCard question={practiceQueue[currentQIndex]} onAnswer={handleAnswer} onNext={handleNextQuestion} onBack={() => navigateTo('dashboard')} isLast={currentQIndex === practiceQueue.length - 1 && practiceConfig.mode !== 'endless'} isLoadingNext={isFetchingMore} language={state.language} onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))} onBookmarkToggle={(q) => state.user && toggleBookmark(state.user.id, q)} sessionStats={{ currentIndex: currentQIndex, total: practiceConfig.mode === 'endless' ? 100 : practiceConfig.count, correct: sessionCorrect, wrong: sessionWrong }} />
          )}
          {state.view === 'upload' && state.user && state.selectedExam && <UploadForm userId={state.user.id} examType={state.selectedExam} initialQuery={initialDoubtQuery || undefined} onSuccess={() => { setInitialDoubtQuery(null); navigateTo('dashboard'); }} />}
          {state.view === 'paperGenerator' && state.selectedExam && <PaperGenerator examType={state.selectedExam} onGenerate={(p) => { setState(s => ({ ...s, generatedPaper: p })); navigateTo('paperView'); }} onBack={() => navigateTo('dashboard')} onExamChange={() => {}} />}
          {state.view === 'paperView' && state.generatedPaper && state.user && <PaperView paper={state.generatedPaper} userId={state.user.id} onClose={() => navigateTo('dashboard')} language={state.language} />}
          {state.view === 'leaderboard' && state.user && <Leaderboard user={state.user} onBack={() => navigateTo('dashboard')} />}
          {state.view === 'analytics' && <SmartAnalytics stats={state.stats} history={examHistory} onBack={() => navigateTo('dashboard')} />}
          {state.view === 'bookmarks' && state.user && <BookmarksList userId={state.user.id} onBack={() => navigateTo('dashboard')} />}
          {state.view === 'privacy' && <PrivacyPolicy onBack={() => {
             const last = localStorage.getItem(LAST_VIEW_KEY) as ViewState;
             navigateTo(last && last !== 'privacy' ? last : 'dashboard');
          }} />}
          {state.view === 'terms' && <TermsOfService onBack={() => {
             const last = localStorage.getItem(LAST_VIEW_KEY) as ViewState;
             navigateTo(last && last !== 'terms' ? last : 'dashboard');
          }} />}
          {state.view === 'profile' && state.user && state.selectedExam && <ProfileScreen user={state.user} stats={state.stats} selectedExam={state.selectedExam} onBack={() => navigateTo('dashboard')} onLogout={handleLogout} onUpdateUser={(u) => saveUser(u)} onExamChange={() => {}} onInstall={handleInstallClick} canInstall={!isStandalone} />}
          {state.view === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} />}
        </div>

        {showPracticeConfig && state.selectedExam && <PracticeConfigModal examType={state.selectedExam} onClose={() => setShowPracticeConfig(false)} onStart={(conf) => { setPracticeConfig(conf); handleStartPractice(conf); }} onExamChange={(e) => setState(s => ({ ...s, selectedExam: e }))} isPro={state.user?.isPro} isAdmin={state.user?.isAdmin} />}
        
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={state.user} stats={state.stats} darkMode={state.darkMode} onToggleDarkMode={() => setState(s => ({ ...s, darkMode: !s.darkMode }))} showTimer={state.showTimer} onToggleTimer={() => setState(s => ({ ...s, showTimer: !s.showTimer }))} language={state.language} onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))} currentTheme={state.theme} onThemeChange={(t) => { setState(s => ({ ...s, theme: t })); applyTheme(t); }} onNavigate={navigateTo} onLogout={handleLogout} onEnableNotifications={() => {}} onInstall={handleInstallClick} canInstall={!isStandalone} />
        
        {!isEntryView && state.view !== 'practice' && state.view !== 'paperView' && <MobileBottomNav currentView={state.view} onNavigate={navigateTo} onAction={() => setShowPracticeConfig(true)} />}
        <SafariInstallPrompt />
        {showInstallModal && <InstallModal onClose={() => setShowInstallModal(false)} />}
      </main>
    </div>
  );
};

export default App;