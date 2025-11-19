
import React, { useState, useEffect } from 'react';
import { AppState, ExamType, Question, User } from './types';
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
import { Button } from './components/Button';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'login', // Initial state, effectively controlled by useEffect
    selectedExam: null,
    stats: INITIAL_STATS,
    user: null
  });

  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);

  // Initialize App
  useEffect(() => {
    const user = getUser();
    if (user) {
      const { selectedExam } = getUserPref(user.id);
      const userStats = getStats(user.id);
      if (selectedExam) {
        setState(prev => ({ ...prev, user, selectedExam, stats: userStats, view: 'dashboard' }));
      } else {
        setState(prev => ({ ...prev, user, stats: userStats, view: 'onboarding' }));
      }
    } else {
      setState(prev => ({ ...prev, view: 'login' }));
    }
    setIsAppInitializing(false);
  }, []);

  const handleLogin = (user: User) => {
    saveUser(user);
    const { selectedExam } = getUserPref(user.id);
    const userStats = getStats(user.id);
    setState(prev => ({ 
      ...prev, 
      user, 
      selectedExam, 
      stats: userStats,
      view: selectedExam ? 'dashboard' : 'onboarding' 
    }));
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
  };

  const handleExamSelect = (exam: ExamType) => {
    if (!state.user) return;
    saveUserPref(state.user.id, exam);
    setState(prev => ({ ...prev, selectedExam: exam, view: 'dashboard' }));
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
      setState(prev => ({ ...prev, view: 'practice' }));
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
      setState(prev => ({ ...prev, view: 'dashboard' }));
    }
  };

  // --- Views ---

  if (isAppInitializing) {
    return null; // Or a splash screen
  }

  if (state.view === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
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
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl mx-auto flex items-center justify-center mb-6 text-3xl">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Welcome, {state.user?.name?.split(' ')[0] || 'Student'}!</h1>
          <p className="text-slate-500 mb-8">Select your target exam to personalize your AI tutor and revision bank.</p>
          
          <div className="grid gap-3">
            {Object.values(ExamType).map((exam) => (
              <button
                key={exam}
                onClick={() => handleExamSelect(exam)}
                className="w-full p-4 text-left rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-slate-700 flex justify-between items-center group"
              >
                {exam}
                <span className="opacity-0 group-hover:opacity-100 text-indigo-600">→</span>
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
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setState(prev => ({...prev, view: 'dashboard'}))}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200">E</div>
            <span className="font-bold text-slate-800 hidden sm:block">ExamMaster</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setState(prev => ({...prev, view: 'dashboard'}))}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${state.view === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Dash
              </button>
              <button 
                onClick={() => setState(prev => ({...prev, view: 'upload'}))}
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
                 <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm" title={state.user?.name}>
                    {state.user?.photoURL ? (
                      <img src={state.user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                        {state.user?.name?.[0] || 'U'}
                      </div>
                    )}
                 </div>
                 
                 <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                    title="Logout"
                 >
                    <span className="hidden sm:inline text-xs font-semibold">Logout</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                 </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6">
        {state.view === 'dashboard' && (
          <Dashboard 
            stats={state.stats} 
            onStartPractice={startPractice} 
            onUpload={() => setState(prev => ({...prev, view: 'upload'}))} 
          />
        )}

        {state.view === 'upload' && state.user && (
          <div className="max-w-3xl mx-auto">
            <button 
              onClick={() => setState(prev => ({...prev, view: 'dashboard'}))}
              className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"
            >
              ← Back to Dashboard
            </button>
            <UploadForm 
              userId={state.user.id}
              examType={state.selectedExam!} 
              onSuccess={() => {
                alert("Question saved to your revision bank!");
                setState(prev => ({...prev, view: 'dashboard'}));
              }} 
            />
          </div>
        )}

        {state.view === 'practice' && practiceQueue.length > 0 && (
          <div className="h-full flex flex-col justify-center py-4">
             <div className="mb-4 flex justify-between items-center text-sm text-slate-500 px-2">
                <span>Question {currentQIndex + 1} of {practiceQueue.length}</span>
                <button 
                  onClick={() => setState(prev => ({...prev, view: 'dashboard'}))}
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
