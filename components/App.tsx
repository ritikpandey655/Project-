
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ExamType, Question, User, ViewState, ExamResult } from '../types';
import { EXAM_SUBJECTS, THEME_PALETTES } from '../constants';
import { 
  getUserPref, getStats, saveUserPref, updateStats, 
  saveUser, getUser, toggleBookmark, getExamConfig,
  updateUserActivity, updateUserSession, getExamHistory, INITIAL_STATS
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
import { PYQLibrary } from './PYQLibrary';
import { LogoIcon } from './LogoIcon';

// Firebase Engine
import { auth } from '../src/firebaseConfig';

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [generationLatency, setGenerationLatency] = useState<number>(0);
  
  const currentSessionId = useRef<string>(Date.now().toString());

  // --- THEME ENGINE ---
  const applyTheme = (themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', palette[500]);
    root.style.setProperty('--primary-50', palette[50]);
    root.style.setProperty('--primary-100', palette[100]);
    root.style.setProperty('--primary-200', palette[200]);
    root.style.setProperty('--primary-500', palette[500]);
    root.style.setProperty('--primary-600', palette[600]);
    root.style.setProperty('--primary-700', palette[700]);
    root.style.setProperty('--primary-900', palette[900]);
  };

  useEffect(() => {
    applyTheme(state.theme);
  }, [state.theme]);

  // --- APP LIFECYCLE ---
  useEffect(() => {
    const pwaHandler = (e: any) => { 
      e.preventDefault(); 
      setDeferredPrompt(e); 
    };
    window.addEventListener('beforeinstallprompt', pwaHandler);
    
    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    checkAIConnectivity();

    return () => {
      window.removeEventListener('beforeinstallprompt', pwaHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }, []);

  const navigateTo = useCallback((newView: ViewState) => {
    setState(prev => ({ ...prev, view: newView }));
    localStorage.setItem(LAST_VIEW_KEY, newView);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      
      setExamHistory(history);
      const lastView = localStorage.getItem(LAST_VIEW_KEY) as ViewState || 'dashboard';

      if (prefs.theme) applyTheme(prefs.theme);

      setState(prev => ({
        ...prev,
        user: profile,
        selectedExam: prefs.selectedExam,
        stats: statsData,
        showTimer: prefs.showTimer,
        darkMode: prefs.darkMode ?? true,
        language: prefs.language,
        theme: prefs.theme || 'PYQverse Prime',
        examConfig: config,
        view: initialDoubtQuery ? 'upload' : (['landing', 'login', 'signup'].includes(lastView) ? 'dashboard' : lastView)
      }));

      updateUserActivity(userId);
      updateUserSession(userId, currentSessionId.current);
    } catch (e) {
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
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

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
      alert("AI Service busy. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [state.selectedExam, practiceConfig, navigateTo]);

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
          const moreQs = await generateExamQuestions(state.selectedExam!, practiceConfig.subject, 5, 'Medium');
          setPracticeQueue(prev => [...prev, ...moreQs]);
        } catch (e) {}
        setIsFetchingMore(false);
      }
      setCurrentQIndex(prev => prev + 1);
    } else {
      if (currentQIndex < practiceQueue.length - 1) setCurrentQIndex(prev => prev + 1);
      else navigateTo('dashboard');
    }
  }, [practiceConfig, currentQIndex, practiceQueue, state.selectedExam, navigateTo]);

  const handleInstallApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      setDeferredPrompt(null);
    } else {
      alert("Use browser menu to 'Add to Home Screen'");
    }
  };

  const isEntryView = ['landing', 'login', 'signup', 'forgotPassword', 'privacy', 'terms'].includes(state.view);

  return (
    <div className={`${state.darkMode ? 'dark' : ''} min-h-screen font-sans bg-white dark:bg-[#0a0814] text-slate-900 dark:text-white transition-colors selection:bg-brand-500/30 flex flex-col`}>
      <BackgroundAnimation darkMode={state.darkMode} />
      
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-[10px] font-bold text-center py-1 uppercase tracking-widest sticky top-0 z-[100] shadow-lg">
          Offline Mode Active
        </div>
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

      <main className="relative z-10 flex-1 w-full flex flex-col">
        {!isEntryView && state.view !== 'practice' && (
          <header className="flex justify-between items-center px-6 py-4 pt-safe sticky top-0 bg-white/80 dark:bg-[#0a0814]/80 backdrop-blur-xl z-40 border-b border-white/5">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('dashboard')}>
                  <LogoIcon size="sm" />
                  <h1 className="font-display font-black text-2xl text-brand-600 dark:text-white tracking-tighter group-hover:scale-105 transition-transform">PYQverse</h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-white/5 hover:border-brand-500/30 active:scale-90 transition-all shadow-xl"
              >
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          {state.view === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} />}
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
