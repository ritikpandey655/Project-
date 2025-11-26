
import React, { useMemo, useState } from 'react';
import { UserStats, ExamType, User, Question } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from './Button';
import { TRANSLATIONS, TECHNICAL_EXAMS } from '../constants';

interface DashboardProps {
  stats: UserStats;
  showTimer: boolean;
  darkMode: boolean;
  user?: User | null; 
  onStartPractice: () => void;
  onUpload: () => void;
  onToggleTimer: () => void;
  onToggleDarkMode: () => void;
  onGeneratePaper: () => void;
  onStartCurrentAffairs: () => void;
  onReadCurrentAffairs: () => void;
  onReadNotes: () => void; // New prop for Formulas
  onEnableNotifications: () => void;
  language?: 'en' | 'hi';
  onToggleLanguage?: () => void;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
  onUpgrade?: () => void;
  onInstall?: () => void;
  canInstall?: boolean;
  qotd?: Question | null;
  onOpenQOTD?: () => void;
  onOpenBookmarks?: () => void;
  onOpenAnalytics?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenPYQLibrary?: () => void;
  isOnline?: boolean;
  selectedExam: ExamType | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  stats, 
  user,
  onStartPractice, 
  onUpload, 
  onGeneratePaper,
  onStartCurrentAffairs,
  onReadCurrentAffairs,
  onReadNotes,
  darkMode,
  onUpgrade,
  qotd,
  onOpenQOTD,
  onOpenBookmarks,
  onOpenAnalytics,
  onOpenLeaderboard,
  onOpenPYQLibrary,
  onInstall,
  canInstall,
  isOnline = true,
  language = 'en',
  selectedExam
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showCAMenu, setShowCAMenu] = useState(false);

  const t = TRANSLATIONS[language];
  const isTechnical = selectedExam && TECHNICAL_EXAMS.includes(selectedExam);

  const displayedStats = useMemo(() => {
    if (activeFilter === 'All') {
      return {
        attempted: stats.totalAttempted,
        correct: stats.totalCorrect,
        subjects: stats.subjectPerformance
      };
    }
    
    const examStats = stats.examPerformance?.[activeFilter];
    return {
      attempted: examStats?.totalAttempted || 0,
      correct: examStats?.totalCorrect || 0,
      subjects: examStats?.subjectPerformance || {}
    };
  }, [stats, activeFilter]);
  
  const chartData = useMemo(() => {
    return Object.keys(displayedStats.subjects).map(subject => ({
      name: subject.length > 10 ? subject.substring(0, 10) + '...' : subject,
      fullSubject: subject,
      score: displayedStats.subjects[subject].total > 0 
        ? Math.round((displayedStats.subjects[subject].correct / displayedStats.subjects[subject].total) * 100)
        : 0
    })).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [displayedStats]);

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackText('');
      setFeedbackSent(false);
    }, 3000);
  };

  const isPro = user?.isPro;

  const handleLockedClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    if (isPro) {
      action();
    } else {
      if(onUpgrade) onUpgrade();
    }
  };

  const toggleCAMenu = (e: React.MouseEvent) => {
    if (!isPro) {
       if(onUpgrade) onUpgrade();
       return;
    }
    if (isTechnical) {
       onReadNotes(); // Direct action for Formulas
    } else {
       setShowCAMenu(!showCAMenu);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span>You are offline</span>
          </div>
          <span className="text-xs bg-black/10 px-2 py-1 rounded">Mock mode active</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-brand-purple to-brand-blue rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-brand-purple/20 dark:shadow-none relative overflow-hidden animate-fade-in">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold leading-tight">PYQverse</h2>
              <p className="text-[10px] sm:text-xs text-brand-yellow font-bold uppercase tracking-wide mt-1">{t.tagline}</p>
            </div>
            {isPro ? (
              <span className="bg-brand-yellow text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse-glow self-start">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Pro Member
              </span>
            ) : (
               <button onClick={onUpgrade} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-colors border border-white/30 self-start animate-pulse">
                 Upgrade Plan
               </button>
            )}
          </div>
          <p className="text-indigo-100 mb-6 max-w-md text-sm leading-relaxed">
            {t.desc}
          </p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <button 
              onClick={onStartPractice}
              className="col-span-2 sm:flex-none bg-white text-brand-purple px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold font-display shadow-lg hover:bg-indigo-50 transition-colors active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
            >
              <span>{isOnline ? '⚡' : '📥'}</span> {isOnline ? t.start : t.offlineMode}
            </button>
            <button 
              onClick={onUpload}
              className="col-span-1 sm:flex-none bg-brand-purple/40 backdrop-blur-sm border border-white/20 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-brand-purple/60 transition-colors active:scale-95 text-sm sm:text-base whitespace-nowrap"
            >
              {t.doubtSolver}
            </button>
            <button 
              onClick={(e) => handleLockedClick(e, onGeneratePaper)}
              className={`col-span-1 sm:flex-none backdrop-blur-sm border border-white/20 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 active:scale-95 text-sm sm:text-base whitespace-nowrap ${isPro ? 'bg-brand-blue/40 hover:bg-brand-blue/60' : 'bg-slate-800/40 hover:bg-slate-800/60'}`}
            >
              {isPro ? (
                 <><span>📄</span> {t.mock}</>
              ) : (
                 <><span>🔒</span> {t.mock}</>
              )}
            </button>
            
            {/* Current Affairs / Notes Toggle */}
            <div className="relative col-span-2 sm:flex-none">
              {showCAMenu && !isTechnical && (
                 <div className="absolute bottom-full left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl mb-2 p-2 flex flex-col gap-1 z-20 animate-slide-up">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowCAMenu(false); onReadCurrentAffairs(); }}
                      className="text-left px-3 py-2 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                       📖 Read Daily News
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowCAMenu(false); onStartCurrentAffairs(); }}
                      className="text-left px-3 py-2 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                       📝 Take Daily Quiz
                    </button>
                 </div>
              )}
              <button 
                onClick={toggleCAMenu}
                className={`w-full backdrop-blur-sm border border-white/20 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 active:scale-95 text-sm sm:text-base whitespace-nowrap ${isPro ? 'bg-brand-green/40 hover:bg-brand-green/60' : 'bg-slate-800/40 hover:bg-slate-800/60'}`}
              >
                {isPro ? (
                  <><span>{isTechnical ? '🧪' : '🌍'}</span> {isTechnical ? t.shortTricks : t.currentAffairs}</>
                ) : (
                  <><span>🔒</span> {isTechnical ? t.shortTricks : t.currentAffairs}</>
                )}
              </button>
            </div>
            
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-brand-blue/30 rounded-full blur-2xl animate-float"></div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Question of the Day Card */}
          <div onClick={onOpenQOTD} className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group">
              <div className="relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">{t.dailyChallenge}</span>
                  <h3 className="text-lg sm:text-xl font-display font-bold mt-2">{t.qotd}</h3>
                  <p className="text-indigo-100 text-xs mt-1 line-clamp-2 opacity-90">
                     {qotd ? (language === 'hi' && qotd.textHindi ? qotd.textHindi : qotd.text) : "Tap to reveal today's challenge!"}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-white group-hover:gap-2 transition-all">
                     Solve Now <span>→</span>
                  </div>
              </div>
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-20">📅</div>
          </div>

          {/* Bookmarks Card */}
          <div onClick={onOpenBookmarks} className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] flex flex-col justify-between">
              <div>
                  <div className="flex justify-between items-start">
                     <span className="text-3xl">❤️</span>
                     <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded-md">SAVED</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-2">{t.bookmarks}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.reviewSaved}</p>
              </div>
          </div>

          {/* PYQ Library Card */}
          <div onClick={onOpenPYQLibrary} className="col-span-2 bg-gradient-to-r from-teal-500 to-teal-700 rounded-2xl p-4 sm:p-5 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group flex items-center justify-between">
                <div className="relative z-10">
                    <h3 className="text-lg font-bold font-display flex items-center gap-2">
                      <span>🏛️</span> PYQ Library
                    </h3>
                    <p className="text-teal-100 text-xs sm:text-sm mt-1">Browse Past Year Questions by Year & Subject</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl font-bold text-sm group-hover:bg-white/30 transition-colors">
                    Explore
                </div>
          </div>

          {/* Install App Card */}
          {canInstall && (
            <div onClick={onInstall} className="col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-indigo-900 dark:to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group flex items-center justify-between">
                <div className="relative z-10">
                    <h3 className="text-lg font-bold font-display flex items-center gap-2">
                      <span>📲</span> {t.install}
                    </h3>
                    <p className="text-indigo-100 text-xs sm:text-sm mt-1">Get the full experience with offline mode.</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl font-bold text-sm group-hover:bg-white/30 transition-colors">
                    Install
                </div>
            </div>
          )}
      </div>

      {/* Analytics & Leaderboard Buttons */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button 
             onClick={onOpenAnalytics}
             className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-all"
          >
             <div className="text-left">
                <span className="text-xl">📊</span>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-1">{t.analytics}</h3>
             </div>
             <span className="text-slate-400">→</span>
          </button>
          
          <button 
             onClick={onOpenLeaderboard}
             className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-all"
          >
             <div className="text-left">
                <span className="text-xl">🏆</span>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm mt-1">{t.leaderboard}</h3>
             </div>
             <span className="text-slate-400">→</span>
          </button>
      </div>

      {/* Filter Section (Only show specific exam for strict mode) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold bg-brand-purple text-white shadow-md`}
        >
          {selectedExam || 'All'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors hover:shadow-md animate-slide-up" style={{animationDelay: '0ms'}}>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium uppercase">{t.streak}</p>
          <p className="text-2xl sm:text-3xl font-bold font-display text-brand-yellow mt-1 flex items-center gap-1">
            {stats.streakCurrent} <span className="text-base sm:text-lg animate-bounce-slight">🔥</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors hover:shadow-md animate-slide-up" style={{animationDelay: '100ms'}}>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium uppercase">{t.solved}</p>
          <p className="text-2xl sm:text-3xl font-bold font-display text-slate-800 dark:text-white mt-1">{displayedStats.attempted}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors hover:shadow-md animate-slide-up" style={{animationDelay: '200ms'}}>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium uppercase">{t.accuracy}</p>
          <p className="text-2xl sm:text-3xl font-bold font-display text-brand-green mt-1">
            {displayedStats.attempted > 0 
              ? Math.round((displayedStats.correct / displayedStats.attempted) * 100) 
              : 0}%
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors hover:shadow-md animate-slide-up" style={{animationDelay: '300ms'}}>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium uppercase">{t.bestStreak}</p>
          <p className="text-2xl sm:text-3xl font-bold font-display text-brand-purple mt-1">{stats.streakMax}</p>
        </div>
      </div>

      {/* Charts & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-6">
           {chartData.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-[300px] sm:h-[350px] transition-colors animate-fade-in">
              <h3 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white mb-4 sm:mb-6 flex justify-between">
                <span>Subject Performance (%)</span>
              </h3>
              <div className="h-[200px] sm:h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{fontSize: 11, fill: darkMode ? '#cbd5e1' : '#334155'}} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          backgroundColor: darkMode ? '#1e293b' : '#fff',
                          color: darkMode ? '#fff' : '#000',
                          fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#10B981' : entry.score > 40 ? '#5B2EFF' : '#F87171'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center h-[300px] sm:h-[350px] flex flex-col justify-center transition-colors animate-fade-in">
              <p className="text-slate-400 dark:text-slate-500 mb-2">No performance data yet.</p>
              <button onClick={onStartPractice} className="text-brand-purple dark:text-brand-purple/80 font-semibold text-sm hover:underline">
                Start practicing to see analytics
              </button>
            </div>
          )}
        </div>

        {/* Feedback Column */}
        <div className="lg:col-span-1 space-y-6">
           {/* Feedback */}
           <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors animate-slide-up" style={{animationDelay: '500ms'}}>
             <h3 className="text-lg font-bold font-display text-slate-800 dark:text-white mb-2">{t.feedback}</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Found a bug or have a feature request? Let us know!</p>
             
             {feedbackSent ? (
               <div className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-xl border border-green-100 dark:border-green-800 text-center animate-fade-in">
                 <span className="text-2xl block mb-1">🎉</span>
                 <p className="font-medium">Thank you!</p>
                 <p className="text-xs opacity-80">Your feedback has been sent.</p>
               </div>
             ) : (
               <div className="space-y-3">
                 <textarea 
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm focus:ring-2 focus:ring-brand-purple focus:border-brand-purple outline-none resize-none h-24 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                 />
                 <Button 
                   onClick={handleSendFeedback} 
                   disabled={!feedbackText.trim()} 
                   variant="secondary" 
                   size="sm" 
                   className="w-full"
                 >
                   {t.sendFeedback}
                 </Button>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
