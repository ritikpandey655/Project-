
import React, { useMemo, useState } from 'react';
import { UserStats, ExamType, User, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TRANSLATIONS, THEME_PALETTES } from '../constants';

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
  onOpenPYQLibrary,
  isOnline = true,
  language = 'en',
  selectedExam,
  onOpenAnalytics,
  onOpenLeaderboard,
  onOpenBookmarks,
  onNavigate,
  currentTheme = 'PYQverse Prime'
}) => {
  const t = TRANSLATIONS[language];

  // Get active theme color for charts
  const activeThemeColor = useMemo(() => {
    return THEME_PALETTES[currentTheme]?.[500] || '#5B2EFF';
  }, [currentTheme]);

  const chartData = useMemo(() => {
    return Object.keys(stats.subjectPerformance).map(subject => ({
      name: subject.length > 10 ? subject.substring(0, 10) + '...' : subject,
      score: stats.subjectPerformance[subject].total > 0 
        ? Math.round((stats.subjectPerformance[subject].correct / stats.subjectPerformance[subject].total) * 100)
        : 0
    })).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [stats]);

  const accuracy = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;

  return (
    <div className="space-y-8 pb-32 animate-fade-in">
      
      {!isOnline && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-6 py-3 rounded-2xl text-xs font-black shadow-lg flex items-center justify-between animate-pulse">
          <span className="uppercase tracking-widest">📡 Offline Mode Active</span>
          <span className="text-[10px]">Archives available</span>
        </div>
      )}

      {/* Hero Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6">
        <div>
           <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2">
              Welcome, <span className="text-brand-500">{user?.name?.split(' ')[0]}</span>
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest">Target: {selectedExam || 'Set Your Exam'}</p>
        </div>
        <div className="flex gap-3">
           <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md px-5 py-3 rounded-[24px] border border-slate-200 dark:border-white/5 shadow-xl flex items-center gap-4 group hover:border-brand-500/50 transition-all">
              <span className="text-2xl animate-bounce">🔥</span>
              <div className="text-left">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Streak</p>
                 <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{stats.streakCurrent} Days</p>
              </div>
           </div>
           <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md px-5 py-3 rounded-[24px] border border-slate-200 dark:border-white/5 shadow-xl flex items-center gap-4 group hover:border-brand-500/50 transition-all">
              <span className="text-2xl">🎯</span>
              <div className="text-left">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Accuracy</p>
                 <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{accuracy}%</p>
              </div>
           </div>
        </div>
      </div>

      {/* Main Feature Command Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* AI Practice Tile */}
         <div 
           onClick={onStartPractice}
           className="group bg-gradient-to-br from-brand-600 to-brand-800 p-10 rounded-[40px] text-white shadow-2xl shadow-brand-500/20 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-brand-500/40"
         >
            <div className="absolute top-[-10%] right-[-10%] text-[180px] opacity-10 pointer-events-none transform rotate-12 font-black">AI</div>
            <div className="relative z-10 flex flex-col h-full min-h-[220px]">
               <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full w-fit mb-6 border border-white/20">Recommended</span>
               <h3 className="text-4xl font-display font-black leading-tight mb-4 tracking-tighter">AI Practice<br/>Universe</h3>
               <p className="text-brand-100/70 text-sm max-w-sm mb-8 font-medium">Generate unlimited questions based on {selectedExam} 2024-25 patterns.</p>
               <div className="mt-auto">
                  <span className="inline-flex items-center gap-3 bg-white text-brand-700 px-8 py-4 rounded-full font-black text-sm shadow-2xl hover:gap-6 transition-all">
                    LAUNCH SESSION <span className="text-xl">🚀</span>
                  </span>
               </div>
            </div>
         </div>

         {/* Doubt Solver & Mock Test Tile */}
         <div className="grid grid-cols-1 gap-6">
            <div 
              onClick={onUpload}
              className="bg-white dark:bg-slate-900/40 backdrop-blur-md p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-2xl hover:border-brand-500/50 cursor-pointer active:scale-[0.98] transition-all flex items-center gap-8 group"
            >
               <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/30 rounded-[28px] flex items-center justify-center text-4xl flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform">💡</div>
               <div>
                  <h3 className="text-2xl font-display font-black text-slate-800 dark:text-white mb-2 tracking-tight">AI Doubt Solver</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Type any question or topic for instant expert solution.</p>
               </div>
            </div>

            <div 
              onClick={onGeneratePaper}
              className="bg-white dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-xl hover:border-orange-500/50 cursor-pointer active:scale-[0.98] transition-all flex flex-row items-center gap-6"
            >
               <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">📝</div>
               <div>
                 <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Mock Test Generator</h3>
                 <p className="text-xs text-slate-500 font-bold">Full length exams with timer</p>
               </div>
            </div>
         </div>
      </div>

      {/* Analytics Insight */}
      <div className="bg-white dark:bg-[#121026] backdrop-blur-xl rounded-[40px] p-10 border border-slate-200 dark:border-white/5 shadow-2xl">
         <div className="flex justify-between items-center mb-10">
            <div>
               <h3 className="font-display font-black text-2xl text-slate-800 dark:text-white tracking-tight">AI Intelligence Insight</h3>
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Based on last 30 sessions</p>
            </div>
            <button onClick={onOpenAnalytics} className="bg-brand-500/10 text-brand-500 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-500/20 hover:bg-brand-500 hover:text-white transition-all">Detailed Stats</button>
         </div>
         <div className="h-[240px] w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                      <Bar dataKey="score" radius={[16, 16, 16, 16]}>
                         {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#10B981' : activeThemeColor} fillOpacity={0.8} />
                         ))}
                      </Bar>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: '700'}} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', color: '#fff' }} />
                   </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                   <span className="text-4xl mb-4">📊</span>
                   <p className="font-black text-xs uppercase tracking-widest text-slate-500">No analytic data yet. Start practicing!</p>
                </div>
            )}
         </div>
      </div>

      {/* Quick Access Footer */}
      <div className="pt-8 pb-32 border-t border-slate-200 dark:border-white/5 flex flex-col items-center gap-8">
          <div className="flex gap-12">
             <button onClick={onOpenAnalytics} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-500 transition-colors">Analytics</button>
             <button onClick={onOpenLeaderboard} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-500 transition-colors">Leaderboard</button>
             <button onClick={onOpenBookmarks} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-500 transition-colors">Bookmarks</button>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-6 py-2 rounded-full">
             <button onClick={() => onNavigate?.('privacy')} className="hover:text-brand-500 transition-colors">Privacy</button>
             <span className="opacity-20">•</span>
             <a href="mailto:support@pyqverse.in" className="hover:text-brand-500 transition-colors">Support</a>
             <span className="opacity-20">•</span>
             <span className="text-slate-400">v5.1.0 BETA</span>
          </div>
      </div>

    </div>
  );
});
