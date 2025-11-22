
import React, { useMemo, useState } from 'react';
import { UserStats, ExamType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from './Button';

interface DashboardProps {
  stats: UserStats;
  showTimer: boolean;
  darkMode: boolean;
  onStartPractice: () => void;
  onUpload: () => void;
  onToggleTimer: () => void;
  onToggleDarkMode: () => void;
  onGeneratePaper: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  stats, 
  showTimer, 
  darkMode,
  onStartPractice, 
  onUpload, 
  onToggleTimer, 
  onToggleDarkMode,
  onGeneratePaper 
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

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
    // Simulate sending
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackText('');
      setFeedbackSent(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Ready to revise?</h2>
          <p className="text-indigo-100 mb-6 max-w-md">
            Keep your streak alive! Combine AI-generated PYQs with your personal notes for the ultimate revision session.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={onStartPractice}
              className="bg-white text-indigo-700 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-colors"
            >
              Start Practice
            </button>
            <button 
              onClick={onUpload}
              className="bg-indigo-500/40 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-500/60 transition-colors"
            >
              Add Question
            </button>
            <button 
              onClick={onGeneratePaper}
              className="bg-purple-500/40 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-500/60 transition-colors flex items-center gap-2"
            >
              <span>📄</span> Generate Mock Paper
            </button>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
      </div>

      {/* Filter Section */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar touch-pan-x">
        <button
          onClick={() => setActiveFilter('All')}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
            activeFilter === 'All' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          All
        </button>
        {Object.values(ExamType).map(type => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
              activeFilter === type 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase">Current Streak</p>
          <p className="text-3xl font-bold text-orange-500 mt-1 flex items-center gap-1">
            {stats.streakCurrent} <span className="text-lg">🔥</span>
          </p>
          {activeFilter !== 'All' && <span className="text-[10px] text-slate-400">(Global)</span>}
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase">Questions Solved</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{displayedStats.attempted}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase">Accuracy</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
            {displayedStats.attempted > 0 
              ? Math.round((displayedStats.correct / displayedStats.attempted) * 100) 
              : 0}%
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase">Best Streak</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.streakMax}</p>
          {activeFilter !== 'All' && <span className="text-[10px] text-slate-400">(Global)</span>}
        </div>
      </div>

      {/* Charts & Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="md:col-span-2">
          {chartData.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full min-h-[300px] transition-colors">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex justify-between">
                <span>Subject Performance (%)</span>
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {activeFilter}
                </span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{fontSize: 12, fill: darkMode ? '#cbd5e1' : '#334155'}} 
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
                          color: darkMode ? '#fff' : '#000'
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#4ade80' : entry.score > 40 ? '#818cf8' : '#f87171'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center h-full flex flex-col justify-center min-h-[300px] transition-colors">
              <p className="text-slate-400 dark:text-slate-500 mb-2">No performance data yet for {activeFilter}.</p>
              <button onClick={onStartPractice} className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:underline">
                Start practicing to see analytics
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="md:col-span-1 space-y-6">
           {/* Settings */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Settings</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 transition-colors">
                    <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Practice Timer</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Show elapsed time during practice</p>
                    </div>
                    <button 
                    onClick={onToggleTimer}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showTimer ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                    >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showTimer ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 transition-colors">
                    <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Dark Mode</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Switch to dark theme</p>
                    </div>
                    <button 
                    onClick={onToggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                    >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
              </div>
           </div>

           {/* Feedback */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Feedback & Support</h3>
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
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                 />
                 <Button 
                   onClick={handleSendFeedback} 
                   disabled={!feedbackText.trim()} 
                   variant="secondary" 
                   size="sm" 
                   className="w-full"
                 >
                   Send Feedback
                 </Button>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};