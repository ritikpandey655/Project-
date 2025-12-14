
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  updateUserActivity,
  updateUserSession
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
import { MobileBottomNav } from './components/MobileBottomNav';
import { auth, db } from './src/firebaseConfig';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { onSnapshot, doc } from "firebase/firestore";

const LAST_VIEW_KEY = 'pyqverse_last_view';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'login', // Direct to login instead of landing
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

  // Single Session Ref
  const currentSessionId = useRef<string>(Date.now().toString() + Math.random().toString());

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

    // --- SINGLE SESSION ENFORCEMENT START ---
    // 1. Generate new ID for this specific browser session instance
    const mySessionId = currentSessionId.current;
    
    // 2. Update Firestore with this ID (Claiming the session)
    await updateUserSession(userId, mySessionId);
    
    // 3. Listen for changes. If Firestore sessionId changes (another device logged in), kick us out.
    // Note: The listener is set up in a separate useEffect below to persist.
    // --- SINGLE SESSION ENFORCEMENT END ---

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
       
       // Only fetch QOTD if strictly needed and not present, to save quota
       // Added extra check to skip if in development/offline
       if (!qotd && navigator.onLine && Math.random() > 0.5) { // 50% chance to fetch to save quota
          generateSingleQuestion(prefs.selectedExam, (dynamicExams as any)[prefs.selectedExam]?.[0] || 'General', 'QOTD').then(q => {
             if(q) saveQOTD(userId, { id: `qotd-${Date.now()}`, ...q, examType: prefs.selectedExam!, subject: 'QOTD', source: 'PYQ_AI', correctIndex: q.correctIndex || 0, options: q.options || [], text: q.text || '', createdAt: Date.now() } as Question);
          }).catch(e => console.warn("QOTD fetch skipped"));
       }
    } else {
       setState(prev => ({ ...prev, view: 'onboarding' }));
    }
  }, [applyTheme]);

  // Session Listener Effect
  useEffect(() => {
    let unsubscribe: () => void;

    if (state.user?.id) {
        unsubscribe = onSnapshot(doc(db, "users", state.user.id), (doc) => {
            const data = doc.data();
            // If the session ID on the server doesn't match our local one, it means
            // someone else logged in on another device.
            if (data?.sessionId && data.sessionId !== currentSessionId.current) {
                alert("You have been logged out because your account was accessed from another device.");
                signOut(auth).then(() => {
                    window.location.reload(); // Refresh to clean state
                });
            }
        });
    }

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [state.user?.id]);

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
        // If not logged in, go straight to LOGIN view
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
    if (!['practice', 'paperView', 'paperGenerator', 'login', 'signup', 'landing'].includes(view)) {
       localStorage.setItem(LAST_VIEW_KEY, view);
    }
  }, []);

  const handleLogin = useCallback((user: User) => {}, []);

  const handleSignup = useCallback(async (user: User, exam: ExamType) => {
    await saveUserPref(user.id, { selectedExam: exam });
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    navigateTo('login');
  }, [navigateTo]);

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
      let loaded = currentCount;
      const BATCH_SIZE = 5;

      if (loaded >= targetCount) {
          setIsFetchingMore(false);
          return;
      }

      const fetchNext = async () => {
          if (loaded >= targetCount) {
              setIsFetchingMore(false);
              return;
          }
          
          const needed = Math.min(BATCH_SIZE, targetCount - loaded);
          if (needed <= 0) {
              setIsFetchingMore(false);
              return;
          }
          
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
                  
                  if (loaded < targetCount) {
                      // CRITICAL FIX: Increased delay from 1200ms to 4000ms
                      // This ensures we don't exceed Gemini Free Tier (15 RPM = 1 req every 4 sec)
                      setTimeout(fetchNext, 4500); 
                  } else {
                      setIsFetchingMore(false);
                  }
              } else {
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
    
    // REDUCED INITIAL LOAD to prevent immediate 429
    const INITIAL_BATCH_SIZE = 5; // Was 10, reduced to 5 to be safe
    const initialLoadCount = Math.min(config.count, INITIAL_BATCH_SIZE);

    let initialQuestions: Question[] = [];
    const cacheQs = await getOfficialQuestions(exam, config.subject, initialLoadCount);
    if (cacheQs.length >= initialLoadCount) {
        initialQuestions = cacheQs;
    } else {
        const needed = initialLoadCount - cacheQs.length;
        const aiQs = await generateExamQuestions(exam, config.subject, needed, 'Medium', config.topic ? [config.topic] : []);
        initialQuestions = [...cacheQs, ...aiQs];
    }

    if (initialQuestions.length === 0) {
        initialQuestions = await generateExamQuestions(exam, config.subject, 5, 'Medium', config.topic ? [config.topic] : []);
    }

    setPracticeQueue(initialQuestions);
    setCurrentQIndex(0);
    setIsLoading(false); 
    navigateTo('practice'); 

    if (config.count > initialQuestions.length || config.mode === 'endless') {
        const target = config.mode === 'endless' ? 1000 : config.count;
        // Delay start of progressive fetch to let initial burst settle
        setTimeout(() => {
            progressiveFetch(exam, config.subject, target, initialQuestions.length, config.topic, false);
        }, 5000);
    } else {
        setIsFetchingMore(false);
    }

  }, [state.user, state.selectedExam, navigateTo, progressiveFetch]);

  const handleNextQuestion = useCallback(async () => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    const nextIndex = currentQIndex + 1;
    
    // Trigger fetch earlier but less frequently
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
    
    generateCurrentAffairs(exam, 10).then(questions => {
        setPracticeQueue(questions);
        setCurrentQIndex(0);
        setPracticeConfig({ mode: 'finite', count: 50, subject: 'Current Affairs' });
        setIsLoading(false);
        navigateTo('practice');
        // Delay fetch
        setTimeout(() => {
            progressiveFetch(exam, 'Current Affairs', 50, questions.length, undefined, true);
        }, 3000);
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

    if (isLoadMore) {
        setState(prev => ({ ...prev, newsFeed: [...(prev.newsFeed || []), ...items] }));
    } else {
        setState(prev => ({ ...prev, newsFeed: items }));
    }
  }, [state.selectedExam, state.user]);

  const handleReadNews = useCallback(async () => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    setIsLoading(true);
    const initialNews = await generateNews(exam, MONTHS[new Date().getMonth()], new Date().getFullYear(), 'National');
    setState(prev => ({ ...prev, newsFeed: initialNews }));
    setIsLoading(false);
    navigateTo('news');
  }, [state.user, state.selectedExam, navigateTo]);

  const handleReadNotes = useCallback(async () => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    setIsLoading(true);
    const initialNotes = await generateStudyNotes(exam, 'Mixed');
    setState(prev => ({ ...prev, newsFeed: initialNotes })); // Reuse news feed for notes
    setIsLoading(false);
    navigateTo('news'); // Reuse news view, but logic will detect notes mode via props
  }, [state.user, state.selectedExam, navigateTo]);

  const handlePaperComplete = () => {
    navigateTo('dashboard');
  };

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };

  // --- RENDER ---

  if (isAppInitializing) {
    return (
        <LoginScreen 
            isInitializing={true}
            onLogin={() => {}} 
            onNavigateToSignup={() => {}} 
            onForgotPassword={() => {}}
        />
    );
  }

  // LOGIN FLOW
  if (state.view === 'login') {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onNavigateToSignup={() => navigateTo('signup')}
        onForgotPassword={() => navigateTo('forgotPassword')}
        isOnline={isOnline}
      />
    );
  }

  if (state.view === 'signup') {
    return (
      <SignupScreen 
        onSignup={handleSignup} 
        onBackToLogin={() => navigateTo('login')} 
      />
    );
  }

  if (state.view === 'forgotPassword') {
    return <ForgotPasswordScreen onBackToLogin={() => navigateTo('login')} />;
  }

  // MAIN APP SHELL
  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#111827] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 overflow-x-hidden">
      
      {/* Background */}
      <BackgroundAnimation />

      {/* Main Content Area */}
      <div className={`relative z-10 h-full transition-all duration-300 ${isSidebarOpen ? '-translate-x-10 scale-95 opacity-50 pointer-events-none' : ''}`}>
        
        {/* Navbar (Only on Dashboard for mobile, everywhere for Desktop) */}
        {(state.view !== 'practice' && state.view !== 'paperView' && state.view !== 'paperGenerator') && (
            <nav className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pt-safe">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white font-bold font-display shadow-lg cursor-pointer transform hover:rotate-3 transition-transform"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        {state.user?.photoURL ? (
                            <img src={state.user.photoURL} alt="User" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                            <span className="text-sm">{state.user?.name?.[0] || 'PV'}</span>
                        )}
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg leading-tight hidden sm:block">
                            {state.user ? `Hi, ${state.user.name.split(' ')[0]}` : 'PYQverse'}
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {state.selectedExam || 'Exam Pilot'}
                        </p>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {state.showTimer && <Timer />}
                    
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                    >
                        <svg className="w-6 h-6 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        {/* Notification Dot if Installable */}
                        {installPrompt && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                        )}
                    </button>
                </div>
                </div>
            </div>
            </nav>
        )}

        {/* View Container */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
            
            {state.view === 'dashboard' && (
                <Dashboard
                    stats={state.stats}
                    user={state.user}
                    onStartPractice={() => setShowPracticeConfig(true)}
                    onUpload={() => navigateTo('upload')}
                    onToggleTimer={toggleTimer}
                    onToggleDarkMode={toggleDarkMode}
                    onGeneratePaper={() => navigateTo('paperGenerator')}
                    onStartCurrentAffairs={handleCurrentAffairs}
                    onReadCurrentAffairs={handleReadNews}
                    onReadNotes={handleReadNotes}
                    onEnableNotifications={requestNotificationPermission}
                    showTimer={state.showTimer}
                    darkMode={state.darkMode}
                    language={state.language}
                    onToggleLanguage={toggleLanguage}
                    currentTheme={state.theme}
                    onThemeChange={changeTheme}
                    onUpgrade={() => setShowPaymentModal(true)}
                    onInstall={handleInstallClick}
                    canInstall={!!installPrompt}
                    qotd={state.qotd}
                    onOpenQOTD={() => {
                        if (state.qotd) {
                            setPracticeQueue([state.qotd]);
                            setCurrentQIndex(0);
                            setPracticeConfig({ mode: 'finite', count: 1, subject: 'QOTD' });
                            navigateTo('practice');
                        }
                    }}
                    onOpenBookmarks={() => navigateTo('bookmarks')}
                    onOpenAnalytics={() => navigateTo('analytics')}
                    onOpenLeaderboard={() => navigateTo('leaderboard')}
                    onOpenPYQLibrary={() => navigateTo('pyqLibrary')}
                    isOnline={isOnline}
                    selectedExam={state.selectedExam}
                />
            )}

            {state.view === 'tutorial' && (
                <Tutorial onComplete={() => {
                    saveUserPref(state.user!.id, { hasSeenTutorial: true });
                    navigateTo('dashboard');
                }} />
            )}

            {state.view === 'upload' && state.user && state.selectedExam && (
                <div className="animate-slide-up">
                    <button onClick={() => navigateTo('dashboard')} className="mb-4 flex items-center text-slate-500 hover:text-indigo-600 font-bold text-sm">
                        <span>←</span> Back
                    </button>
                    <UploadForm 
                        userId={state.user.id} 
                        examType={state.selectedExam}
                        onSuccess={() => {}}
                    />
                </div>
            )}

            {state.view === 'practice' && (
                <div className="fixed inset-0 z-50 bg-[#F3F4F6] dark:bg-[#111827] flex flex-col h-full overflow-hidden">
                    {/* Top Bar */}
                    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center shadow-sm shrink-0 safe-top">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { 
                                if(confirm("End session? Progress will be saved.")) {
                                    navigateTo('stats');
                                    scheduleStudyReminder(); 
                                }
                            }} className="text-slate-400 hover:text-red-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white leading-none">
                                    {practiceConfig.mode === 'endless' ? '∞ Endless Mode' : `Question ${currentQIndex + 1}/${practiceQueue.length}`}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{practiceConfig.subject}</p>
                            </div>
                        </div>
                        {state.showTimer && <Timer />}
                    </div>

                    {/* Question Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-safe">
                        <QuestionCard
                            question={practiceQueue[currentQIndex]}
                            onAnswer={handleAnswer}
                            onNext={handleNextQuestion}
                            isLast={currentQIndex === practiceQueue.length - 1 && practiceConfig.mode !== 'endless'}
                            isLoadingNext={isFetchingMore}
                            language={state.language}
                            onToggleLanguage={toggleLanguage}
                            onBookmarkToggle={(q) => state.user && toggleBookmark(state.user.id, q)}
                        />
                    </div>
                </div>
            )}

            {state.view === 'stats' && (
                <div className="text-center py-12 animate-pop-in">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                        <span className="text-5xl">🎉</span>
                    </div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Session Complete!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">Great job keeping your streak alive.</p>
                    
                    <div className="grid grid-cols-2 max-w-xs mx-auto gap-4 mb-8">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-400 uppercase font-bold">Questions</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{currentQIndex + 1}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-400 uppercase font-bold">Accuracy</p>
                            <p className="text-2xl font-bold text-green-600">
                                {state.stats.totalAttempted > 0 ? Math.round((state.stats.totalCorrect / state.stats.totalAttempted) * 100) : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button onClick={() => navigateTo('dashboard')} className="px-8 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-300 transition-colors">
                            Home
                        </button>
                        <button onClick={() => setShowPracticeConfig(true)} className="px-8 py-3 bg-brand-purple text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">
                            Practice More
                        </button>
                    </div>
                </div>
            )}

            {state.view === 'profile' && state.user && state.selectedExam && (
                <ProfileScreen 
                    user={state.user} 
                    stats={state.stats}
                    selectedExam={state.selectedExam}
                    onUpdateUser={(updated) => {
                        setState(prev => ({ ...prev, user: updated }));
                        saveUser(updated);
                    }}
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
                    onGenerate={(paper) => {
                        setState(prev => ({ ...prev, generatedPaper: paper }));
                        navigateTo('paperView');
                    }}
                    onBack={() => navigateTo('dashboard')}
                    onExamChange={handleExamSelect}
                    examSubjects={(state.examConfig as any)?.[state.selectedExam]}
                />
            )}

            {state.view === 'paperView' && state.generatedPaper && state.user && (
                <PaperView 
                    paper={state.generatedPaper} 
                    onClose={handlePaperComplete}
                    language={state.language}
                    onToggleLanguage={toggleLanguage}
                    userId={state.user.id}
                />
            )}

            {state.view === 'admin' && (
                <AdminDashboard onBack={() => navigateTo('dashboard')} />
            )}

            {state.view === 'downloads' && state.user && (
                <OfflinePapersList 
                    userId={state.user.id}
                    onOpenPaper={(paper) => {
                        setState(prev => ({ ...prev, generatedPaper: paper }));
                        navigateTo('paperView');
                    }}
                    onBack={() => navigateTo('dashboard')}
                />
            )}

            {state.view === 'analytics' && (
                <SmartAnalytics 
                    stats={state.stats}
                    history={[]} // Pass history if available in state
                    onBack={() => navigateTo('dashboard')}
                />
            )}

            {state.view === 'leaderboard' && state.user && (
                <Leaderboard 
                    user={state.user}
                    onBack={() => navigateTo('dashboard')}
                />
            )}

            {state.view === 'news' && (
                <CurrentAffairsFeed 
                    news={state.newsFeed || []}
                    onBack={() => navigateTo('dashboard')}
                    onTakeQuiz={() => {
                        setPracticeQueue([]); // Clear queue
                        // Start quiz with news content (mock logic)
                        startPracticeSession({ subject: 'Current Affairs', count: 10, mode: 'finite' });
                    }}
                    onFilterChange={handleNewsFilterChange}
                    // Determine mode based on whether we are showing news categories or subject notes
                    mode={state.newsFeed && state.newsFeed.length > 0 && state.newsFeed[0].category === 'Notes' ? 'notes' : 'news'}
                    examType={state.selectedExam || undefined}
                />
            )}

            {state.view === 'pyqLibrary' && state.selectedExam && (
                <PYQLibrary 
                    examType={state.selectedExam}
                    onBack={() => navigateTo('dashboard')}
                    onBookmarkToggle={(q) => state.user && toggleBookmark(state.user.id, q)}
                    language={state.language}
                />
            )}

            {state.view === 'bookmarks' && state.user && (
                <div className="max-w-3xl mx-auto animate-fade-in">
                    <button onClick={() => navigateTo('dashboard')} className="mb-4 text-sm text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1">
                        <span>←</span> Back to Dashboard
                    </button>
                    <h2 className="text-2xl font-bold mb-6 dark:text-white">Your Bookmarks</h2>
                    {/* Reuse PYQ Library Logic for display or simple list */}
                    <PYQLibrary 
                        examType={state.selectedExam!} 
                        onBack={() => navigateTo('dashboard')}
                        language={state.language}
                    /> 
                    {/* Note: Ideally create a separate BookmarkList component, but reusing for brevity */}
                </div>
            )}

        </main>
      </div>

      {/* Sidebar Overlay */}
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

      {/* Practice Config Modal */}
      {showPracticeConfig && state.selectedExam && (
        <PracticeConfigModal 
            examType={state.selectedExam}
            onStart={startPracticeSession}
            onClose={() => setShowPracticeConfig(false)}
            onExamChange={handleExamSelect}
            isPro={state.user?.isPro}
            isAdmin={state.user?.isAdmin}
            onUpgrade={() => setShowPaymentModal(true)}
            availableExams={Object.keys(state.examConfig || EXAM_SUBJECTS)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal 
            onClose={() => setShowPaymentModal(false)}
            onSuccess={() => {
                setShowPaymentModal(false);
                alert("Welcome to Pro! (Mock)");
                if(state.user) saveUser({...state.user, isPro: true});
            }}
        />
      )}

      {/* Mobile Bottom Nav */}
      <MobileBottomNav 
         currentView={state.view} 
         onNavigate={navigateTo} 
         onAction={(action) => {
            if (action === 'practice') setShowPracticeConfig(true);
         }}
      />

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-pop-in">
                <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-slate-800 dark:text-white">Loading Universe...</p>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
