import React, { useState, useEffect } from 'react';
import { AppState, ExamType, Question, User, ViewState, QuestionPaper } from './types';
import { EXAM_SUBJECTS, THEME_PALETTES } from './constants';
import { 
  getUserPref, 
  getStats, 
  saveUserPref, 
  updateStats, 
  getUserQuestions,
  saveUser,
  getUser,
  removeUser,
  INITIAL_STATS
} from './services/storageService';
import { generateExamQuestions } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import { QuestionCard } from './components/QuestionCard';
import { UploadForm } from './components/UploadForm';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { Timer } from './components/Timer';
import { Tutorial } from './components/Tutorial';
import { ProfileScreen } from './components/ProfileScreen';
import { PaperGenerator } from './components/PaperGenerator';
import { PaperView } from './components/PaperView';
import { PracticeConfigModal } from './components/PracticeConfigModal';
import { PaymentModal } from './components/PaymentModal';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'login',
    selectedExam: null,
    stats: INITIAL_STATS,
    user: null,
    showTimer: true,
    generatedPaper: null,
    darkMode: false,
    language: 'en',
    theme: 'PYQverse Prime'
  });

  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  
  // Practice Config State
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState<{ mode: 'finite' | 'endless'; subject: string; count: number }>({ 
    mode: 'finite', 
    subject: 'Mixed',
    count: 10 
  });
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Helper to apply theme colors to root
  const applyTheme = (themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    
    Object.keys(palette).forEach(key => {
      // @ts-ignore
      root.style.setProperty(`--primary-${key}`, palette[key]);
    });
  };

  // Initialize App & PWA Install Prompt
  useEffect(() => {
    const user = getUser();
    if (user) {
      const { selectedExam, showTimer, hasSeenTutorial, darkMode, language, theme } = getUserPref(user.id);
      const userStats = getStats(user.id);
      
      let nextView: ViewState = 'onboarding';
      if (selectedExam) {
        nextView = hasSeenTutorial ? 'dashboard' : 'tutorial';
      }

      setState(prev => ({ ...prev, user, selectedExam, stats: userStats, view: nextView, showTimer, darkMode, language, theme: theme || 'PYQverse Prime' }));
      
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      applyTheme(theme || 'PYQverse Prime');

    } else {
      setState(prev => ({ ...prev, view: 'login' }));
      applyTheme('PYQverse Prime');
    }
    setIsAppInitializing(false);

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle browser back button (History API)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setState(prev => ({ ...prev, view: event.state.view }));
      } else {
        if (state.user) {
          setState(prev => ({ ...prev, view: 'dashboard' }));
        } else {
          setState(prev => ({ ...prev, view: 'login' }));
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.user]);

  const navigateTo = (view: ViewState) => {
    window.history.pushState({ view }, '', '');
    setState(prev => ({ ...prev, view }));
  };

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSHelp(true);
    } else if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };

  // Notification Logic
  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification("PYQverse Enabled!", { 
          body: "We'll remind you to keep your learning streak alive!",
          icon: 'https://api.dicebear.com/9.x/initials/png?seed=PV&backgroundColor=5B2EFF',
        });
        
        // Schedule a local simulation of a push notification if supported by SW
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
           navigator.serviceWorker.controller.postMessage({
             type: 'SCHEDULE_REMINDER',
             delay: 24 * 60 * 60 * 1000 // 24 hours
           });
        }
      } else {
        alert("Permission denied. Please enable notifications in your browser settings.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (user: User) => {
    saveUser(user);
    const { selectedExam, showTimer, hasSeenTutorial, darkMode, language, theme } = getUserPref(user.id);
    const userStats = getStats(user.id);
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    applyTheme(theme || 'PYQverse Prime');

    let nextView: ViewState = 'onboarding';
    if (selectedExam) {
       nextView = hasSeenTutorial ? 'dashboard' : 'tutorial';
    }
    
    setState(prev => ({ 
      ...prev, 
      user, 
      selectedExam, 
      stats: userStats,
      view: nextView,
      showTimer,
      darkMode,
      language,
      theme: theme || 'PYQverse Prime'
    }));
    window.history.pushState({ view: nextView }, '', '');
  };

  const handleSignup = (user: User, exam: ExamType) => {
    saveUser(user);
    saveUserPref(user.id, { selectedExam: exam });
    const userStats = getStats(user.id);

    const nextView = 'tutorial';
    setState(prev => ({ 
      ...prev, 
      user, 
      selectedExam: exam,
      stats: userStats,
      view: nextView,
      showTimer: true,
      darkMode: false,
      language: 'en',
      theme: 'PYQverse Prime'
    }));
    applyTheme('PYQverse Prime');
    window.history.pushState({ view: nextView }, '', '');
  };

  const handleUpdateUser = (updatedUser: User) => {
    saveUser(updatedUser);
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  const handleLogout = () => {
    removeUser();
    document.documentElement.classList.remove('dark');
    applyTheme('PYQverse Prime');
    setState(prev => ({
      ...prev,
      user: null,
      view: 'login',
      selectedExam: null,
      stats: INITIAL_STATS,
      darkMode: false,
      language: 'en',
      theme: 'PYQverse Prime'
    }));
    window.history.pushState({ view: 'login' }, '', '');
  };

  const handleExamSelect = (exam: ExamType) => {
    if (!state.user) return;
    saveUserPref(state.user.id, { selectedExam: exam });
    setState(prev => ({ ...prev, selectedExam: exam }));
  };

  const handleExamSelectFromOnboarding = (exam: ExamType) => {
    handleExamSelect(exam);
    navigateTo('tutorial');
  }
  
  const finishTutorial = () => {
    if (!state.user) return;
    saveUserPref(state.user.id, { hasSeenTutorial: true });
    navigateTo('dashboard');
  };
  
  const toggleTimer = () => {
    if (!state.user) return;
    const newState = !state.showTimer;
    saveUserPref(state.user.id, { showTimer: newState });
    setState(prev => ({ ...prev, showTimer: newState }));
  };

  const toggleDarkMode = () => {
    if (!state.user) return;
    const newState = !state.darkMode;
    saveUserPref(state.user.id, { darkMode: newState });
    setState(prev => ({ ...prev, darkMode: newState }));
    if (newState) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleLanguage = () => {
    if (!state.user) return;
    const newLang = state.language === 'en' ? 'hi' : 'en';
    saveUserPref(state.user.id, { language: newLang });
    setState(prev => ({ ...prev, language: newLang }));
  };

  const handleThemeChange = (newTheme: string) => {
    if (!state.user) return;
    saveUserPref(state.user.id, { theme: newTheme });
    setState(prev => ({ ...prev, theme: newTheme }));
    applyTheme(newTheme);
  };

  const handleStartPractice = () => {
    setShowPracticeConfig(true);
  };

  const startPracticeSession = async (config: { subject: string, count: number, mode: 'finite' | 'endless' }) => {
    if (!state.selectedExam || !state.user) return;
    
    setShowPracticeConfig(false);
    setPracticeConfig({ mode: config.mode, subject: config.subject, count: config.count });
    setIsLoading(true);
    
    try {
      const userQuestions = getUserQuestions(state.user.id).filter(q => q.examType === state.selectedExam);
      const shuffledUserQ = userQuestions.sort(() => 0.5 - Math.random()).slice(0, 3);

      let subjectToGen = config.subject;
      if (config.subject === 'Mixed') {
        const subjects = EXAM_SUBJECTS[state.selectedExam];
        subjectToGen = subjects[Math.floor(Math.random() * subjects.length)];
      }

      // Initial batch
      const batchSize = Math.min(config.count, 5); 
      const aiQuestions = await generateExamQuestions(state.selectedExam, subjectToGen, batchSize);

      const combined = [...shuffledUserQ, ...aiQuestions];
      setPracticeQueue(combined.sort(() => 0.5 - Math.random()));
      setCurrentQIndex(0);
      navigateTo('practice');
      
    } catch (error) {
      console.error("Practice load failed", error);
      alert("Failed to generate practice session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    const currentQ = practiceQueue[currentQIndex];
    if (!state.user) return;
    
    updateStats(state.user.id, isCorrect, currentQ.subject || 'General', currentQ.examType);
    setState(prev => ({ ...prev, stats: getStats(state.user!.id) }));
  };

  // Enhanced "Next" logic for Endless/Marathon modes
  const nextQuestion = async () => {
    const isEnd = currentQIndex >= practiceQueue.length - 1;
    
    // Check if we need more questions
    const shouldFetchMore = 
        (practiceConfig.mode === 'endless') || 
        (practiceConfig.mode === 'finite' && practiceQueue.length < practiceConfig.count);

    if (shouldFetchMore && !isFetchingMore) {
      const remaining = practiceQueue.length - (currentQIndex + 1);
      
      // If running low on questions (less than 3 remaining)
      if (remaining < 3) {
        setIsFetchingMore(true);
        
        let subjectToGen = practiceConfig.subject;
        if (practiceConfig.subject === 'Mixed') {
           const subjects = EXAM_SUBJECTS[state.selectedExam!];
           subjectToGen = subjects[Math.floor(Math.random() * subjects.length)];
        }

        let batchSize = 5;
        // If finite mode, don't over-fetch past the target count
        if (practiceConfig.mode === 'finite') {
            const needed = practiceConfig.count - practiceQueue.length;
            batchSize = Math.min(5, needed);
        }

        if (batchSize > 0) {
            generateExamQuestions(state.selectedExam!, subjectToGen, batchSize)
            .then(newQs => {
                if (newQs.length > 0) {
                  setPracticeQueue(prev => [...prev, ...newQs]);
                }
            })
            .catch(err => console.error("Background fetch failed", err))
            .finally(() => setIsFetchingMore(false));
        } else {
            setIsFetchingMore(false);
        }
      }
    }

    if (!isEnd) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      // If we are at the end...
      if (isFetchingMore || shouldFetchMore) {
         // Wait for fetch. The UI will show loading state via `isLoadingNext` prop passed to QuestionCard
         return; 
      } else {
         // Truly done
         navigateTo('dashboard');
      }
    }
  };

  const handlePaperGenerated = (paper: QuestionPaper) => {
    setState(prev => ({ ...prev, generatedPaper: paper }));
    navigateTo('paperView');
  };
  
  const handlePaperExit = () => {
    navigateTo('dashboard');
  };

  const handlePaymentSuccess = () => {
    if (state.user) {
      const updatedUser: User = { ...state.user, isPro: true };
      saveUser(updatedUser);
      setState(prev => ({ ...prev, user: updatedUser }));
      setShowPaymentModal(false);
    }
  };

  if (isAppInitializing) return null;

  if (state.view === 'login') {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onNavigateToSignup={() => navigateTo('signup')} 
        onForgotPassword={() => navigateTo('forgotPassword')}
      />
    );
  }

  if (state.view === 'signup') {
    return <SignupScreen onSignup={handleSignup} onBackToLogin={() => navigateTo('login')} />;
  }

  if (state.view === 'forgotPassword') {
    return <ForgotPasswordScreen onBackToLogin={() => navigateTo('login')} />;
  }
  
  if (state.view === 'tutorial') {
    return <Tutorial onComplete={finishTutorial} />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <div className="w-16 h-16 border-4 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Curating your revision set...</p>
      </div>
    );
  }

  if (state.view === 'onboarding' || !state.selectedExam) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6 relative transition-colors duration-200">
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-6 text-sm text-slate-400 hover:text-red-500"
        >
          Logout
        </button>
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm animate-float">
             <span className="text-4xl font-bold text-brand-purple">PV</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white mb-3">Welcome to PYQverse!</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Select your target exam to enter the universe of preparation.</p>
          
          <div className="grid gap-3">
            {Object.values(ExamType).map((exam) => (
              <button
                key={exam}
                onClick={() => handleExamSelectFromOnboarding(exam)}
                className="w-full p-4 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-purple hover:bg-brand-purple/5 dark:hover:bg-brand-purple/20 transition-all font-medium text-slate-700 dark:text-slate-200 flex justify-between items-center group bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:scale-[1.02]"
              >
                {exam}
                <span className="opacity-0 group-hover:opacity-100 text-brand-purple transition-opacity">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (state.view === 'paperView' && state.generatedPaper) {
     return (
       <PaperView 
         paper={state.generatedPaper}
         onClose={handlePaperExit}
         language={state.language}
         onToggleLanguage={toggleLanguage}
       />
     );
  }

  // Check if we are at the end of the queue AND waiting for more questions
  const isWaitingForMore = (currentQIndex >= practiceQueue.length - 1) && 
                           (isFetchingMore || 
                            (practiceConfig.mode === 'endless') || 
                            (practiceConfig.mode === 'finite' && practiceQueue.length < practiceConfig.count));

  // Is this truly the last question? (Finite mode reached count, or queue ended and no more fetch)
  const isLastQuestion = practiceConfig.mode === 'finite' && 
                         practiceQueue.length >= practiceConfig.count && 
                         currentQIndex === practiceQueue.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
      
      {showPaymentModal && (
        <PaymentModal 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 safe-top transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => navigateTo('dashboard')}
          >
            {/* Nav Logo */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <span className="text-white font-display font-bold text-xs">PV</span>
            </div>
            <span className="font-bold font-display text-slate-800 dark:text-white hidden sm:block tracking-tight group-hover:text-brand-purple transition-colors">PYQverse</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {(installPrompt || isIOS) && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-1 bg-brand-purple text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-all active:scale-95 animate-pulse-glow"
              >
                Install App
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
              <button 
                onClick={() => navigateTo('dashboard')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${state.view === 'dashboard' ? 'bg-white dark:bg-slate-600 text-brand-purple dark:text-brand-purple/80 shadow-sm scale-105 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Dash
              </button>
              <button 
                onClick={() => navigateTo('upload')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${state.view === 'upload' ? 'bg-white dark:bg-slate-600 text-brand-purple dark:text-brand-purple/80 shadow-sm scale-105 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Add Notes
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600"></div>

            <div className="flex items-center gap-3">
               <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{state.user?.name}</p>
                  <div className="flex items-center justify-end gap-1">
                     <p className="text-[10px] text-brand-purple dark:text-brand-purple/80 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 rounded-md inline-block">{state.selectedExam}</p>
                     {state.user?.isPro && (
                       <span className="text-[10px] bg-brand-yellow text-slate-900 px-1 rounded font-bold">PRO</span>
                     )}
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                 <button 
                    onClick={() => navigateTo('profile')}
                    className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm hover:ring-2 hover:ring-brand-purple transition-all active:scale-95" 
                    title="View Profile"
                 >
                    {state.user?.photoURL ? (
                      <img src={state.user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-purple/10 dark:bg-brand-purple/30 text-brand-purple dark:text-brand-purple/80 font-bold">
                        {state.user?.name?.[0] || 'U'}
                      </div>
                    )}
                 </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24 safe-bottom animate-slide-up-fade">
        {(installPrompt || isIOS) && (
          <div className="sm:hidden mb-4 bg-brand-purple text-white p-3 rounded-xl flex items-center justify-between shadow-lg animate-pop-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl font-display font-bold">PV</div>
              <div>
                <p className="font-bold text-sm">Install PYQverse</p>
                <p className="text-xs text-indigo-200">Practice offline & better experience</p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="bg-white text-brand-purple px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform"
            >
              Install
            </button>
          </div>
        )}

        {showPracticeConfig && state.selectedExam && (
          <PracticeConfigModal 
            examType={state.selectedExam}
            onStart={startPracticeSession}
            onClose={() => setShowPracticeConfig(false)}
            onExamChange={handleExamSelect}
          />
        )}

        {showIOSHelp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowIOSHelp(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Install on iOS</h3>
                <button onClick={() => setShowIOSHelp(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <p>To install the app on your iPhone or iPad:</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <span className="font-bold text-brand-purple dark:text-indigo-400">1.</span>
                  <span>Tap the <strong className="text-slate-800 dark:text-white">Share</strong> button <svg className="w-4 h-4 inline text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> in Safari.</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <span className="font-bold text-brand-purple dark:text-indigo-400">2.</span>
                  <span>Scroll down and tap <strong className="text-slate-800 dark:text-white">Add to Home Screen</strong>.</span>
                </div>
              </div>
              <button 
                onClick={() => setShowIOSHelp(false)}
                className="w-full mt-6 bg-brand-purple text-white font-bold py-3 rounded-xl active:scale-95 transition-transform"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {state.view === 'dashboard' && (
          <Dashboard 
            stats={state.stats} 
            showTimer={state.showTimer}
            darkMode={state.darkMode}
            user={state.user}
            onStartPractice={handleStartPractice} 
            onUpload={() => navigateTo('upload')} 
            onToggleTimer={toggleTimer}
            onToggleDarkMode={toggleDarkMode}
            onGeneratePaper={() => navigateTo('paperGenerator')}
            onEnableNotifications={enableNotifications}
            language={state.language}
            onToggleLanguage={toggleLanguage}
            currentTheme={state.theme}
            onThemeChange={handleThemeChange}
            onUpgrade={() => setShowPaymentModal(true)}
          />
        )}

        {state.view === 'paperGenerator' && state.user && (
          <PaperGenerator 
            examType={state.selectedExam!} 
            onGenerate={handlePaperGenerated}
            onBack={() => navigateTo('dashboard')}
            onExamChange={handleExamSelect}
          />
        )}
        
        {state.view === 'profile' && state.user && (
          <ProfileScreen 
            user={state.user}
            stats={state.stats}
            selectedExam={state.selectedExam!}
            onUpdateUser={handleUpdateUser}
            onBack={() => navigateTo('dashboard')}
            onLogout={handleLogout}
          />
        )}

        {state.view === 'upload' && state.user && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <button 
              onClick={() => navigateTo('dashboard')}
              className="mb-4 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-purple dark:hover:text-brand-purple/80 flex items-center gap-1 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <UploadForm 
              userId={state.user.id}
              examType={state.selectedExam!} 
              onSuccess={() => {
                alert("Question saved to your revision bank!");
                navigateTo('dashboard');
              }} 
            />
          </div>
        )}

        {state.view === 'practice' && (
          practiceQueue.length > 0 ? (
            <div className="h-full flex flex-col justify-center py-4 animate-fade-in">
               <div className="mb-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 px-2">
                  <div className="flex items-center gap-2">
                    <span>Question {currentQIndex + 1}</span>
                    {practiceConfig.mode === 'endless' && (
                       <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-brand-purple dark:text-brand-purple/80 rounded text-xs font-bold">∞</span>
                    )}
                    {practiceConfig.mode !== 'endless' && (
                       <span>of {Math.max(practiceConfig.count, practiceQueue.length)}</span>
                    )}
                  </div>
                  
                  {state.showTimer && <Timer />}

                  <button 
                    onClick={() => navigateTo('dashboard')}
                    className="hover:text-red-500 font-medium transition-colors hover:scale-105 active:scale-95"
                  >
                    {practiceConfig.mode === 'endless' ? 'Finish' : 'Quit'}
                  </button>
               </div>
              <QuestionCard 
                question={practiceQueue[currentQIndex]} 
                onAnswer={handleAnswer}
                onNext={nextQuestion}
                isLast={isLastQuestion}
                isLoadingNext={isWaitingForMore}
                language={state.language}
                onToggleLanguage={toggleLanguage}
              />
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                <div className="text-4xl mb-4">😕</div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No questions available</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-xs">
                   We couldn't generate questions right now. Please check your connection or try a different subject.
                </p>
                <button 
                  onClick={() => navigateTo('dashboard')}
                  className="bg-brand-purple text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                   Return to Dashboard
                </button>
             </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;