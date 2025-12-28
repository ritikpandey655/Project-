import React, { useMemo, useState, useEffect } from 'react';
import { UserStats, ExamType, User, Question, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from './Button';
import { TRANSLATIONS } from '../constants';

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
  onReadNotes: () => void; 
  onEnableNotifications: () => void;
  language?: 'en' | 'hi';
  onToggleLanguage?: () => void;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
  onUpgrade?: () => void;
  qotd?: Question | null;
  onOpenQOTD?: () => void;
  onOpenBookmarks?: () => void;
  onOpenAnalytics?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenPYQLibrary?: () => void;
  isOnline?: boolean;
  selectedExam: ExamType | null;
  onNavigate?: (view: ViewState) => void;
}

export const Dashboard: React.FC<DashboardProps> = React.memo(({ 
  stats, 
  user,
  onStartPractice, 
  onUpload, 
  onGeneratePaper,
  isOnline = true,
  language = 'en',
  selectedExam,
  onOpenAnalytics,
  onOpenLeaderboard,
  onOpenBookmarks,
  onNavigate
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const t = TRANSLATIONS[language];

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

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#5B2EFF';

  return (
    <div className="space-y-6 pb-24">
      
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-black shadow-lg flex items-center justify-between animate-fade-in">
          <span className="uppercase tracking-tighter">📡 Offline Mode</span>
        </div>
      )}

      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div>
           <h2 className="text-3xl font-display font-black text-slate-800 dark:text-white tracking-tight leading-none">
              Namaste, <span className="text-brand-600">{user?.name?.split(' ')[0]}</span>
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Ready to master {selectedExam} today?</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center gap-3">
              <span className="text-xl">🔥</span>
              <div className="text-left">
                 <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{t.streak}</p>
                 <p className="text-sm font-black dark:text-white">{stats.streakCurrent} Days</p>
              </div>
           </div>
           <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <div className="text-left">
                 <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{t.accuracy}</p>
                 <p className="text-sm font-black dark:text-white">{displayedStats.attempted > 0 ? Math.round((displayedStats.correct / displayedStats.attempted) * 100) : 0}%</p>
              </div>
           </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
         <div 
           onClick={onStartPractice}
           className="group bg-gradient-to-br from-brand-600 to-brand-800 p-8 rounded-[32px] text-white shadow-2xl shadow-brand-500/20 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
         >
            <div className="absolute top-[-20%] right-[-10%] text-9xl opacity-10 pointer-events-none transform rotate-12">⚡</div>
            <div className="relative z-10 flex flex-col h-full">
               <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full w-fit mb-4">Practice Mode</span>
               <h3 className="text-3xl font-display font-black leading-tight mb-2">Smart Revision <br/> AI Engine</h3>
               <p className="text-brand-100/70 text-sm max-w-sm mb-8">Unlimited personalized questions based on {selectedExam} patterns.</p>
               <div className="mt-auto">
                  <span className="inline-flex items-center gap-2 bg-white text-brand-700 px-6 py-3 rounded-full font-black text-sm shadow-xl hover:gap-4 transition-all">
                    START SOLVING <span className="text-xl">→</span>
                  </span>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-4">
            <div 
              onClick={onUpload}
              className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-white/10 shadow-sm hover:border-brand-300 dark:hover:border-brand-800 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-6"
            >
               <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">📸</div>
               <div>
                  <h3 className="text-xl font-display font-black text-slate-800 dark:text-white mb-1">{t.doubtSolver}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Scan any question for an instant AI solution.</p>
               </div>
            </div>

            <div 
              onClick={onGeneratePaper}
              className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-white/10 shadow-sm hover:border-orange-300 dark:hover:border-orange-800 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-6"
            >
               <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">📝</div>
               <div>
                  <h3 className="text-xl font-display font-black text-slate-800 dark:text-white mb-1">Mock Test</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Full-length time-bound papers.</p>
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md rounded-[40px] p-8 border border-slate-100 dark:border-white/10 shadow-sm">
         <div className="flex justify-between items-center mb-8">
            <h3 className="font-display font-black text-2xl text-slate-800 dark:text-white">Performance Analytics</h3>
            <button onClick={onOpenAnalytics} className="text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-widest hover:underline">View All</button>
         </div>
         <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                  <Bar dataKey="score" radius={[12, 12, 12, 12]}>
                     {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#10B981' : primaryColor} fillOpacity={0.7} />
                     ))}
                  </Bar>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="pt-12 pb-24 border-t border-slate-200 dark:border-white/5 flex flex-col items-center">
          <p className="text-xs font-bold text-slate-400 tracking-widest mb-4">© 2025 PYQVERSE AI</p>
          <div className="flex gap-8 mb-6">
             <button onClick={onOpenAnalytics} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-500">Analytics</button>
             <button onClick={onOpenLeaderboard} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-500">Leaderboard</button>
             <button onClick={onOpenBookmarks} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-500">Bookmarks</button>
          </div>
          <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             <button onClick={() => onNavigate?.('privacy')} className="hover:text-brand-500 transition-colors uppercase">Privacy Policy</button>
             <span>•</span>
             <a href="mailto:support@pyqverse.in" className="hover:text-brand-500 transition-colors">Support</a>
          </div>
      </div>

    </div>
  );
});