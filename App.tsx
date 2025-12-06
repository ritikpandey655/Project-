
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ExamType, Question, User, ViewState } from './types';
import { EXAM_SUBJECTS, THEME_PALETTES, TECHNICAL_EXAMS, MONTHS } from './constants';
import { 
  getUserPref, 
  getStats, 
  saveUserPref, 
  updateStats, 
  saveUser,
  getUser,
  INITIAL_STATS,
  toggleBookmark,
  getStoredQOTD,
  saveQOTD,
  getOfficialQuestions,
  getExamConfig,
  updateUserActivity
} from './services/storageService';
import { generateExamQuestions, generateCurrentAffairs, generateSingleQuestion, generateNews, generateStudyNotes } from './services/geminiService';
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
import { Sidebar } from './components/Sidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { OfflinePapersList } from './components/OfflinePapersList';
import { SmartAnalytics } from './components/SmartAnalytics';
import { Leaderboard } from './components/Leaderboard';
import { CurrentAffairsFeed } from './components/CurrentAffairsFeed';
import { PYQLibrary } from './components/PYQLibrary';
import { BackgroundAnimation } from './components/BackgroundAnimation';
import { auth } from './src/firebaseConfig';
import { onAuthStateChanged, signOut } from "firebase/auth";

const LAST_VIEW_KEY = 'pyqverse_last_view';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'login', // Default to login for app-like feel
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
    examConfig: EXAM_SUBJECTS as unknown as Record<string, string[]> // Default to static
  });

  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Practice Config State
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState<{ mode: 'finite' | 'endless'; subject: string; count: number; topic?: string }>({ 
    mode: 'finite', 
    subject: 'Mixed',
    count: 10 
  });
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const applyTheme = useCallback((themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    Object.keys(palette).forEach(key => {
      // @ts-ignore
      root.style.setProperty(`--primary-${key}`, palette[key]);
    });
  }, []);

  // --- SMART REMINDER LOGIC ---
  const scheduleStudyReminder = async () => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          const delay = 24 * 60 * 60 * 1000; 
          registration.active.postMessage({
            type: 'SCHEDULE_REMINDER',
            delay: delay
          });
        }
      } catch (e) {
        console.log("SW Message Failed:", e);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support notifications.");
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("Notifications Enabled! 🔔", {
        body: "We will remind you to study if you miss a day.",
        icon: '/icon.svg'
      });
      scheduleStudyReminder();
    }
  };

  // --- PWA Advanced Registration ---
  useEffect(() => {
    const registerPWAFeatures = async () => {
      if ('launchQueue' in window) {
        // @ts-ignore
        window.launchQueue.setConsumer(async (launchParams) => {
          if (launchParams.files && launchParams.files.length) {
            if (state.user) setState(prev => ({ ...prev, view: 'upload' }));
          }
        });
      }
    };
    registerPWAFeatures();
  }, [state.user]);

  const loadUserData = useCallback(async (userId: string) => {
    const userProfile = await getUser(userId);
    if (!userProfile) return;

    if (userProfile.email && (userProfile.email === 'support@pyqverse.in' || userProfile.email.includes('admin'))) {
        userProfile.isAdmin = true;
    }

    updateUserActivity(userId);

    const prefsPromise = getUserPref(userId);
    const statsPromise = getStats(userId);
    const qotdPromise = getStoredQOTD(userId);
    const examsPromise = getExamConfig();

    const [prefs, stats, qotd, dynamicExams] = await Promise.all([prefsPromise, statsPromise, qotdPromise, examsPromise]);

    if (prefs.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    applyTheme(prefs.theme || 'PYQverse Prime');

    setState(prev => ({
      ...prev,
      user: userProfile,
      stats: stats,
      selectedExam: prefs.selectedExam,
      showTimer: prefs.showTimer,
      darkMode: prefs.darkMode,
      language: prefs.language,
      theme: prefs.theme,
      qotd: qotd,
      examConfig: dynamicExams
    }));

    scheduleStudyReminder();

    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const lastView = localStorage.getItem(LAST_VIEW_KEY) as ViewState;
    
    if (prefs.selectedExam) {
       if (action === 'upload') {
          setState(prev => ({ ...prev, view: 'upload' }));
       } else if (action === 'practice') {
          setState(prev => ({ ...prev, view: 'dashboard' }));
          setShowPracticeConfig(true);
       } else if (lastView && ['dashboard', 'upload', 'profile', 'admin', 'downloads'].includes(lastView)) {
          setState(prev => ({ ...prev, view: lastView }));
       } else {
          setState(prev => ({ ...prev, view: prefs.hasSeenTutorial ? 'dashboard' : 'tutorial' }));
       }
       
       if (!qotd && navigator.onLine) {
          generateSingleQuestion(prefs.selectedExam, (dynamicExams as any)[prefs.selectedExam]?.[0] || 'General', 'QOTD').then(q => {
             if(q) saveQOTD(userId, { id: `qotd-${Date.now()}`, ...q, examType: prefs.selectedExam!, subject: 'QOTD', source: 'PYQ_AI', correctIndex: q.correctIndex || 0, options: q.options || [], text: q.text || '', createdAt: Date.now() } as Question);
          });
       }
    } else {
       setState(prev => ({ ...prev, view: 'onboarding' }));
    }
  }, [applyTheme]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isAppInitializing) {
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      clearTimeout(timeoutId);
      if (currentUser) {
        loadUserData(currentUser.uid).then(() => setIsAppInitializing(false));
      } else {
        setState(prev => ({ ...prev, user: null, view: 'login' }));
        setIsAppInitializing(false);
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [loadUserData]);

  const navigateTo = useCallback((view: ViewState) => {
    setState(prev => ({ ...prev, view }));
    setIsSidebarOpen(false);
    if (!['practice', 'paperView', 'paperGenerator', 'login', 'signup'].includes(view)) {
       localStorage.setItem(LAST_VIEW_KEY, view);
    }
  }, []);

  const handleLogin = useCallback((user: User) => {}, []);

  const handleSignup = useCallback(async (user: User, exam: ExamType) => {
    await saveUserPref(user.id, { selectedExam: exam });
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const handleExamSelect = useCallback(async (exam: ExamType) => {
    if (!state.user) return;
    setState(prev => ({ ...prev, selectedExam: exam }));
    saveUserPref(state.user.id, { selectedExam: exam });
  }, [state.user]);

  const toggleDarkMode = useCallback(async () => {
    if (!state.user) return;
    const newState = !state.darkMode;
    setState(prev => ({ ...prev, darkMode: newState }));
    if (newState) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    saveUserPref(state.user.id, { darkMode: newState });
  }, [state.user, state.darkMode]);

  const toggleTimer = useCallback(async () => {
    if (!state.user) return;
    const newState = !state.showTimer;
    setState(prev => ({ ...prev, showTimer: newState }));
    saveUserPref(state.user.id, { showTimer: newState });
  }, [state.user, state.showTimer]);

  const toggleLanguage = useCallback(async () => {
     const newLang = state.language === 'en' ? 'hi' : 'en';
     setState(prev => ({...prev, language: newLang}));
     if(state.user) saveUserPref(state.user.id, { language: newLang });
  }, [state.user, state.language]);

  const changeTheme = useCallback(async (t: string) => {
     setState(prev => ({...prev, theme: t}));
     applyTheme(t);
     if(state.user) saveUserPref(state.user.id, { theme: t });
  }, [state.user, applyTheme]);

  // --- PROGRESSIVE STREAMING HELPER ---
  const progressiveFetch = useCallback((
    exam: string,
    subject: string,
    targetCount: number,
    currentCount: number,
    topic?: string,
    isCurrentAffairs: boolean = false
  ) => {
      // Background Loader Logic
      let loaded = currentCount;
      const BATCH_SIZE = 5; // Fetch in small batches for responsiveness

      const fetchNext = async () => {
          // Check if we already have enough questions in the queue
          // Note: accessing state in async loop is tricky, relying on 'loaded' tracker
          if (loaded >= targetCount) return;
          
          const needed = Math.min(BATCH_SIZE, targetCount - loaded);
          if (needed <= 0) return;
          
          try {
              setIsFetchingMore(true);
              let newQs: Question[] = [];
              if (isCurrentAffairs) {
                  newQs = await generateCurrentAffairs(exam, needed);
              } else {
                  newQs = await generateExamQuestions(exam, subject, needed, 'Medium', topic ? [topic] : []);
              }

              if (newQs.length > 0) {
                  setPracticeQueue(prev => {
                      const existingIds = new Set(prev.map(q => q.id));
                      const unique = newQs.filter(q => !existingIds.has(q.id));
                      return [...prev, ...unique];
                  });
                  loaded += newQs.length;
                  // Recursive call for next batch
                  setTimeout(fetchNext, 800); 
              } else {
                  // Stop if generation fails to return items (avoids infinite loop)
                  setIsFetchingMore(false);
              }
          } catch (e) {
              console.error("Stream error", e);
              setIsFetchingMore(false);
          }
      };
      
      fetchNext();
  }, []);

  const startPracticeSession = useCallback(async (config: { subject: string; count: number; mode: 'finite' | 'endless'; topic?: string }) => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    setShowPracticeConfig(false);
    setIsLoading(true);
    setPracticeConfig(config);
    
    const INITIAL_BATCH_SIZE = 10; // "Phle 10 question show kare"
    const initialLoadCount = Math.min(config.count, INITIAL_BATCH_SIZE);

    // 1. Fetch First Batch (Fast)
    let initialQuestions: Question[] = [];
    
    // Try cache first
    const cacheQs = await getOfficialQuestions(exam, config.subject, initialLoadCount);
    if (cacheQs.length >= initialLoadCount) {
        initialQuestions = cacheQs;
    } else {
        const needed = initialLoadCount - cacheQs.length;
        const aiQs = await generateExamQuestions(exam, config.subject, needed, 'Medium', config.topic ? [config.topic] : []);
        initialQuestions = [...cacheQs, ...aiQs];
    }

    if (initialQuestions.length === 0) {
        // Fallback retry
        initialQuestions = await generateExamQuestions(exam, config.subject, 5, 'Medium', config.topic ? [config.topic] : []);
    }

    setPracticeQueue(initialQuestions);
    setCurrentQIndex(0);
    setIsLoading(false); 
    navigateTo('practice'); 

    // 2. Stream Remaining Questions (Background)
    if (config.count > initialQuestions.length || config.mode === 'endless') {
        const target = config.mode === 'endless' ? 1000 : config.count;
        progressiveFetch(exam, config.subject, target, initialQuestions.length, config.topic, false);
    }

  }, [state.user, state.selectedExam, navigateTo, progressiveFetch]);

  const handleNextQuestion = useCallback(async () => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    const nextIndex = currentQIndex + 1;
    
    // Trigger more if endless and running low
    if (practiceConfig.mode === 'endless' && nextIndex >= practiceQueue.length - 3 && !isFetchingMore) {
        progressiveFetch(exam, practiceConfig.subject, practiceQueue.length + 10, practiceQueue.length, practiceConfig.topic, false);
    }

    if (nextIndex < practiceQueue.length) {
      setCurrentQIndex(nextIndex);
    } else {
      navigateTo('stats');
      scheduleStudyReminder();
    }
  }, [currentQIndex, practiceConfig, practiceQueue.length, isFetchingMore, state.user, state.selectedExam, navigateTo, progressiveFetch]);

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    const exam = state.selectedExam;
    const user = state.user;
    if (!user || !exam) return;
    
    const currentQ = practiceQueue[currentQIndex];
    const subject = currentQ.subject || 'General';
    
    setState(prev => {
        const newStats = { ...prev.stats };
        newStats.totalAttempted++;
        if (isCorrect) newStats.totalCorrect++;
        if (!newStats.subjectPerformance[subject]) newStats.subjectPerformance[subject] = { correct: 0, total: 0 };
        newStats.subjectPerformance[subject].total++;
        if (isCorrect) newStats.subjectPerformance[subject].correct++;
        return { ...prev, stats: newStats };
    });

    updateStats(user.id, isCorrect, subject, exam);
  }, [practiceQueue, currentQIndex, state.user, state.selectedExam]);

  const handleCurrentAffairs = useCallback(async () => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    setIsLoading(true);
    
    // Initial 10
    generateCurrentAffairs(exam, 10).then(questions => {
        setPracticeQueue(questions);
        setCurrentQIndex(0);
        setPracticeConfig({ mode: 'finite', count: 50, subject: 'Current Affairs' }); // Increased to 50
        setIsLoading(false);
        navigateTo('practice');
        
        // Stream remaining 40
        progressiveFetch(exam, 'Current Affairs', 50, questions.length, undefined, true);
    });
  }, [state.user, state.selectedExam, navigateTo, progressiveFetch]);

  const handleNewsFilterChange = useCallback(async (filters: { month?: string; year?: number; category?: string; subject?: string }, isLoadMore: boolean = false) => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    
    let items;
    if (filters.subject) {
       items = await generateStudyNotes(exam, filters.subject);
    } else {
       items = await generateNews(exam, filters.month, filters.year, filters.category);
    }
    
    setState(prev => ({ 
        ...prev, 
        newsFeed: isLoadMore ? [...(prev.newsFeed || []), ...items] : items 
    }));
  }, [state.user, state.selectedExam]);

  const handleFetchNotes = useCallback(async () => {
     const exam = state.selectedExam;
     if (!state.user || !exam) return;
     setIsLoading(true); 
     const defaultSubject = (state.examConfig as any)[exam]?.[0] || 'General';
     generateStudyNotes(exam, defaultSubject).then(items => {
       setState(prev => ({ ...prev, newsFeed: items }));
       setIsLoading(false);
       navigateTo('news');
     });
  }, [state.user, state.selectedExam, navigateTo, state.examConfig]);

  const handleOpenQOTD = useCallback(() => {
     if(state.qotd) {
        setPracticeQueue([state.qotd]);
        setCurrentQIndex(0);
        navigateTo('practice');
     }
  }, [state.qotd, navigateTo]);

  const handleStartPracticeClick = useCallback(() => setShowPracticeConfig(true), []);
  const handleUploadClick = useCallback(() => navigateTo('upload'), [navigateTo]);
  const handleGeneratePaperClick = useCallback(() => navigateTo('paperGenerator'), [navigateTo]);
  const handleOpenBookmarksClick = useCallback(() => navigateTo('bookmarks'), [navigateTo]);
  const handleOpenAnalyticsClick = useCallback(() => navigateTo('analytics'), [navigateTo]);
  const handleOpenLeaderboardClick = useCallback(() => navigateTo('leaderboard'), [navigateTo]);
  const handleOpenPYQLibraryClick = useCallback(() => navigateTo('pyqLibrary'), [navigateTo]);
  const handleUpgradeClick = useCallback(() => setShowPaymentModal(true), []);
  const handleInstallClick = useCallback(() => installPrompt?.prompt(), [installPrompt]);
  const handleReadCurrentAffairs = useCallback(() => {
     const exam = state.selectedExam;
     if(!exam) return;
     generateNews(exam, MONTHS[new Date().getMonth()], new Date().getFullYear()).then(items => {
        setState(prev => ({ ...prev, newsFeed: items }));
        navigateTo('news');
     });
  }, [state.selectedExam, navigateTo]);

  // View Routing
  if (state.view === 'login') return <LoginScreen onLogin={handleLogin} onNavigateToSignup={() => navigateTo('signup')} onForgotPassword={() => navigateTo('forgotPassword')} isOnline={isOnline} isInitializing={isAppInitializing} />;
  if (state.view === 'signup') return <SignupScreen onSignup={handleSignup} onBackToLogin={() => navigateTo('login')} />;
  if (state.view === 'forgotPassword') return <ForgotPasswordScreen onBackToLogin={() => navigateTo('login')} />;
  if (state.view === 'onboarding') return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center animate-fade-in p-4">
         <BackgroundAnimation />
         <div className="relative z-10 w-full flex flex-col items-center">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Select Your Goal</h1>
                <p className="text-slate-500 dark:text-slate-400">Choose the exam you want to master.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
            {Object.keys(state.examConfig || EXAM_SUBJECTS).map((exam) => (
                <button key={exam} onClick={() => { handleExamSelect(exam as ExamType); navigateTo('tutorial'); }} className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-brand-purple hover:ring-2 hover:ring-brand-purple/20 transition-all text-left group">
                    <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform duration-300">🎯</span>
                    <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-brand-purple transition-colors">{exam}</h3>
                    <p className="text-xs text-slate-500 mt-1">Start Preparation →</p>
                </button>
            ))}
            </div>
         </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200 select-none relative overflow-hidden">
      
      {/* Background Animation Layer */}
      {state.view !== 'paperView' && <BackgroundAnimation />}

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        user={state.user}
        stats={state.stats}
        darkMode={state.darkMode}
        onToggleDarkMode={toggleDarkMode}
        showTimer={state.showTimer}
        onToggleTimer={toggleTimer}
        language={state.language}
        onToggleLanguage={toggleLanguage}
        currentTheme={state.theme}
        onThemeChange={changeTheme}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onInstall={handleInstallClick}
        canInstall={!!installPrompt}
        onEnableNotifications={requestNotificationPermission}
      />

      {state.view !== 'tutorial' && (
        <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 flex justify-between items-center shadow-sm sticky top-0 z-30 transition-colors border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white font-bold font-display shadow-lg shadow-brand-purple/30">PV</div>
             <span className="font-display font-bold text-lg text-slate-800 dark:text-white hidden sm:block">PYQverse</span>
          </div>
          <div className="flex items-center gap-4">
            {state.showTimer && state.view === 'practice' && <Timer />}
            <button onClick={() => setIsSidebarOpen(true)} className="relative group">
               <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-transparent group-hover:border-brand-purple transition-all">
                  {state.user?.photoURL ? <img src={state.user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{state.user?.name?.[0]}</div>}
               </div>
            </button>
          </div>
        </nav>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {state.view === 'tutorial' && <Tutorial onComplete={() => { navigateTo('dashboard'); if(state.user) saveUserPref(state.user.id, { hasSeenTutorial: true }); }} />}

        {state.view === 'dashboard' && (
          <Dashboard 
            stats={state.stats} 
            showTimer={state.showTimer}
            darkMode={state.darkMode}
            user={state.user}
            onStartPractice={handleStartPracticeClick} 
            onUpload={handleUploadClick} 
            onToggleTimer={toggleTimer}
            onToggleDarkMode={toggleDarkMode}
            onGeneratePaper={handleGeneratePaperClick}
            onStartCurrentAffairs={handleCurrentAffairs}
            onReadCurrentAffairs={handleReadCurrentAffairs}
            onReadNotes={handleFetchNotes}
            onEnableNotifications={requestNotificationPermission}
            language={state.language}
            onToggleLanguage={toggleLanguage}
            currentTheme={state.theme}
            onThemeChange={changeTheme}
            onUpgrade={handleUpgradeClick}
            onInstall={handleInstallClick}
            canInstall={!!installPrompt}
            qotd={state.qotd}
            onOpenQOTD={handleOpenQOTD}
            onOpenBookmarks={handleOpenBookmarksClick}
            onOpenAnalytics={handleOpenAnalyticsClick}
            onOpenLeaderboard={handleOpenLeaderboardClick}
            onOpenPYQLibrary={handleOpenPYQLibraryClick}
            isOnline={isOnline}
            selectedExam={state.selectedExam}
          />
        )}

        {state.view === 'upload' && state.user && state.selectedExam && (
          <UploadForm userId={state.user.id} examType={state.selectedExam} onSuccess={() => { alert("Saved!"); navigateTo('dashboard'); }} />
        )}

        {state.view === 'practice' && practiceQueue.length > 0 && (
          <div className="h-full flex flex-col justify-between max-w-2xl mx-auto animate-slide-up">
             <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-6 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${((currentQIndex + 1) / (practiceConfig.mode === 'endless' ? Math.max(practiceQueue.length, 100) : practiceConfig.count)) * 100}%` }}
                ></div>
             </div>
             
             {/* Streaming Indicator */}
             {isFetchingMore && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-indigo-600/90 text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-2 animate-bounce-slight">
                   <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                   Streaming Questions...
                </div>
             )}

             <QuestionCard 
               question={practiceQueue[currentQIndex]} 
               onAnswer={handleAnswer} 
               onNext={handleNextQuestion}
               isLast={practiceConfig.mode !== 'endless' && currentQIndex === practiceConfig.count - 1}
               isLoadingNext={currentQIndex >= practiceQueue.length - 1 && isFetchingMore}
               language={state.language}
               onToggleLanguage={toggleLanguage}
               onBookmarkToggle={async (q) => { if(state.user) { const added = await toggleBookmark(state.user.id, q); const updatedQ = { ...q, isBookmarked: added }; const newQueue = [...practiceQueue]; newQueue[currentQIndex] = updatedQ; setPracticeQueue(newQueue); } }}
             />
          </div>
        )}

        {state.view === 'stats' && (
          <div className="text-center py-12 animate-fade-in relative z-10">
             <div className="text-6xl mb-4">🎉</div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Complete!</h2>
             <div className="flex justify-center gap-4 mt-8">
                <button onClick={() => navigateTo('dashboard')} className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">Home</button>
                <button onClick={() => setShowPracticeConfig(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">New Session</button>
             </div>
          </div>
        )}

        {state.view === 'profile' && state.user && state.selectedExam && (
          <ProfileScreen 
            user={state.user} 
            stats={state.stats} 
            selectedExam={state.selectedExam}
            onUpdateUser={async (updatedUser) => { await saveUser(updatedUser); setState(prev => ({ ...prev, user: updatedUser })); }}
            onBack={() => navigateTo('dashboard')}
            onLogout={handleLogout}
            onInstall={handleInstallClick}
            canInstall={!!installPrompt}
            onExamChange={handleExamSelect}
            availableExams={Object.keys(state.examConfig || EXAM_SUBJECTS)}
          />
        )}

        {state.view === 'paperGenerator' && state.selectedExam && (
          <PaperGenerator 
            examType={state.selectedExam} 
            examSubjects={(state.examConfig as any)[state.selectedExam] || EXAM_SUBJECTS[state.selectedExam as ExamType]}
            onGenerate={(paper) => { setState(prev => ({ ...prev, generatedPaper: paper, view: 'paperView' })); }} 
            onBack={() => navigateTo('dashboard')} 
            onExamChange={handleExamSelect} 
          />
        )}

        {state.view === 'paperView' && state.generatedPaper && (
          <PaperView paper={state.generatedPaper} onClose={() => navigateTo('dashboard')} language={state.language} onToggleLanguage={toggleLanguage} userId={state.user?.id || ''} />
        )}

        {state.view === 'admin' && <AdminDashboard onBack={() => navigateTo('dashboard')} />}

        {state.view === 'downloads' && state.user && <OfflinePapersList userId={state.user.id} onBack={() => navigateTo('dashboard')} onOpenPaper={(paper) => { setState(prev => ({ ...prev, generatedPaper: paper, view: 'paperView' })); }} />}

        {state.view === 'analytics' && state.user && <SmartAnalytics stats={state.stats} history={[]} onBack={() => navigateTo('dashboard')} />}

        {state.view === 'leaderboard' && state.user && <Leaderboard user={state.user} onBack={() => navigateTo('dashboard')} />}

        {state.view === 'news' && (
           <CurrentAffairsFeed 
              news={state.newsFeed || []}
              onBack={() => navigateTo('dashboard')}
              onTakeQuiz={handleCurrentAffairs}
              language={state.language}
              onFilterChange={handleNewsFilterChange}
              mode={state.selectedExam && TECHNICAL_EXAMS.includes(state.selectedExam) ? 'notes' : 'news'}
              examType={state.selectedExam || undefined}
           />
        )}

        {state.view === 'pyqLibrary' && state.selectedExam && (
           <PYQLibrary examType={state.selectedExam} onBack={() => navigateTo('dashboard')} language={state.language} onBookmarkToggle={async (q) => { if(state.user) await toggleBookmark(state.user.id, q); }} />
        )}

        {state.view === 'bookmarks' && state.user && (
           <div className="max-w-3xl mx-auto"><div className="flex items-center gap-4 mb-6"><button onClick={() => navigateTo('dashboard')} className="text-slate-500 hover:text-indigo-600 flex items-center gap-1">← Back</button><h2 className="text-2xl font-bold font-display dark:text-white">Bookmarks</h2></div><div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl"><p className="text-slate-500">Your saved questions will appear here.</p></div></div>
        )}
      </main>

      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col items-center">
              <div className="relative w-16 h-16 mb-4">
                 <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-500 animate-spin-slow"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/></svg>
                 <div className="absolute inset-0 flex items-center justify-center text-2xl animate-bounce">⏳</div>
              </div>
              <p className="text-slate-700 dark:text-white font-bold">Loading...</p>
           </div>
        </div>
      )}

      {showPracticeConfig && state.selectedExam && (
        <PracticeConfigModal 
          examType={state.selectedExam} 
          onStart={startPracticeSession} 
          onClose={() => setShowPracticeConfig(false)} 
          onExamChange={handleExamSelect} 
          isPro={state.user?.isPro} 
          isAdmin={state.user?.isAdmin}
          onUpgrade={() => { setShowPracticeConfig(false); setShowPaymentModal(true); }}
          availableExams={Object.keys(state.examConfig || EXAM_SUBJECTS)}
        />
      )}

      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} onSuccess={() => {}} />
      )}
    </div>
  );
};

export default App;
