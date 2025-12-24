
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ExamType, Question, User, ViewState } from '../types';
import { EXAM_SUBJECTS, THEME_PALETTES } from '../constants';
import { 
  getUserPref, 
  getStats, 
  saveUserPref, 
  updateStats, 
  saveUser,
  getUser,
  toggleBookmark,
  getStoredQOTD,
  saveQOTD,
  getExamConfig,
  updateUserActivity,
  updateUserSession,
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
import { LandingPage } from './LandingPage'; 
import { auth } from '../src/firebaseConfig';
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

  // New: Real-time session analytics state
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  const currentSessionId = useRef<string>(Date.now().toString() + Math.random().toString());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setCanInstall(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const applyTheme = useCallback((themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', palette[500]);
    Object.keys(palette).forEach(key => {
      // @ts-ignore
      root.style.setProperty(`--primary-${key}`, palette[key]);
    });
  }, []);

  // Sync theme variables on state change
  useEffect(() => {
    applyTheme(state.theme);
  }, [state.theme, applyTheme]);

  const navigateTo = useCallback((newView: ViewState) => {
    setState(prev => ({ ...prev, view: newView }));
    localStorage.setItem(LAST_VIEW_KEY, newView);
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [profile, prefs, statsData, config] = await Promise.all([
        getUser(userId),
        getUserPref(userId),
        getStats(userId),
        getExamConfig()
      ]);
      const lastView = localStorage.getItem(LAST_VIEW_KEY) as ViewState || 'dashboard';
      setState(prev => ({
        ...prev,
        user: profile,
        selectedExam: prefs.selectedExam,
        stats: statsData,
        showTimer: prefs.showTimer,
        darkMode: prefs.darkMode,
        language: prefs.language,
        theme: prefs.theme,
        examConfig: config,
        view: (lastView === 'landing' || lastView === 'login' || lastView === 'signup') ? 'dashboard' : lastView
      }));
      if (prefs.theme) applyTheme(prefs.theme);
      updateUserActivity(userId);
      updateUserSession(userId, currentSessionId.current);
    } catch (e) {
      console.error("User Data Load Error:", e);
      navigateTo('dashboard');
    }
  }, [applyTheme, navigateTo]);

  const handleLogout = useCallback(async () => {
    setIsSidebarOpen(false);
    try {
      await auth.signOut();
    } catch (e) {
      console.error("Logout Error:", e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified && firebaseUser.email !== 'support@pyqverse.in') {
          setState(prev => ({ ...prev, user: { id: firebaseUser.uid, name: firebaseUser.displayName || 'User', email: firebaseUser.email || '' }, view: 'landing' }));
          setIsAppInitializing(false);
        } else {
          await loadUserData(firebaseUser.uid);
          setIsAppInitializing(false);
        }
      } else {
        setState(prev => ({ ...prev, user: null, view: 'landing' }));
        setIsAppInitializing(false);
      }
    });
    const fallbackTimer = setTimeout(() => setIsAppInitializing(false), 8000);
    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [loadUserData]);

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
        configToUse.topic ? [configToUse.topic] : []
      );
      setPracticeQueue(qs);
      setCurrentQIndex(0);
      navigateTo('practice');
    } catch (e) {
      console.error("Failed to start practice:", e);
    } finally {
      setIsLoading(false);
    }
  }, [state.selectedExam, practiceConfig, navigateTo]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
      if (isCorrect) setSessionCorrect(prev => prev + 1);
      else setSessionWrong(prev => prev + 1);
      
      if (state.user && state.selectedExam) {
          updateStats(state.user.id, isCorrect, practiceQueue[currentQIndex].subject || 'General', state.selectedExam);
      }
  }, [state.user, state.selectedExam, practiceQueue, currentQIndex]);

  const handleNextQuestion = useCallback(async () => {
    if (practiceConfig.mode === 'endless') {
      if (currentQIndex >= practiceQueue.length - 3) {
        setIsFetchingMore(true);
        try {
          const moreQs = await generateExamQuestions(state.selectedExam!, practiceConfig.subject, 10);
          setPracticeQueue(prev => [...prev, ...moreQs]);
        } catch (e) {
          console.error("Failed to fetch more questions:", e);
        }
        setIsFetchingMore(false);
      }
      setCurrentQIndex(prev => prev + 1);
    } else {
      if (currentQIndex < practiceQueue.length - 1) setCurrentQIndex(prev => prev + 1);
      else navigateTo('dashboard');
    }
  }, [practiceConfig.mode, practiceConfig.subject, currentQIndex, practiceQueue.length, state.selectedExam, navigateTo]);

  const hideHeader = state.view === 'landing' || state.view === 'login' || state.view === 'signup' || state.view === 'privacy' || state.view === 'practice';

  return (
    <div className={`${state.darkMode ? 'dark' : ''} min-h-screen font-sans transition-colors duration-300`}>
      <BackgroundAnimation />
      
      {isAppInitializing ? (
        <LoginScreen isInitializing={true} onLogin={() => {}} onNavigateToSignup={() => {}} onForgotPassword={() => {}} />
      ) : (
        <main className="relative z-10 min-h-screen w-full flex flex-col">
          {!hideHeader && (
            <div className="flex justify-between items-center px-4 py-3 pt-safe sm:px-6 sticky top-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl z-40 border-b border-white/10 shadow-sm">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('dashboard')}>
                  <LogoIcon size="sm" />
                  <div>
                    <h1 className="font-display font-black text-base text-slate-800 dark:text-white leading-none tracking-tight">PYQverse</h1>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-all">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
            </div>
          )}

          <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {state.view === 'landing' && <LandingPage onLogin={() => navigateTo('login')} onSignup={() => navigateTo('signup')} />}
            {state.view === 'login' && <LoginScreen onLogin={(user) => loadUserData(user.id)} onNavigateToSignup={() => navigateTo('signup')} onForgotPassword={() => navigateTo('forgotPassword')} isOnline={isOnline} onNavigateToPrivacy={() => navigateTo('privacy')} />}
            {state.view === 'signup' && <SignupScreen onSignup={() => {}} onBackToLogin={() => navigateTo('login')} />}
            {state.view === 'forgotPassword' && <ForgotPasswordScreen onBackToLogin={() => navigateTo('login')} />}
            {state.view === 'dashboard' && <Dashboard stats={state.stats} user={state.user} onStartPractice={() => setShowPracticeConfig(true)} onUpload={() => navigateTo('upload')} onGeneratePaper={() => navigateTo('paperGenerator')} onOpenBookmarks={() => navigateTo('bookmarks')} onOpenAnalytics={() => navigateTo('analytics')} onOpenLeaderboard={() => navigateTo('leaderboard')} selectedExam={state.selectedExam} darkMode={state.darkMode} language={state.language} onToggleTimer={() => {}} onToggleDarkMode={() => {}} onStartCurrentAffairs={() => {}} onReadCurrentAffairs={() => {}} onReadNotes={() => {}} onEnableNotifications={() => {}} showTimer={true} onInstall={handleInstallClick} canInstall={canInstall} />}
            {state.view === 'practice' && practiceQueue[currentQIndex] && (
                <QuestionCard 
                    question={practiceQueue[currentQIndex]} 
                    onAnswer={handleAnswer}
                    onNext={handleNextQuestion} 
                    onBack={() => navigateTo('dashboard')}
                    isLast={currentQIndex === practiceQueue.length - 1 && practiceConfig.mode !== 'endless'} 
                    isLoadingNext={isFetchingMore}
                    language={state.language}
                    onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))}
                    onBookmarkToggle={(q) => state.user && toggleBookmark(state.user.id, q)}
                    sessionStats={{
                        currentIndex: currentQIndex,
                        total: practiceConfig.mode === 'endless' ? 100 : practiceConfig.count,
                        correct: sessionCorrect,
                        wrong: sessionWrong
                    }}
                />
            )}
            {state.view === 'upload' && state.user && state.selectedExam && <UploadForm userId={state.user.id} examType={state.selectedExam} onSuccess={() => navigateTo('dashboard')} />}
            {state.view === 'paperGenerator' && state.selectedExam && <PaperGenerator examType={state.selectedExam} onGenerate={(p) => { setState(s => ({ ...s, generatedPaper: p })); navigateTo('paperView'); }} onBack={() => navigateTo('dashboard')} onExamChange={() => {}} />}
            {state.view === 'paperView' && state.generatedPaper && state.user && <PaperView paper={state.generatedPaper} userId={state.user.id} onClose={() => navigateTo('dashboard')} language={state.language} />}
            {state.view === 'leaderboard' && state.user && <Leaderboard user={state.user} onBack={() => navigateTo('dashboard')} />}
            {state.view === 'analytics' && <SmartAnalytics stats={state.stats} history={[]} onBack={() => navigateTo('dashboard')} />}
            {state.view === 'privacy' && <PrivacyPolicy onBack={() => navigateTo('dashboard')} />}
            {state.view === 'profile' && state.user && state.selectedExam && <ProfileScreen user={state.user} stats={state.stats} selectedExam={state.selectedExam} onBack={() => navigateTo('dashboard')} onLogout={handleLogout} onUpdateUser={(u) => saveUser(u)} onExamChange={() => {}} onInstall={handleInstallClick} canInstall={canInstall} />}
            {state.view === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} />}
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
            user={state.user} 
            stats={state.stats} 
            darkMode={state.darkMode} 
            onToggleDarkMode={() => setState(s => ({ ...s, darkMode: !s.darkMode }))} 
            showTimer={state.showTimer} 
            onToggleTimer={() => setState(s => ({ ...s, showTimer: !s.showTimer }))} 
            language={state.language} 
            onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))} 
            currentTheme={state.theme} 
            onThemeChange={(t) => { setState(s => ({ ...s, theme: t })); applyTheme(t); }} 
            onNavigate={navigateTo} 
            onLogout={handleLogout} 
            onEnableNotifications={() => {}} 
            onInstall={handleInstallClick}
            canInstall={canInstall}
          />
          
          {state.view !== 'landing' && state.view !== 'login' && state.view !== 'signup' && state.view !== 'practice' && state.view !== 'paperView' && (
            <MobileBottomNav currentView={state.view} onNavigate={navigateTo} onAction={() => setShowPracticeConfig(true)} />
          )}
        </main>
      )}
    </div>
  );
};

export default App;
