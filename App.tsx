
import React, { useState, useEffect } from 'react';
import { AppState, ExamType, Question, User, ViewState, QuestionPaper } from './types';
import { EXAM_SUBJECTS } from './constants';
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

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'login',
    selectedExam: null,
    stats: INITIAL_STATS,
    user: null,
    showTimer: true,
    generatedPaper: null,
    darkMode: false
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
  const [practiceConfig, setPracticeConfig] = useState<{ mode: 'finite' | 'endless'; subject: string }>({ mode: 'finite', subject: 'Mixed' });
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Initialize App & PWA Install Prompt
  useEffect(() => {
    const user = getUser();
    if (user) {
      const { selectedExam, showTimer, hasSeenTutorial, darkMode } = getUserPref(user.id);
      const userStats = getStats(user.id);
      
      let nextView: ViewState = 'onboarding';
      if (selectedExam) {
        // If exam selected, check if they need to see tutorial
        nextView = hasSeenTutorial ? 'dashboard' : 'tutorial';
      }

      setState(prev => ({ ...prev, user, selectedExam, stats: userStats, view: nextView, showTimer, darkMode }));
      
      // Apply dark mode
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

    } else {
      setState(prev => ({ ...prev, view: 'login' }));
    }
    setIsAppInitializing(false);

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log("Install prompt captured");
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
        // Default fallback if no state (e.g. initial load)
        // If user is logged in, go to dashboard, else login
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

  // Helper to navigate and push history
  const navigateTo = (view: ViewState) => {
    // Pass null as URL to avoid SecurityError in sandboxed/blob environments
    window.history.pushState({ view }, '', null);
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

  const handleLogin = (user: User) => {
    saveUser(user);
    const { selectedExam, showTimer, hasSeenTutorial, darkMode } = getUserPref(user.id);
    const userStats = getStats(user.id);
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

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
      darkMode
    }));
    
    // Push history for the new view
    window.history.pushState({ view: nextView }, '', null);
  };

  const handleSignup = (user: User, exam: ExamType) => {
    saveUser(user);
    // Save the selected exam immediately
    saveUserPref(user.id, { selectedExam: exam });
    
    // Initialize stats (implicitly handled by storage service getter, but good to have)
    const userStats = getStats(user.id);

    // Go to tutorial since it's a fresh user
    const nextView = 'tutorial';
    setState(prev => ({ 
      ...prev, 
      user, 
      selectedExam: exam,
      stats: userStats,
      view: nextView,
      showTimer: true,
      darkMode: false
    }));
    window.history.pushState({ view: nextView }, '', null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    saveUser(updatedUser);
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  const handleLogout = () => {
    removeUser();
    document.documentElement.classList.remove('dark');
    setState(prev => ({
      ...prev,
      user: null,
      view: 'login',
      selectedExam: null,
      stats: INITIAL_STATS,
      darkMode: false
    }));
    window.history.pushState({ view: 'login' }, '', null);
  };

  const handleExamSelect = (exam: ExamType) => {
    if (!state.user) return;
    saveUserPref(state.user.id, { selectedExam: exam });
    navigateTo('tutorial');
    setState(prev => ({ ...prev, selectedExam: exam }));
  };
  
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

  // Opens the config modal
  const handleStartPractice = () => {
    setShowPracticeConfig(true);
  };

  const startPracticeSession = async (config: { subject: string, count: number, mode: 'finite' | 'endless' }) => {
    if (!state.selectedExam || !state.user) return;
    
    setShowPracticeConfig(false);
    setPracticeConfig({ mode: config.mode, subject: config.subject });
    setIsLoading(true);
    
    try {
      // 1. Fetch user questions (Revision)
      const userQuestions = getUserQuestions(state.user.id).filter(q => q.examType === state.selectedExam);
      const shuffledUserQ = userQuestions.sort(() => 0.5 - Math.random()).slice(0, 3);

      // 2. Determine Subject to generate
      let subjectToGen = config.subject;
      if (config.subject === 'Mixed') {
        const subjects = EXAM_SUBJECTS[state.selectedExam];
        subjectToGen = subjects[Math.floor(Math.random() * subjects.length)];
      }

      // 3. Generate AI questions (Initial batch)
      // If endless, we start with 5. If finite, we try to get full count (up to 10 at a time to avoid timeout, simplified here to 5 + re-fetch)
      const batchSize = Math.min(config.count, 5); 
      const aiQuestions = await generateExamQuestions(state.selectedExam, subjectToGen, batchSize);

      // 4. Merge
      const combined = [...shuffledUserQ, ...aiQuestions];
      setPracticeQueue(combined.sort(() => 0.5 - Math.random()));
      setCurrentQIndex(0);
      navigateTo('practice');
      
      // If finite and count > 5, we might need to fetch more immediately in background, but keeping logic simple for now.
      
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

  const nextQuestion = async () => {
    const isEnd = currentQIndex >= practiceQueue.length - 1;

    // Endless Mode: Check if we need to fetch more
    if (practiceConfig.mode === 'endless' && !isFetchingMore) {
      const remaining = practiceQueue.length - (currentQIndex + 1);
      if (remaining < 3) {
        setIsFetchingMore(true);
        
        // Determine subject
        let subjectToGen = practiceConfig.subject;
        if (practiceConfig.subject === 'Mixed') {
           const subjects = EXAM_SUBJECTS[state.selectedExam!];
           subjectToGen = subjects[Math.floor(Math.random() * subjects.length)];
        }

        generateExamQuestions(state.selectedExam!, subjectToGen, 5)
          .then(newQs => {
             setPracticeQueue(prev => [...prev, ...newQs]);
          })
          .finally(() => setIsFetchingMore(false));
      }
    }

    if (!isEnd) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      // If finite, end session. If endless, user explicitly quit or we wait for fetch (handled by UI button "Finish" vs "Next")
      // For endless, we usually don't hit "End" unless fetch failed.
      if (practiceConfig.mode === 'endless' && isFetchingMore) {
         // Show loading?
         alert("Fetching more questions... please wait a moment.");
      } else {
         navigateTo('dashboard');
      }
    }
  };

  const handlePaperGenerated = (paper: QuestionPaper) => {
    setState(prev => ({ ...prev, generatedPaper: paper }));
    navigateTo('paperView');
  };

  // --- Views ---

  if (isAppInitializing) {
    return null; 
  }

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
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
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
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl mx-auto flex items-center justify-center mb-6 text-3xl shadow-sm">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Welcome, {state.user?.name?.split(' ')[0] || 'Student'}!</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Select your target exam to personalize your AI tutor and revision bank.</p>
          
          <div className="grid gap-3">
            {Object.values(ExamType).map((exam) => (
              <button
                key={exam}
                onClick={() => handleExamSelect(exam)}
                className="w-full p-4 text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-medium text-slate-700 dark:text-slate-200 flex justify-between items-center group bg-white dark:bg-slate-800 shadow-sm hover:shadow-md"
              >
                {exam}
                <span className="opacity-0 group-hover:opacity-100 text-indigo-600 dark:text-indigo-400 transition-opacity">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 safe-top transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigateTo('dashboard')}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200 dark:shadow-none">E</div>
            <span className="font-bold text-slate-800 dark:text-white hidden sm:block">ExamMaster</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Install App Button Logic */}
            {(installPrompt || isIOS) && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install App
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
              <button 
                onClick={() => navigateTo('dashboard')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${state.view === 'dashboard' ? 'bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Dash
              </button>
              <button 
                onClick={() => navigateTo('upload')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${state.view === 'upload' ? 'bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Add Notes
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-600"></div>

            <div className="flex items-center gap-3">
               <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{state.user?.name}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-1.5 rounded-md inline-block mt-0.5">{state.selectedExam}</p>
               </div>
               
               {/* User Profile & Logout */}
               <div className="flex items-center gap-2">
                 <button 
                    onClick={() => navigateTo('profile')}
                    className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm hover:ring-2 hover:ring-indigo-400 transition-all" 
                    title="View Profile"
                 >
                    {state.user?.photoURL ? (
                      <img src={state.user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold">
                        {state.user?.name?.[0] || 'U'}
                      </div>
                    )}
                 </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24 safe-bottom">
        {/* Mobile Install Banner */}
        {(installPrompt || isIOS) && (
          <div className="sm:hidden mb-4 bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-xl">🎓</div>
              <div>
                <p className="font-bold text-sm">Install ExamMaster</p>
                <p className="text-xs text-indigo-200">Practice offline & better experience</p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              Install
            </button>
          </div>
        )}

        {/* Practice Config Modal */}
        {showPracticeConfig && state.selectedExam && (
          <PracticeConfigModal 
            examType={state.selectedExam}
            onStart={startPracticeSession}
            onClose={() => setShowPracticeConfig(false)}
          />
        )}

        {/* iOS Help Modal */}
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
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">1.</span>
                  <span>Tap the <strong className="text-slate-800 dark:text-white">Share</strong> button <svg className="w-4 h-4 inline text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> in Safari.</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">2.</span>
                  <span>Scroll down and tap <strong className="text-slate-800 dark:text-white">Add to Home Screen</strong>.</span>
                </div>
              </div>
              <button 
                onClick={() => setShowIOSHelp(false)}
                className="w-full mt-6 bg-indigo-600 text-white font-bold py-3 rounded-xl"
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
            onStartPractice={handleStartPractice} 
            onUpload={() => navigateTo('upload')} 
            onToggleTimer={toggleTimer}
            onToggleDarkMode={toggleDarkMode}
            onGeneratePaper={() => navigateTo('paperGenerator')}
          />
        )}

        {state.view === 'paperGenerator' && state.user && (
          <PaperGenerator 
            examType={state.selectedExam!} 
            onGenerate={handlePaperGenerated}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {state.view === 'paperView' && state.generatedPaper && (
           <PaperView 
             paper={state.generatedPaper}
             onClose={() => navigateTo('dashboard')}
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
              className="mb-4 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
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

        {state.view === 'practice' && practiceQueue.length > 0 && (
          <div className="h-full flex flex-col justify-center py-4 animate-fade-in">
             <div className="mb-4 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 px-2">
                <div className="flex items-center gap-2">
                  <span>Question {currentQIndex + 1}</span>
                  {practiceConfig.mode === 'endless' && (
                     <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded text-xs font-bold">∞</span>
                  )}
                  {practiceConfig.mode !== 'endless' && (
                     <span>of {practiceQueue.length}</span>
                  )}
                </div>
                
                {state.showTimer && <Timer />}

                <button 
                  onClick={() => navigateTo('dashboard')}
                  className="hover:text-red-500 font-medium transition-colors"
                >
                  {practiceConfig.mode === 'endless' ? 'Finish' : 'Quit'}
                </button>
             </div>
            <QuestionCard 
              question={practiceQueue[currentQIndex]} 
              onAnswer={handleAnswer}
              onNext={nextQuestion}
              isLast={practiceConfig.mode !== 'endless' && currentQIndex === practiceQueue.length - 1}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
