
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ExamType, Question, User, ViewState, ExamResult } from '../types';
import { EXAM_SUBJECTS, THEME_PALETTES } from '../constants';
import { 
  getUserPref, getStats, saveUserPref, updateStats, 
  saveUser, getUser, toggleBookmark, getExamConfig,
  updateUserActivity, updateUserSession, getExamHistory, INITIAL_STATS, getSystemConfig, subscribeToSystemConfig
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
import { LogoIcon } from './LogoIcon';
import { PWAInstallBanner } from './PWAInstallBanner';
import { PYQLibrary } from './PYQLibrary'; 
import { CurrentAffairsFeed } from './CurrentAffairsFeed'; 

// Firebase Engine
import { auth, db } from '../src/firebaseConfig';

const LAST_VIEW_KEY = 'pyqverse_last_view';
const INSTALL_DISMISSED_KEY = 'pyqverse_install_dismissed_v2';

// Valid views list for sanitization
const VALID_VIEWS: ViewState[] = [
  'landing', 'login', 'signup', 'forgotPassword', 'dashboard', 'practice', 
  'upload', 'profile', 'admin', 'analytics', 'leaderboard', 'bookmarks', 
  'privacy', 'terms', 'paperGenerator', 'paperView'
];

interface PracticeConfig {
  mode: 'finite' | 'endless';
  subject: string;
  count: number;
  topic?: string;
}

// --- SEO: RICH KEYWORD MAPPING ---
const SEO_RICH_KEYWORDS: Record<string, string> = {
  'UPSC': 'IAS Preparation, UPSC Prelims 2025, UPSC Mains Syllabus, CSE Mock Test, Civil Services PYQ',
  'JEE Mains': 'IIT JEE Preparation, JEE Advanced, PCM Formulas, Engineering Entrance, NTA Mock Test',
  'NEET': 'NEET UG 2025, Biology NCERT, Medical Entrance Exam, NEET Physics PYQ, NEET Chemistry',
  'SSC CGL': 'SSC CGL Tier 1, SSC Reasoning, Quantitative Aptitude, Govt Job Exam Prep, SSC CHSL',
  'UP Board Class 10': 'UP Board High School, UPMSP Model Paper, Class 10 Hindi Medium, UP Board Result',
  'UP Board Class 12': 'UP Board Intermediate, UPMSP Class 12 Syllabus, UP Board Physics Math, Hindi Medium Exam',
  'Banking': 'IBPS PO, SBI Clerk, Banking Awareness, Quantitative Aptitude for Bank Exams',
  'Railways': 'RRB NTPC, Railway Group D, General Science for Railways, RRB ALP',
};

export const App: React.FC = () => {
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
  
  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  const [generationLatency, setGenerationLatency] = useState<number>(0);
  const currentSessionId = useRef<string>(Date.now().toString());

  // --- SEO: DYNAMIC TITLES & META ---
  useEffect(() => {
    let title = "PYQverse - India's Best AI Exam Prep App";
    let desc = "Practice unlimited Previous Year Questions (PYQ) for UPSC, SSC CGL, JEE Mains, NEET & UP Board. Features Instant AI Doubt Solving, Mock Tests, and Analytics.";
    let keywords = "PYQverse, Exam Prep, AI Doubt Solver, Previous Year Questions, Mock Tests, Online Test Series, Free Mock Test";
    let robotsContent = "index, follow";

    if (state.view === 'practice' && state.selectedExam) {
        title = `Practice ${state.selectedExam} Questions 2025 | PYQverse`;
        desc = `Attempt ${state.selectedExam} Previous Year Questions (PYQ) and Mock Tests with instant AI explanations. Improve your accuracy for ${state.selectedExam} 2025.`;
        const richKeywords = SEO_RICH_KEYWORDS[state.selectedExam] || `${state.selectedExam} Syllabus, ${state.selectedExam} Preparation`;
        keywords += `, ${state.selectedExam} PYQ, ${state.selectedExam} Mock Test, ${richKeywords}`;
    } else if (state.view === 'dashboard') {
        title = "My Dashboard | PYQverse";
        desc = "Track your exam preparation progress, daily streaks, and subject-wise performance analytics on PYQverse.";
    } else if (state.view === 'upload') {
        title = "AI Doubt Solver - Instant Solutions | PYQverse";
        desc = "Stuck on a question? Upload an image or type text to get instant AI-powered solutions and detailed explanations.";
    }

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    document.querySelector('meta[name="keywords"]')?.setAttribute("content", keywords);
  }, [state.view, state.selectedExam]);

  // --- INIT & AUTH ---
  useEffect(() => {
    // Theme Init
    const savedTheme = localStorage.getItem('pyqverse_theme') || 'PYQverse Prime';
    setState(s => ({ ...s, theme: savedTheme }));

    // Auth Listener
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
            const userId = firebaseUser.uid;
            
            // Parallel Fetch
            const [userData, userStats, userPrefs, history] = await Promise.all([
                getUser(userId),
                getStats(userId),
                getUserPref(userId),
                getExamHistory(userId)
            ]);

            // Force Admin for known emails if DB is out of sync
            const isAdminEmail = ['support@pyqverse.in', 'admin@pyqverse.com'].includes(firebaseUser.email || '');
            
            const finalUser = userData || { 
                id: userId, 
                name: firebaseUser.displayName || 'User', 
                email: firebaseUser.email || '', 
                photoURL: firebaseUser.photoURL,
                isAdmin: isAdminEmail 
            };

            // Double check admin status
            if (isAdminEmail && !finalUser.isAdmin) finalUser.isAdmin = true;

            // Restore Last View
            const lastView = localStorage.getItem(LAST_VIEW_KEY) as ViewState;
            const initialView = (VALID_VIEWS.includes(lastView) && lastView !== 'landing' && lastView !== 'login') ? lastView : 'dashboard';

            setState(s => ({
                ...s,
                user: finalUser,
                stats: userStats,
                examHistory: history,
                selectedExam: (userPrefs.selectedExam as ExamType) || s.selectedExam || 'UPSC',
                view: initialView,
                darkMode: userPrefs.darkMode ?? true,
                language: userPrefs.language ?? 'en',
            }));
            
            setExamHistory(history);
            
            // Session Tracking
            updateUserActivity(userId);
            updateUserSession(userId, currentSessionId.current);

        } else {
            setState(s => ({ ...s, user: null, view: 'landing' }));
        }
    });

    // PWA Listener
    window.addEventListener('pwa-ready', () => {
        if (!localStorage.getItem(INSTALL_DISMISSED_KEY)) {
            setDeferredPrompt((window as any).deferredPrompt);
            setShowInstallBanner(true);
        }
    });

    // Config Subscription
    const unsubConfig = subscribeToSystemConfig(() => {});

    // Online Status
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    return () => {
        unsubscribe();
        unsubConfig();
    };
  }, []);

  // --- THEME EFFECT (FIXED) ---
  useEffect(() => {
    const root = document.documentElement;
    const palette = THEME_PALETTES[state.theme] || THEME_PALETTES['PYQverse Prime'];
    
    // Inject CSS Variables for Tailwind to pick up
    root.style.setProperty('--brand-primary', palette[500]);
    Object.keys(palette).forEach(key => {
        root.style.setProperty(`--primary-${key}`, palette[key as any]);
    });

    root.classList.toggle('dark', state.darkMode);
    root.setAttribute('data-theme', state.theme);
  }, [state.darkMode, state.theme]);

  // --- ACTIONS ---

  const handleLogin = (user: User) => {
    setState(s => ({ ...s, user, view: 'dashboard' }));
  };

  const handleSignup = (user: User, selectedExam: ExamType) => {
    setState(s => ({ ...s, user, selectedExam, view: 'dashboard' }));
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem(LAST_VIEW_KEY);
    setState(s => ({ ...s, user: null, view: 'landing' }));
  };

  const navigate = (view: ViewState) => {
    setState(s => ({ ...s, view }));
    localStorage.setItem(LAST_VIEW_KEY, view);
    window.scrollTo(0, 0);
  };

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
    }
  };

  const handlePWADismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
  };

  const generateQuestions = async (config: PracticeConfig, isLoadMore = false) => {
    if (!state.selectedExam) return;
    
    if (isLoadMore) setIsFetchingMore(true);
    else setIsLoading(true);

    const startTime = Date.now();
    try {
        // Prepare topics array if single topic provided
        const topics = config.topic ? [config.topic] : [];
        
        const questions = await generateExamQuestions(
            state.selectedExam,
            config.subject,
            config.count,
            'Medium', // Could be dynamic
            topics,
            state.language
        );

        const latency = Date.now() - startTime;
        setGenerationLatency(latency);

        if (questions && questions.length > 0) {
            setPracticeQueue(prev => isLoadMore ? [...prev, ...questions] : questions);
            if (!isLoadMore) {
                setCurrentQIndex(0);
                setSessionCorrect(0);
                setSessionWrong(0);
                navigate('practice');
            }
        } else {
            alert("Could not generate questions. Please try again.");
        }
    } catch (e) {
        console.error(e);
        alert("Generation failed. Please check connection.");
    } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
        setShowPracticeConfig(false);
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!state.user || !state.selectedExam) return;
    
    // Update Local Session
    if (isCorrect) setSessionCorrect(p => p + 1);
    else setSessionWrong(p => p + 1);

    // Update DB
    const currentQ = practiceQueue[currentQIndex];
    await updateStats(state.user.id, isCorrect, currentQ.subject || 'General', state.selectedExam);
    
    // Update State Stats
    setState(s => {
        const newStats = { ...s.stats };
        newStats.totalAttempted++;
        if (isCorrect) newStats.totalCorrect++;
        if (!newStats.subjectPerformance) newStats.subjectPerformance = {};
        
        const subj = currentQ.subject || 'General';
        if (!newStats.subjectPerformance[subj]) newStats.subjectPerformance[subj] = { correct: 0, total: 0 };
        
        newStats.subjectPerformance[subj].total++;
        if (isCorrect) newStats.subjectPerformance[subj].correct++;
        
        return { ...s, stats: newStats };
    });
  };

  const handleNextQuestion = () => {
    if (currentQIndex < practiceQueue.length - 1) {
        setCurrentQIndex(p => p + 1);
    } else if (practiceConfig.mode === 'endless') {
        generateQuestions(practiceConfig, true);
    } else {
        // End of session
        navigate('dashboard');
    }
  };

  const handleBookmark = async (q: Question) => {
      if (state.user) {
          await toggleBookmark(state.user.id, q);
      }
  };

  // --- RENDER VIEW ---
  const renderView = () => {
    switch (state.view) {
        case 'landing':
            return <LandingPage 
                onLogin={() => navigate('login')} 
                onSignup={(query) => {
                    if(query) setInitialDoubtQuery(query);
                    navigate('signup');
                }}
                onNavigate={navigate}
            />;
        
        case 'login':
            return <LoginScreen 
                onLogin={handleLogin}
                onNavigateToSignup={() => navigate('signup')}
                onForgotPassword={() => navigate('forgotPassword')}
                onNavigateToPrivacy={() => navigate('privacy')}
                onNavigateToTerms={() => navigate('terms')}
                isOnline={isOnline}
            />;

        case 'signup':
            return <SignupScreen 
                onSignup={(user, exam) => {
                    handleSignup(user, exam);
                    if (initialDoubtQuery) {
                        navigate('upload');
                    }
                }}
                onBackToLogin={() => navigate('login')}
                onNavigateToPrivacy={() => navigate('privacy')}
                onNavigateToTerms={() => navigate('terms')}
            />;

        case 'forgotPassword':
            return <ForgotPasswordScreen onBackToLogin={() => navigate('login')} />;

        case 'dashboard':
            return <Dashboard 
                user={state.user}
                stats={state.stats}
                showTimer={state.showTimer}
                darkMode={state.darkMode}
                selectedExam={state.selectedExam}
                onStartPractice={() => setShowPracticeConfig(true)}
                onUpload={() => navigate('upload')}
                onGeneratePaper={() => navigate('paperGenerator')}
                onToggleTimer={() => setState(s => ({...s, showTimer: !s.showTimer}))}
                onToggleDarkMode={() => {
                    setState(s => {
                        const newMode = !s.darkMode;
                        if(s.user) saveUserPref(s.user.id, { darkMode: newMode });
                        return { ...s, darkMode: newMode };
                    });
                }}
                onNavigate={navigate}
                onOpenAnalytics={() => navigate('analytics')}
                onOpenLeaderboard={() => navigate('leaderboard')}
                onOpenBookmarks={() => navigate('bookmarks')}
                onStartCurrentAffairs={() => alert("Coming Soon!")}
                onReadCurrentAffairs={() => alert("Coming Soon!")}
                onReadNotes={() => alert("Coming Soon!")}
                onEnableNotifications={() => {
                    if ('Notification' in window) Notification.requestPermission();
                }}
                isOnline={isOnline}
                language={state.language}
            />;

        case 'practice':
            if (practiceQueue.length === 0 || isLoading) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 font-bold text-slate-500">Preparing Practice Set...</p>
                    </div>
                );
            }
            return <QuestionCard 
                question={practiceQueue[currentQIndex]}
                onAnswer={handleAnswer}
                onNext={handleNextQuestion}
                onBack={() => navigate('dashboard')}
                isLast={practiceConfig.mode !== 'endless' && currentQIndex === practiceQueue.length - 1}
                isLoadingNext={isFetchingMore && currentQIndex === practiceQueue.length - 1}
                language={state.language}
                onToggleLanguage={() => setState(s => ({...s, language: s.language === 'en' ? 'hi' : 'en'}))}
                onBookmarkToggle={handleBookmark}
                sessionStats={{
                    currentIndex: currentQIndex,
                    total: practiceQueue.length,
                    correct: sessionCorrect,
                    wrong: sessionWrong
                }}
                latency={generationLatency}
            />;

        case 'upload':
            return <UploadForm 
                userId={state.user?.id || 'guest'}
                examType={state.selectedExam || 'UPSC'}
                onSuccess={() => alert("Saved!")}
                initialQuery={initialDoubtQuery || undefined}
            />;

        case 'profile':
            if (!state.user) return null;
            return <ProfileScreen 
                user={state.user}
                stats={state.stats}
                selectedExam={state.selectedExam || 'UPSC'}
                onUpdateUser={(updatedUser) => {
                    setState(s => ({ ...s, user: updatedUser }));
                    saveUser(updatedUser);
                }}
                onBack={() => navigate('dashboard')}
                onLogout={handleLogout}
            />;

        case 'admin':
            return <AdminDashboard onBack={() => navigate('dashboard')} />;

        case 'analytics':
            return <SmartAnalytics 
                stats={state.stats}
                history={examHistory}
                onBack={() => navigate('dashboard')}
            />;

        case 'leaderboard':
            if (!state.user) return null;
            return <Leaderboard 
                user={state.user}
                onBack={() => navigate('dashboard')}
            />;

        case 'bookmarks':
            if (!state.user) return null;
            return <BookmarksList 
                userId={state.user.id}
                onBack={() => navigate('dashboard')}
            />;

        case 'paperGenerator':
            if (!state.selectedExam) return null;
            return <PaperGenerator 
                examType={state.selectedExam}
                onGenerate={(paper) => {
                    setState(s => ({ ...s, generatedPaper: paper }));
                    navigate('paperView');
                }}
                onBack={() => navigate('dashboard')}
                onExamChange={(ex) => setState(s => ({...s, selectedExam: ex}))}
            />;

        case 'paperView':
            if (!state.generatedPaper || !state.user) return null;
            return <PaperView 
                paper={state.generatedPaper}
                userId={state.user.id}
                onClose={() => navigate('dashboard')}
                language={state.language}
            />;

        case 'privacy':
            return <PrivacyPolicy onBack={() => navigate(state.user ? 'dashboard' : 'landing')} />;

        case 'terms':
            return <TermsOfService onBack={() => navigate(state.user ? 'dashboard' : 'landing')} />;

        default:
            return <div>Page Not Found</div>;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${state.darkMode ? 'dark' : ''} font-sans`}>
        <BackgroundAnimation darkMode={state.darkMode} />
        
        {/* Layout Wrapper */}
        <div className="relative z-10 flex flex-col min-h-screen">
            
            {/* Header / Sidebar Toggle (Visible only when logged in) */}
            {state.user && state.view !== 'landing' && state.view !== 'practice' && state.view !== 'paperView' && (
                <div className="p-4 flex justify-between items-center sticky top-0 z-40">
                    <button 
                       onClick={() => setIsSidebarOpen(true)}
                       className="p-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl shadow-sm border border-white/20 hover:scale-105 transition-transform"
                    >
                        <LogoIcon size="sm" />
                    </button>
                    {/* Add any top-right actions here if needed */}
                </div>
            )}

            {/* Sidebar */}
            <Sidebar 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={state.user}
                stats={state.stats}
                darkMode={state.darkMode}
                onToggleDarkMode={() => {
                    setState(s => {
                        const newMode = !s.darkMode;
                        if(s.user) saveUserPref(s.user.id, { darkMode: newMode });
                        return { ...s, darkMode: newMode };
                    });
                }}
                showTimer={state.showTimer}
                onToggleTimer={() => setState(s => ({...s, showTimer: !s.showTimer}))}
                language={state.language}
                onToggleLanguage={() => {
                    setState(s => {
                        const newLang = s.language === 'en' ? 'hi' : 'en';
                        if(s.user) saveUserPref(s.user.id, { language: newLang });
                        return { ...s, language: newLang };
                    });
                }}
                currentTheme={state.theme}
                onThemeChange={(t) => {
                    setState(s => ({ ...s, theme: t }));
                    localStorage.setItem('pyqverse_theme', t);
                }}
                onNavigate={navigate}
                onLogout={handleLogout}
                onEnableNotifications={() => {
                    if ('Notification' in window) Notification.requestPermission();
                }}
                onInstallApp={deferredPrompt ? handlePWAInstall : undefined}
            />

            {/* Main Content */}
            <main className={`flex-1 ${state.view !== 'landing' && state.view !== 'login' && state.view !== 'signup' ? 'px-4 sm:px-6' : ''}`}>
                {renderView()}
            </main>

            {/* Bottom Nav (Mobile Only) */}
            {state.user && state.view !== 'practice' && state.view !== 'paperView' && (
                <MobileBottomNav 
                    currentView={state.view}
                    onNavigate={navigate}
                    onAction={(action) => {
                        if (action === 'practice') setShowPracticeConfig(true);
                    }}
                />
            )}

            {/* Config Modal */}
            {showPracticeConfig && state.selectedExam && (
                <PracticeConfigModal 
                    examType={state.selectedExam}
                    onClose={() => setShowPracticeConfig(false)}
                    onStart={(config) => {
                        setPracticeConfig(config);
                        generateQuestions(config);
                    }}
                    onExamChange={(ex) => {
                        setState(s => ({ ...s, selectedExam: ex }));
                        if(state.user) saveUserPref(state.user.id, { selectedExam: ex });
                    }}
                    isPro={state.user?.isPro}
                    isAdmin={state.user?.isAdmin}
                    onUpgrade={() => alert("Pro Plan Coming Soon!")}
                />
            )}

            {/* PWA Banner */}
            {showInstallBanner && (
                <PWAInstallBanner 
                    onInstall={handlePWAInstall}
                    onDismiss={handlePWADismiss}
                />
            )}
        </div>
    </div>
  );
};
