
import React, { useState, useEffect } from 'react';
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
  getOfficialQuestions
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
import { onAuthStateChanged, signOut } from 'firebase/auth';

const LAST_VIEW_KEY = 'pyqverse_last_view';

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
    theme: 'PYQverse Prime',
    qotd: null,
    newsFeed: []
  });

  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [initError, setInitError] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Security State
  const [isSecurityBlackout, setIsSecurityBlackout] = useState(false);
  
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

  const applyTheme = (themeName: string) => {
    const palette = THEME_PALETTES[themeName] || THEME_PALETTES['PYQverse Prime'];
    const root = document.documentElement;
    Object.keys(palette).forEach(key => {
      // @ts-ignore
      root.style.setProperty(`--primary-${key}`, palette[key]);
    });
  };

  // Helper to load async user data
  const loadUserData = async (userId: string) => {
    const userProfile = await getUser(userId);
    if (!userProfile) return;

    const prefs = await getUserPref(userId);
    const stats = await getStats(userId);
    const qotd = await getStoredQOTD(userId);

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
      qotd: qotd
    }));

    // Restore view
    const lastView = localStorage.getItem(LAST_VIEW_KEY) as ViewState;
    if (prefs.selectedExam) {
       if (lastView && ['dashboard', 'upload', 'profile', 'admin', 'downloads'].includes(lastView)) {
          navigateTo(lastView);
       } else {
          navigateTo(prefs.hasSeenTutorial ? 'dashboard' : 'tutorial');
       }
       // Generate QOTD if missing
       if (!qotd && isOnline) {
          generateSingleQuestion(prefs.selectedExam, EXAM_SUBJECTS[prefs.selectedExam][0], 'QOTD').then(q => {
             if(q) saveQOTD(userId, { id: `qotd-${Date.now()}`, ...q, examType: prefs.selectedExam!, subject: 'QOTD', source: 'PYQ_AI', correctIndex: q.correctIndex || 0, options: q.options || [], text: q.text || '', createdAt: Date.now() } as Question);
          });
       }
    } else {
       // CRITICAL: Navigate to onboarding if no exam selected
       navigateTo('onboarding');
    }
  };

  useEffect(() => {
    // Safety Timeout for Firebase Init
    const timeoutId = setTimeout(() => {
      if (isAppInitializing) {
        setInitError("Connecting to Cloud is taking longer than expected. \n1. Check Internet Connection.\n2. Ensure 'npm install' was run.");
      }
    }, 8000);

    // FIREBASE AUTH LISTENER
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timeoutId); // Clear timeout on response
      if (currentUser) {
        // User is signed in
        loadUserData(currentUser.uid).then(() => setIsAppInitializing(false));
      } else {
        // User is signed out
        setState(prev => ({ ...prev, user: null, view: 'login' }));
        setIsAppInitializing(false);
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Global Security: Instant Blackout on Blur/Focus Loss
    const handleBlur = () => {
       setIsSecurityBlackout(true);
    };
    const handleFocus = () => {
       setIsSecurityBlackout(false);
    };
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const navigateTo = (view: ViewState) => {
    if (['practice', 'paperView', 'paperGenerator'].includes(view)) {
       // Do not persist transient views
    } else {
       localStorage.setItem(LAST_VIEW_KEY, view);
    }
    setState(prev => ({ ...prev, view }));
    setIsSidebarOpen(false);
  };

  const handleLogin = (user: User) => {
    // The Auth Listener will handle loading data
  };

  const handleSignup = async (user: User, exam: ExamType) => {
    // Save initial pref
    await saveUserPref(user.id, { selectedExam: exam });
    // Auth Listener will pick up the rest
  };

  const handleLogout = async () => {
    await signOut(auth);
    // Listener will redirect to login
  };

  const handleExamSelect = async (exam: ExamType) => {
    if (!state.user) return;
    await saveUserPref(state.user.id, { selectedExam: exam });
    setState(prev => ({ ...prev, selectedExam: exam }));
  };

  const toggleDarkMode = async () => {
    if (!state.user) return;
    const newState = !state.darkMode;
    await saveUserPref(state.user.id, { darkMode: newState });
    setState(prev => ({ ...prev, darkMode: newState }));
    if (newState) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const toggleTimer = async () => {
    if (!state.user) return;
    const newState = !state.showTimer;
    await saveUserPref(state.user.id, { showTimer: newState });
    setState(prev => ({ ...prev, showTimer: newState }));
  };

  const startPracticeSession = async (config: { subject: string; count: number; mode: 'finite' | 'endless'; topic?: string }) => {
    if (!state.user || !state.selectedExam) return;
    setShowPracticeConfig(false);
    setIsLoading(true);
    setPracticeConfig(config);
    
    // --- INSTANT START LOGIC ---
    const initialBatch = await getOfficialQuestions(state.selectedExam, config.subject, 5);
    
    let initialQueue: Question[] = [];
    if (initialBatch.length > 0) {
       initialQueue = initialBatch;
       setPracticeQueue(initialQueue);
       setCurrentQIndex(0);
       navigateTo('practice'); // Navigate immediately!
       setIsLoading(false); 
       
       generateExamQuestions(state.selectedExam, config.subject, config.count - initialQueue.length, 'Medium', config.topic ? [config.topic] : [])
       .then(moreQuestions => {
          setPracticeQueue(prev => [...prev, ...moreQuestions]);
       });
    } else {
       const questions = await generateExamQuestions(
          state.selectedExam, 
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
  };

  const handleNextQuestion = async () => {
    if (!state.user || !state.selectedExam) return;
    const nextIndex = currentQIndex + 1;
    
    if (practiceConfig.mode === 'endless' && nextIndex >= practiceQueue.length - 3 && !isFetchingMore) {
        setIsFetchingMore(true);
        const moreQs = await generateExamQuestions(state.selectedExam, practiceConfig.subject, 5, 'Medium', practiceConfig.topic ? [practiceConfig.topic] : []);
        setPracticeQueue(prev => [...prev, ...moreQs]);
        setIsFetchingMore(false);
    }

    if (nextIndex < practiceQueue.length) {
      setCurrentQIndex(nextIndex);
    } else {
      navigateTo('stats');
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!state.user || !state.selectedExam) return;
    const currentQ = practiceQueue[currentQIndex];
    const subject = currentQ.subject || 'General';
    
    const newStats = { ...state.stats };
    newStats.totalAttempted++;
    if (isCorrect) newStats.totalCorrect++;
    
    if (!newStats.subjectPerformance[subject]) newStats.subjectPerformance[subject] = { correct: 0, total: 0 };
    newStats.subjectPerformance[subject].total++;
    if (isCorrect) newStats.subjectPerformance[subject].correct++;

    setState(prev => ({ ...prev, stats: newStats }));
    await updateStats(state.user.id, isCorrect, subject, state.selectedExam);
  };

  const handleCurrentAffairs = async () => {
    if (!state.user || !state.selectedExam) return;
    setIsLoading(true);
    const questions = await generateCurrentAffairs(state.selectedExam, 20); 
    setPracticeQueue(questions);
    setCurrentQIndex(0);
    setPracticeConfig({ mode: 'finite', count: 200, subject: 'Current Affairs' }); 
    setIsLoading(false);
    navigateTo('practice');
    
    generateCurrentAffairs(state.selectedExam, 30).then(more => {
       setPracticeQueue(prev => [...prev, ...more]);
    });
  };

  const handleNewsFilterChange = async (filters: { month?: string; year?: number; category?: string; subject?: string }) => {
    if (!state.user || !state.selectedExam) return;
    let items;
    if (filters.subject) {
       items = await generateStudyNotes(state.selectedExam, filters.subject);
    } else {
       items = await generateNews(state.selectedExam, filters.month, filters.year, filters.category);
    }
    setState(prev => ({ ...prev, newsFeed: items }));
  };

  const handleFetchNotes = () => {
     if (!state.user || !state.selectedExam) return;
     const defaultSubject = EXAM_SUBJECTS[state.selectedExam][0];
     generateStudyNotes(state.selectedExam, defaultSubject).then(items => {
        setState(prev => ({ ...prev, newsFeed: items }));
        navigateTo('news');
     });
  }

  // Security Blackout Screen
  if (isSecurityBlackout) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center text-white">
         <div className="text-center p-8">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-2">Security Pause</h2>
            <p className="text-slate-400">Content is hidden while app is in background.</p>
            <p className="text-sm text-slate-500 mt-4">Tap or Focus to Resume</p>
         </div>
      </div>
    );
  }

  // Handle Full-Screen Auth Views separate from Dashboard layout to prevent clipping/shrinking
  if (state.view === 'login') {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onNavigateToSignup={() => navigateTo('signup')} 
        onForgotPassword={() => navigateTo('forgotPassword')}
        isOnline={isOnline}
        isInitializing={isAppInitializing}
      />
    );
  }

  if (state.view === 'signup') {
    return (
      <SignupScreen onSignup={handleSignup} onBackToLogin={() => navigateTo('login')} />
    );
  }

  if (state.view === 'forgotPassword') {
    return (
      <ForgotPasswordScreen onBackToLogin={() => navigateTo('login')} />
    );
  }

  if (state.view === 'onboarding') {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center animate-fade-in p-4">
         <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Select Your Goal</h1>
            <p className="text-slate-500 dark:text-slate-400">Choose the exam you want to master.</p>
         </div>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
           {Object.values(ExamType).map((exam) => (
             <button 
               key={exam} 
               onClick={() => { handleExamSelect(exam); navigateTo('tutorial'); }}
               className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-brand-purple hover:ring-2 hover:ring-brand-purple/20 transition-all text-left group"
             >
                <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform duration-300">🎯</span>
                <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-brand-purple transition-colors">{exam}</h3>
                <p className="text-xs text-slate-500 mt-1">Start Preparation →</p>
             </button>
           ))}
         </div>
      </div>
    );
  }

  // --- Main App Layout ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200 select-none">
      {/* Global Watermark */}
      <div className="secure-watermark">
        {Array(20).fill(`${state.user?.email || 'PYQverse User'}`).map((text, i) => (
          <span key={i} className="m-12">{text}</span>
        ))}
      </div>

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
        onToggleLanguage={async () => {
           const newLang = state.language === 'en' ? 'hi' : 'en';
           setState(prev => ({...prev, language: newLang}));
           if(state.user) await saveUserPref(state.user.id, { language: newLang });
        }}
        currentTheme={state.theme}
        onThemeChange={async (t) => {
           setState(prev => ({...prev, theme: t}));
           applyTheme(t);
           if(state.user) await saveUserPref(state.user.id, { theme: t });
        }}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onInstall={() => installPrompt?.prompt()}
        canInstall={!!installPrompt}
        onEnableNotifications={() => {
           if ('Notification' in window) {
             Notification.requestPermission().then(permission => {
               if (permission === 'granted') alert("Notifications Enabled!");
             });
           }
        }}
      />

      {state.view !== 'tutorial' && (
        <nav className="bg-white dark:bg-slate-900 p-4 flex justify-between items-center shadow-sm sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
             {/* Simple Logo */}
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white font-bold font-display shadow-lg shadow-brand-purple/30">
               PV
             </div>
             <span className="font-display font-bold text-lg text-slate-800 dark:text-white hidden sm:block">PYQverse</span>
          </div>
          
          <div className="flex items-center gap-4">
            {state.showTimer && state.view === 'practice' && <Timer />}
            
            {/* Profile/Menu Trigger */}
            <button onClick={() => setIsSidebarOpen(true)} className="relative group">
               <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border-2 border-transparent group-hover:border-brand-purple transition-all">
                  {state.user?.photoURL ? (
                    <img src={state.user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                      {state.user?.name?.[0]}
                    </div>
                  )}
               </div>
            </button>
          </div>
        </nav>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        {state.view === 'tutorial' && (
          <Tutorial onComplete={() => {
             navigateTo('dashboard');
             if(state.user) saveUserPref(state.user.id, { hasSeenTutorial: true });
          }} />
        )}

        {state.view === 'dashboard' && (
          <Dashboard 
            stats={state.stats} 
            showTimer={state.showTimer}
            darkMode={state.darkMode}
            user={state.user}
            onStartPractice={() => setShowPracticeConfig(true)} 
            onUpload={() => navigateTo('upload')} 
            onToggleTimer={toggleTimer}
            onToggleDarkMode={toggleDarkMode}
            onGeneratePaper={() => navigateTo('paperGenerator')}
            onStartCurrentAffairs={handleCurrentAffairs}
            onReadCurrentAffairs={() => {
               generateNews(state.selectedExam!, MONTHS[new Date().getMonth()], new Date().getFullYear()).then(items => {
                  setState(prev => ({ ...prev, newsFeed: items }));
                  navigateTo('news');
               });
            }}
            onReadNotes={handleFetchNotes}
            onEnableNotifications={() => {}}
            language={state.language}
            onToggleLanguage={async () => {
               const newLang = state.language === 'en' ? 'hi' : 'en';
               setState(prev => ({...prev, language: newLang}));
               if(state.user) await saveUserPref(state.user.id, { language: newLang });
            }}
            currentTheme={state.theme}
            onThemeChange={async (t) => {
               setState(prev => ({...prev, theme: t}));
               applyTheme(t);
               if(state.user) await saveUserPref(state.user.id, { theme: t });
            }}
            onUpgrade={() => setShowPaymentModal(true)}
            onInstall={() => installPrompt?.prompt()}
            canInstall={!!installPrompt}
            qotd={state.qotd}
            onOpenQOTD={() => {
               if(state.qotd) {
                  setPracticeQueue([state.qotd]);
                  setCurrentQIndex(0);
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

        {state.view === 'upload' && state.user && state.selectedExam && (
          <UploadForm 
            userId={state.user.id} 
            examType={state.selectedExam} 
            onSuccess={() => {
               alert("Question added to your notebook!");
               navigateTo('dashboard');
            }} 
          />
        )}

        {state.view === 'practice' && practiceQueue.length > 0 && (
          <div className="h-full flex flex-col justify-between max-w-2xl mx-auto">
             <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-6">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${((currentQIndex) / practiceQueue.length) * 100}%` }}
                ></div>
             </div>
             
             <QuestionCard 
               question={practiceQueue[currentQIndex]} 
               onAnswer={handleAnswer} 
               onNext={handleNextQuestion}
               isLast={practiceConfig.mode !== 'endless' && currentQIndex === practiceQueue.length - 1}
               isLoadingNext={isFetchingMore && currentQIndex >= practiceQueue.length - 2}
               language={state.language}
               onToggleLanguage={async () => {
                  const newLang = state.language === 'en' ? 'hi' : 'en';
                  setState(prev => ({...prev, language: newLang}));
                  if(state.user) await saveUserPref(state.user.id, { language: newLang });
               }}
               onBookmarkToggle={async (q) => {
                  if(state.user) {
                     const added = await toggleBookmark(state.user.id, q);
                     const updatedQ = { ...q, isBookmarked: added };
                     const newQueue = [...practiceQueue];
                     newQueue[currentQIndex] = updatedQ;
                     setPracticeQueue(newQueue);
                  }
               }}
             />
          </div>
        )}

        {state.view === 'stats' && (
          <div className="text-center py-12 animate-fade-in">
             <div className="text-6xl mb-4">🎉</div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Complete!</h2>
             <p className="text-slate-500 mb-8">Your progress has been saved to the cloud.</p>
             <div className="flex justify-center gap-4">
                <button onClick={() => navigateTo('dashboard')} className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                   Home
                </button>
                <button onClick={() => setShowPracticeConfig(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">
                   Start New Session
                </button>
             </div>
          </div>
        )}

        {state.view === 'profile' && state.user && state.selectedExam && (
          <ProfileScreen 
            user={state.user} 
            stats={state.stats} 
            selectedExam={state.selectedExam}
            onUpdateUser={async (updatedUser) => {
               await saveUser(updatedUser);
               setState(prev => ({ ...prev, user: updatedUser }));
            }}
            onBack={() => navigateTo('dashboard')}
            onLogout={handleLogout}
            onInstall={() => installPrompt?.prompt()}
            canInstall={!!installPrompt}
            onExamChange={handleExamSelect}
          />
        )}

        {state.view === 'paperGenerator' && state.selectedExam && (
          <PaperGenerator 
             examType={state.selectedExam} 
             onGenerate={(paper) => {
                setState(prev => ({ ...prev, generatedPaper: paper, view: 'paperView' }));
             }}
             onBack={() => navigateTo('dashboard')}
             onExamChange={handleExamSelect}
          />
        )}

        {state.view === 'paperView' && state.generatedPaper && (
          <PaperView 
             paper={state.generatedPaper} 
             onClose={() => navigateTo('dashboard')} 
             language={state.language}
             onToggleLanguage={async () => {
                const newLang = state.language === 'en' ? 'hi' : 'en';
                setState(prev => ({...prev, language: newLang}));
                if(state.user) await saveUserPref(state.user.id, { language: newLang });
             }}
             userId={state.user?.id || ''}
          />
        )}

        {state.view === 'admin' && (
           <AdminDashboard onBack={() => navigateTo('dashboard')} />
        )}

        {state.view === 'downloads' && state.user && (
           <OfflinePapersList 
              userId={state.user.id} 
              onBack={() => navigateTo('dashboard')}
              onOpenPaper={(paper) => {
                 setState(prev => ({ ...prev, generatedPaper: paper, view: 'paperView' }));
              }}
           />
        )}

        {state.view === 'analytics' && state.user && (
           <SmartAnalytics 
              stats={state.stats} 
              history={[]} 
              onBack={() => navigateTo('dashboard')}
           />
        )}

        {state.view === 'leaderboard' && state.user && (
           <Leaderboard user={state.user} onBack={() => navigateTo('dashboard')} />
        )}

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
           <PYQLibrary 
              examType={state.selectedExam}
              onBack={() => navigateTo('dashboard')}
              language={state.language}
              onBookmarkToggle={async (q) => {
                 if(state.user) await toggleBookmark(state.user.id, q);
              }}
           />
        )}

        {state.view === 'bookmarks' && state.user && (
           <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                 <button onClick={() => navigateTo('dashboard')} className="text-slate-500 hover:text-indigo-600 flex items-center gap-1">← Back</button>
                 <h2 className="text-2xl font-bold font-display dark:text-white">Bookmarks</h2>
              </div>
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl">
                 <p className="text-slate-500">Feature coming soon: Your saved questions will appear here.</p>
              </div>
           </div>
        )}

      </main>

      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-2"></div>
              <p className="text-slate-700 dark:text-white font-bold">Loading Universe...</p>
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
          onUpgrade={() => { setShowPracticeConfig(false); setShowPaymentModal(true); }}
        />
      )}

      {showPaymentModal && (
        <PaymentModal 
           onClose={() => setShowPaymentModal(false)}
           onSuccess={async () => {
              if (state.user) {
                 const updatedUser = { ...state.user, isPro: true };
                 await saveUser(updatedUser);
                 setState(prev => ({ ...prev, user: updatedUser }));
                 setShowPaymentModal(false);
                 alert("Welcome to Pro! 🌟");
              }
           }}
        />
      )}

    </div>
  );
};

export default App;
