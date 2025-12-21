
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
import { generateExamQuestions, generateCurrentAffairs, generateSingleQuestion, generateNews, generateStudyNotes } from '../services/geminiService';
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
import { PaymentModal } from './PaymentModal';
import { Sidebar } from './Sidebar';
import { AdminDashboard } from './AdminDashboard';
import { OfflinePapersList } from './OfflinePapersList';
import { SmartAnalytics } from './SmartAnalytics';
import { Leaderboard } from './Leaderboard';
import { CurrentAffairsFeed } from './CurrentAffairsFeed';
import { PYQLibrary } from './PYQLibrary';
import { BackgroundAnimation } from './BackgroundAnimation';
import { MobileBottomNav } from './MobileBottomNav';
import { PrivacyPolicy } from './PrivacyPolicy';
import { LandingPage } from './LandingPage'; 
import { VerifyEmailScreen } from './VerifyEmailScreen';
import { auth, db } from '../src/firebaseConfig';

const LAST_VIEW_KEY = 'pyqverse_last_view';

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
  const [practiceConfig, setPracticeConfig] = useState({ mode: 'finite' as const, subject: 'Mixed', count: 10, topic: undefined as string | undefined });
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const currentSessionId = useRef<string>(Date.now().toString() + Math.random().toString());

  const applyTheme = useCallback((themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', palette[500]);
    Object.keys(palette).forEach(key => {
      // @ts-ignore
      root.style.setProperty(`--primary-${key}`, palette[key]);
    });
  }, []);

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
        view: lastView === 'landing' || lastView === 'login' ? 'dashboard' : lastView
      }));

      if (prefs.theme) applyTheme(prefs.theme);
      updateUserActivity(userId);
      updateUserSession(userId, currentSessionId.current);
    } catch (e) {
      console.error("User Data Load Error:", e);
      navigateTo('dashboard');
    }
  }, [applyTheme, navigateTo]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified && firebaseUser.email !== 'support@pyqverse.in') {
          setState(prev => ({ ...prev, user: { id: firebaseUser.uid, name: firebaseUser.displayName || 'User', email: firebaseUser.email || '' }, view: 'landing' }));
        } else {
          await loadUserData(firebaseUser.uid);
        }
      } else {
        setState(prev => ({ ...prev, user: null, view: 'landing' }));
      }
      setIsAppInitializing(false);
    });

    const fallbackTimer = setTimeout(() => setIsAppInitializing(false), 8000);
    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [loadUserData]);

  // Fix: Added handleStartPractice to handle practice session initialization
  const handleStartPractice = useCallback(async (conf?: any) => {
    const configToUse = conf || practiceConfig;
    if (!state.selectedExam) return;
    setIsLoading(true);
    setShowPracticeConfig(false);
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

  // Fix: Added handleNextQuestion to handle navigation between questions and endless mode pagination
  const handleNextQuestion = useCallback(async () => {
    if (practiceConfig.mode === 'endless') {
      if (currentQIndex >= practiceQueue.length - 3) {
        setIsFetchingMore(true);
        try {
          const moreQs = await generateExamQuestions(
            state.selectedExam!,
            practiceConfig.subject,
            10
          );
          setPracticeQueue(prev => [...prev, ...moreQs]);
        } catch (e) {
          console.error("Failed to fetch more questions:", e);
        }
        setIsFetchingMore(false);
      }
      setCurrentQIndex(prev => prev + 1);
    } else {
      if (currentQIndex < practiceQueue.length - 1) {
        setCurrentQIndex(prev => prev + 1);
      } else {
        navigateTo('dashboard');
      }
    }
  }, [practiceConfig.mode, practiceConfig.subject, currentQIndex, practiceQueue.length, state.selectedExam, navigateTo]);

  return (
    <div className={`${state.darkMode ? 'dark' : ''} min-h-screen font-sans transition-colors duration-300`}>
      <BackgroundAnimation />
      
      {isAppInitializing ? (
        <LoginScreen isInitializing={true} onLogin={() => {}} onNavigateToSignup={() => {}} onForgotPassword={() => {}} />
      ) : (
        <main className="relative z-10 min-h-screen w-full">
          {state.view !== 'landing' && state.view !== 'login' && state.view !== 'signup' && state.view !== 'privacy' && (
            <div className="flex justify-between items-center p-4 pt-safe sm:p-6 sticky top-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-40 border-b border-white/10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('dashboard')}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold font-display shadow-lg border border-white/20">PV</div>
                  <div>
                    <h1 className="font-display font-bold text-lg text-slate-800 dark:text-white leading-none">PYQverse</h1>
                    <span className="text-[9px] font-bold text-orange-500 tracking-widest uppercase">Universe</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-all">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  </button>
                </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            {state.view === 'landing' && <LandingPage onLogin={() => navigateTo('login')} onSignup={() => navigateTo('signup')} />}
            {state.view === 'login' && <LoginScreen onLogin={(user) => loadUserData(user.id)} onNavigateToSignup={() => navigateTo('signup')} onForgotPassword={() => navigateTo('forgotPassword')} isOnline={isOnline} onNavigateToPrivacy={() => navigateTo('privacy')} />}
            {state.view === 'signup' && <SignupScreen onSignup={() => {}} onBackToLogin={() => navigateTo('login')} />}
            {state.view === 'forgotPassword' && <ForgotPasswordScreen onBackToLogin={() => navigateTo('login')} />}
            {state.view === 'dashboard' && <Dashboard stats={state.stats} user={state.user} onStartPractice={() => setShowPracticeConfig(true)} onUpload={() => navigateTo('upload')} onGeneratePaper={() => navigateTo('paperGenerator')} onOpenBookmarks={() => navigateTo('bookmarks')} onOpenAnalytics={() => navigateTo('analytics')} onOpenLeaderboard={() => navigateTo('leaderboard')} onOpenPYQLibrary={() => navigateTo('pyqLibrary')} selectedExam={state.selectedExam} darkMode={state.darkMode} language={state.language} onToggleTimer={() => {}} onToggleDarkMode={() => {}} onStartCurrentAffairs={() => {}} onReadCurrentAffairs={() => {}} onReadNotes={() => {}} onEnableNotifications={() => {}} showTimer={true} />}
            {state.view === 'practice' && practiceQueue[currentQIndex] && (
                <QuestionCard 
                    question={practiceQueue[currentQIndex]} 
                    onAnswer={(isCorrect) => state.user && updateStats(state.user.id, isCorrect, practiceQueue[currentQIndex].subject || 'General', state.selectedExam || '')} 
                    onNext={handleNextQuestion} 
                    isLast={currentQIndex === practiceQueue.length - 1 && practiceConfig.mode !== 'endless'} 
                    isLoadingNext={isFetchingMore}
                    language={state.language}
                    onToggleLanguage={() => setState(s => ({ ...s, language: s.language === 'en' ? 'hi' : 'en' }))}
                    onBookmarkToggle={(q) => state.user && toggleBookmark(state.user.id, q)}
                />
            )}
            {state.view === 'upload' && state.user && state.selectedExam && <UploadForm userId={state.user.id} examType={state.selectedExam} onSuccess={() => navigateTo('dashboard')} />}
            {state.view === 'paperGenerator' && state.selectedExam && <PaperGenerator examType={state.selectedExam} onGenerate={(p) => { setState(s => ({ ...s, generatedPaper: p })); navigateTo('paperView'); }} onBack={() => navigateTo('dashboard')} onExamChange={() => {}} />}
            {state.view === 'paperView' && state.generatedPaper && state.user && <PaperView paper={state.generatedPaper} userId={state.user.id} onClose={() => navigateTo('dashboard')} language={state.language} />}
            {state.view === 'leaderboard' && state.user && <Leaderboard user={state.user} onBack={() => navigateTo('dashboard')} />}
            {state.view === 'analytics' && <SmartAnalytics stats={state.stats} history={[]} onBack={() => navigateTo('dashboard')} />}
            {state.view === 'pyqLibrary' && state.selectedExam && <PYQLibrary examType={state.selectedExam} onBack={() => navigateTo('dashboard')} language={state.language} />}
            {state.view === 'privacy' && <PrivacyPolicy onBack={() => navigateTo('dashboard')} />}
            {state.view === 'profile' && state.user && state.selectedExam && <ProfileScreen user={state.user} stats={state.stats} selectedExam={state.selectedExam} onBack={() => navigateTo('dashboard')} onLogout={() => auth.signOut()} onUpdateUser={(u) => saveUser(u)} onExamChange={() => {}} />}
            {state.view === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} />}
          </div>

          {showPracticeConfig && state.selectedExam && (
            <PracticeConfigModal 
                examType={state.selectedExam} 
                onClose={() => setShowPracticeConfig(false)} 
                onStart={(conf) => { setPracticeConfig({ ...conf, mode: conf.mode as any }); handleStartPractice(conf); }} 
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
            onLogout={() => auth.signOut()} 
            onEnableNotifications={() => {}} 
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
