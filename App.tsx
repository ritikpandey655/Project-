
import React, { useState, useEffect } from 'react';
import { AppState, ExamType, Question, User, ViewState } from './types';
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

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'login',
    selectedExam: null,
    stats: INITIAL_STATS,
    user: null,
    showTimer: true
  });

  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Initialize App & PWA Install Prompt
  useEffect(() => {
    const user = getUser();
    if (user) {
      const { selectedExam, showTimer, hasSeenTutorial } = getUserPref(user.id);
      const userStats = getStats(user.id);
      
      let nextView: ViewState = 'onboarding';
      if (selectedExam) {
        // If exam selected, check if they need to see tutorial
        nextView = hasSeenTutorial ? 'dashboard' : 'tutorial';
      }

      setState(prev => ({ ...prev, user, selectedExam, stats: userStats, view: nextView, showTimer }));
    } else {
      setState(prev => ({ ...prev, view: 'login' }));
    }
    setIsAppInitializing(false);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    // Fix: Cast event name to any to avoid TS error since beforeinstallprompt is not standard yet
    window.addEventListener('beforeinstallprompt' as any, handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt' as any, handleBeforeInstallPrompt);
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
    window.history.pushState({ view }, '', `/${view === 'dashboard' ? '' : view}`);
    setState(prev => ({ ...prev, view }));
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  const handleLogin = (user: User) => {
    saveUser(user);
    const { selectedExam, showTimer, hasSeenTutorial } = getUserPref(user.id);
    const userStats = getStats(user.id);
    
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
      showTimer
    }));
    
    // Push history for the new view
    window.history.pushState({ view: nextView }, '', '/');
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
      showTimer: true
    }));
    window.history.pushState({ view: nextView }, '', '/tutorial');
  };

  const handleUpdateUser = (updatedUser: User) => {
    saveUser(updatedUser);
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  const handleLogout = () => {
    removeUser();
    setState(prev => ({
      ...prev,
      user: null,
      view: 'login',
      selectedExam: null,
      stats: INITIAL_STATS
    }));
    window.history.pushState({ view: 'login' }, '', '/login');
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

  const startPractice = async () => {
    if (!state.selectedExam || !state.user) return;
    setIsLoading(true);
    
    try {
      // 1. Fetch user questions (Revision) - PASS USER ID
      const userQuestions = getUserQuestions(state.user.id).filter(q => q.examType === state.selectedExam);
      // Get up to 3 random user questions
      const shuffledUserQ = userQuestions.sort(() => 0.5 - Math.random()).slice(0, 3);

      // 2. Generate AI questions (PYQ)
      // Pick a random subject from the exam
      const subjects = EXAM_SUBJECTS[state.selectedExam];
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      // Generate 5 questions
      const aiQuestions = await generateExamQuestions(state.selectedExam, randomSubject, 5);

      // 3. Merge
      const combined = [...shuffledUserQ, ...aiQuestions];
      // Shuffle final deck
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
    
    // Update stats with User ID
    updateStats(state.user.id, isCorrect, currentQ.subject || 'General', currentQ.examType);
    
    // Refresh stats in state
    setState(prev => ({ ...prev, stats: getStats(state.user!.id) }));
  };

  const nextQuestion = () => {
    if (currentQIndex < practiceQueue.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      // End of session
      navigateTo('dashboard');
    }
  };

  // --- Views ---

  if (isAppInitializing) {
    return null; // Or a splash screen
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Curating your revision set...</p>
      </div>
    );
  }

  if (state.view === 'onboarding' || !state.selectedExam) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 relative">
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-6 text-sm text-slate-400 hover:text-red-500"
        >
          Logout
        </button>
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl mx-auto flex items-center justify-center mb-6 text-3xl shadow-sm">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Welcome, {state.user?.name?.split(' ')[0] || 'Student'}!</h1>
          <p className="text-slate-500 mb-8">Select your target exam to personalize your AI tutor and revision bank.</p>
          
          <div className="grid gap-3">
            {Object.values(ExamType).map((exam) => (
              <button
                key={exam}
                onClick={() => handleExamSelect(exam)}
                className="w-full p-4 text-left rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-slate-700 flex justify-between items-center group bg-white shadow-sm hover:shadow-md"
              >
                {exam}
                <span className="opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 safe-top">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigateTo('dashboard')}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200">E</div>
            <span className="font-bold text-slate-800 hidden sm:block">ExamMaster</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {installPrompt && (
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

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => navigateTo('dashboard')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${state.view === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Dash
              </button>
              <button 
                onClick={() => navigateTo('upload')}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${state.view === 'upload' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Add Notes
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3">
               <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-700">{state.user?.name}</p>
                  <p className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 rounded-md inline-block mt-0.5">{state.selectedExam}</p>
               </div>
               
               {/* User Profile & Logout */}
               <div className="flex items-center gap-2">
                 <button 
                    onClick={() => navigateTo('profile')}
                    className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm hover:ring-2 hover:ring-indigo-400 transition-all" 
                    title="View Profile"
                 >
                    {state.user?.photoURL ? (
                      <img src={state.user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
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
        {/* Mobile Install Banner - Visible only if prompt available */}
        {installPrompt && (
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

        {state.view === 'dashboard' && (
          <Dashboard 
            stats={state.stats} 
            showTimer={state.showTimer}
            onStartPractice={startPractice} 
            onUpload={() => navigateTo('upload')} 
            onToggleTimer={toggleTimer}
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
              className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"
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
             <div className="mb-4 flex justify-between items-center text-sm text-slate-500 px-2">
                <span>Question {currentQIndex + 1} of {practiceQueue.length}</span>
                
                {state.showTimer && <Timer />}

                <button 
                  onClick={() => navigateTo('dashboard')}
                  className="hover:text-red-500 font-medium"
                >
                  Quit Practice
                </button>
             </div>
            <QuestionCard 
              question={practiceQueue[currentQIndex]} 
              onAnswer={handleAnswer}
              onNext={nextQuestion}
              isLast={currentQIndex === practiceQueue.length - 1}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
