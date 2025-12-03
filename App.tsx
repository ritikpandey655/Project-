
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, ExamType, Question, User, ViewState, QuestionPaper } from './types';
import { EXAM_SUBJECTS, THEME_PALETTES, TECHNICAL_EXAMS, MONTHS } from './constants';
import { 
  getUserPref, 
  getStats, 
  saveUserPref, 
  updateStats, 
  getUserQuestions,
  saveUser,
  getUser,
  removeUser,
  INITIAL_STATS,
  toggleBookmark,
  getBookmarks,
  getStoredQOTD,
  saveQOTD,
  getExamHistory,
  getOfficialQuestions,
  getExamConfig
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
import { auth } from './src/firebaseConfig';

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
  const [initError, setInitError] = useState('');
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

  // --- PWA Advanced Registration (Sync, Periodic Sync, Notifications, File Handling) ---
  useEffect(() => {
    const registerPWAFeatures = async () => {
      // 1. File Handling Consumer
      if ('launchQueue' in window) {
        // @ts-ignore
        window.launchQueue.setConsumer(async (launchParams) => {
          if (launchParams.files && launchParams.files.length) {
            console.log('App opened with file:', launchParams.files[0]);
            // Logic to read the file can be added here
            // For now, we redirect to upload screen to indicate handling
            if (state.user) {
               setState(prev => ({ ...prev, view: 'upload' }));
            }
          }
        });
      }

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;

          // 2. Background Sync Registration
          if ('sync' in registration) {
             try {
                // @ts-ignore
                await registration.sync.register('sync-user-data');
                console.log('Background Sync registered');
             } catch (err) {
                console.log('Background Sync registration failed (likely unsupported)', err);
             }
          }

          // 3. Periodic Sync Registration (Requires Permission)
          // @ts-ignore
          if ('periodicSync' in registration) {
            try {
               const status = await navigator.permissions.query({
                 // @ts-ignore
                 name: 'periodic-background-sync',
               });

               if (status.state === 'granted') {
                 // @ts-ignore
                 if (!await registration.periodicSync.getTags().then(tags => tags.includes('daily-content-update'))) {
                     // @ts-ignore
                     await registration.periodicSync.register('daily-content-update', {
                        minInterval: 24 * 60 * 60 * 1000 // 1 day
                     });
                     console.log('Periodic Sync registered');
                 }
               }
            } catch (e) {
               console.log('Periodic Sync could not be registered (permission denied or unsupported)', e);
            }
          }

        } catch (error) {
          console.log("PWA Service Worker features registration failed", error);
        }
      }
    };
    
    registerPWAFeatures();
  }, [state.user]);

  // Helper to load async user data
  const loadUserData = useCallback(async (userId: string) => {
    const userProfile = await getUser(userId);
    if (!userProfile) return;

    // Load heavy data in background, set User immediately
    const prefsPromise = getUserPref(userId);
    const statsPromise = getStats(userId);
    const qotdPromise = getStoredQOTD(userId);
    const examsPromise = getExamConfig(); // Load dynamic exams

    const [prefs, stats, qotd, dynamicExams] = await Promise.all([prefsPromise, statsPromise, qotdPromise, examsPromise]);

    // Set Theme/Mode immediately
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

    // Restore view handling with Action Parameter Check
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
       
       // Generate QOTD if missing
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
        setInitError("Connecting...");
      }
    }, 8000);

    const unsubscribe = auth.onAuthStateChanged((currentUser: any) => {
      clearTimeout(timeoutId);
      if (currentUser) {
        loadUserData(currentUser.uid).then(() => setIsAppInitializing(false));
      } else {
        // Change view to 'login' if user is not logged in
        setState(prev => ({ ...prev, user: null, view: 'login' }));
        setIsAppInitializing(false);
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Install Prompt Listener
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

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("Your browser does not support notifications.");
      return;
    }

    // Check if already granted
    if (Notification.permission === 'granted') {
       if ('serviceWorker' in navigator) {
          try {
             const reg = await navigator.serviceWorker.ready;
             reg.showNotification("Notifications Active! 🔔", {
                body: "You're all set to receive study updates.",
                icon: '/icon.svg',
                vibrate: [200, 100, 200],
                tag: 'test-notification'
             } as any);
          } catch (e) {
             console.error("Test notification failed", e);
             alert("Notifications are granted but we couldn't send a test one.");
          }
       }
       return;
    }

    if (Notification.permission === 'denied') {
       alert("Notifications are blocked. Please enable them in your browser settings (Site Settings > Permissions > Notifications).");
       return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
         if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification("Welcome to PYQverse 🚀", {
               body: "Notifications enabled successfully! We'll keep you updated.",
               icon: '/icon.svg',
               vibrate: [200, 100, 200],
               tag: 'welcome-notification'
            } as any);
         } else {
            new Notification("Welcome to PYQverse 🚀");
         }
      }
    } catch (e) {
      console.error(e);
      alert("Error requesting permission.");
    }
  };

  const navigateTo = useCallback((view: ViewState) => {
    // Instant navigation
    setState(prev => ({ ...prev, view }));
    setIsSidebarOpen(false);
    
    if (!['practice', 'paperView', 'paperGenerator', 'login', 'signup'].includes(view)) {
       localStorage.setItem(LAST_VIEW_KEY, view);
    }
  }, []);

  const handleLogin = useCallback((user: User) => {
    // Listener handles state
  }, []);

  const handleSignup = useCallback(async (user: User, exam: ExamType) => {
    await saveUserPref(user.id, { selectedExam: exam });
  }, []);

  const handleLogout = useCallback(async () => {
    await auth.signOut();
  }, []);

  // Optimized Handlers with Callbacks
  const handleExamSelect = useCallback(async (exam: ExamType) => {
    if (!state.user) return;
    // Optimistic Update
    setState(prev => ({ ...prev, selectedExam: exam }));
    // Background Save
    saveUserPref(state.user.id, { selectedExam: exam });
  }, [state.user]);

  const toggleDarkMode = useCallback(async () => {
    if (!state.user) return;
    const newState = !state.darkMode;
    // Optimistic Update
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

  const startPracticeSession = useCallback(async (config: { subject: string; count: number; mode: 'finite' | 'endless'; topic?: string }) => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    setShowPracticeConfig(false);
    setIsLoading(true);
    setPracticeConfig(config);
    
    // Quick Fetch from Cache/Admin
    const initialBatch = await getOfficialQuestions(exam, config.subject, 5);
    
    if (initialBatch.length > 0) {
       setPracticeQueue(initialBatch);
       setCurrentQIndex(0);
       setIsLoading(false); 
       navigateTo('practice'); 
       
       // Fetch rest in background
       generateExamQuestions(exam, config.subject, config.count - initialBatch.length, 'Medium', config.topic ? [config.topic] : [])
       .then(moreQuestions => {
          setPracticeQueue(prev => [...prev, ...moreQuestions]);
       });
    } else {
       const questions = await generateExamQuestions(
          exam, 
          config.subject, 
          config.count, 
          'Medium', 
          config.topic ? [config.topic] : []
       );
       setPracticeQueue(questions);
       setCurrentQIndex(0);
       setIsLoading(false);
       navigateTo('practice');
    }
  }, [state.user, state.selectedExam, navigateTo]);

  const handleNextQuestion = useCallback(async () => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    const nextIndex = currentQIndex + 1;
    
    if (practiceConfig.mode === 'endless' && nextIndex >= practiceQueue.length - 3 && !isFetchingMore) {
        setIsFetchingMore(true);
        generateExamQuestions(exam, practiceConfig.subject, 5, 'Medium', practiceConfig.topic ? [practiceConfig.topic] : [])
        .then(moreQs => {
            setPracticeQueue(prev => [...prev, ...moreQs]);
            setIsFetchingMore(false);
        });
    }

    if (nextIndex < practiceQueue.length) {
      setCurrentQIndex(nextIndex);
    } else {
      navigateTo('stats');
    }
  }, [currentQIndex, practiceConfig, practiceQueue.length, isFetchingMore, state.user, state.selectedExam, navigateTo]);

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    const exam = state.selectedExam;
    const user = state.user;
    if (!user || !exam) return;
    
    const currentQ = practiceQueue[currentQIndex];
    const subject = currentQ.subject || 'General';
    
    // Update local state locally for instant feedback
    setState(prev => {
        const newStats = { ...prev.stats };
        newStats.totalAttempted++;
        if (isCorrect) newStats.totalCorrect++;
        if (!newStats.subjectPerformance[subject]) newStats.subjectPerformance[subject] = { correct: 0, total: 0 };
        newStats.subjectPerformance[subject].total++;
        if (isCorrect) newStats.subjectPerformance[subject].correct++;
        return { ...prev, stats: newStats };
    });

    // Fire and forget DB update
    updateStats(user.id, isCorrect, subject, exam);
  }, [practiceQueue, currentQIndex, state.user, state.selectedExam]);

  const handleCurrentAffairs = useCallback(async () => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    setIsLoading(true);
    // Optimistically fetch small batch
    generateCurrentAffairs(exam, 10).then(questions => {
        setPracticeQueue(questions);
        setCurrentQIndex(0);
        setPracticeConfig({ mode: 'finite', count: 200, subject: 'Current Affairs' }); 
        setIsLoading(false);
        navigateTo('practice');
        // Backfill
        generateCurrentAffairs(exam, 30).then(more => {
           setPracticeQueue(prev => [...prev, ...more]);
        });
    });
  }, [state.user, state.selectedExam, navigateTo]);

  const handleNewsFilterChange = useCallback(async (filters: { month?: string; year?: number; category?: string; subject?: string }, isLoadMore: boolean = false) => {
    const exam = state.selectedExam;
    if (!state.user || !exam) return;
    
    // Don't set loading here to prevent UI flicker, handle in child
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
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200 select-none">
      
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
        <nav className="bg-white dark:bg-slate-900 p-4 flex justify-between items-center shadow-sm sticky top-0 z-30 transition-colors">
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
          <div className="h-full flex flex-col justify-between max-w-2xl mx-auto">
             <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-6">
                <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentQIndex) / practiceQueue.length) * 100}%` }}></div>
             </div>
             <QuestionCard 
               question={practiceQueue[currentQIndex]} 
               onAnswer={handleAnswer} 
               onNext={handleNextQuestion}
               isLast={practiceConfig.mode !== 'endless' && currentQIndex === practiceQueue.length - 1}
               isLoadingNext={isFetchingMore && currentQIndex >= practiceQueue.length - 2}
               language={state.language}
               onToggleLanguage={toggleLanguage}
               onBookmarkToggle={async (q) => { if(state.user) { const added = await toggleBookmark(state.user.id, q); const updatedQ = { ...q, isBookmarked: added }; const newQueue = [...practiceQueue]; newQueue[currentQIndex] = updatedQ; setPracticeQueue(newQueue); } }}
             />
          </div>
        )}

        {state.view === 'stats' && (
          <div className="text-center py-12 animate-fade-in">
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
          />
        )}

        {state.view === 'paperGenerator' && state.selectedExam && (
          <PaperGenerator examType={state.selectedExam} onGenerate={(paper) => { setState(prev => ({ ...prev, generatedPaper: paper, view: 'paperView' })); }} onBack={() => navigateTo('dashboard')} onExamChange={handleExamSelect} />
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
        <PracticeConfigModal examType={state.selectedExam} onStart={startPracticeSession} onClose={() => setShowPracticeConfig(false)} onExamChange={handleExamSelect} isPro={state.user?.isPro} onUpgrade={() => { setShowPracticeConfig(false); setShowPaymentModal(true); }} />
      )}

      {showPaymentModal && (
        <PaymentModal onClose={() => setShowPaymentModal(false)} onSuccess={async () => { if (state.user) { const updatedUser = { ...state.user, isPro: true }; await saveUser(updatedUser); setState(prev => ({ ...prev, user: updatedUser })); setShowPaymentModal(false); alert("Welcome to Pro! 🌟"); } }} />
      )}
    </div>
  );
};

export default App;
