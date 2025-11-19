
import React, { useMemo, useState } from 'react';
import { UserStats, ExamType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  stats: UserStats;
  onStartPractice: () => void;
  onUpload: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, onStartPractice, onUpload }) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');

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

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
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
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
      </div>

      {/* Filter Section */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveFilter('All')}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
            activeFilter === 'All' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-medium uppercase">Current Streak</p>
          <p className="text-3xl font-bold text-orange-500 mt-1 flex items-center gap-1">
            {stats.streakCurrent} <span className="text-lg">🔥</span>
          </p>
          {activeFilter !== 'All' && <span className="text-[10px] text-slate-400">(Global)</span>}
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-medium uppercase">Questions Solved</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{displayedStats.attempted}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-medium uppercase">Accuracy</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {displayedStats.attempted > 0 
              ? Math.round((displayedStats.correct / displayedStats.attempted) * 100) 
              : 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs font-medium uppercase">Best Streak</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.streakMax}</p>
          {activeFilter !== 'All' && <span className="text-[10px] text-slate-400">(Global)</span>}
        </div>
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex justify-between">
            <span>Subject Performance (%)</span>
            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {activeFilter}
            </span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
          <p className="text-slate-400 mb-2">No performance data yet for {activeFilter}.</p>
          <button onClick={onStartPractice} className="text-indigo-600 font-semibold text-sm hover:underline">
            Start practicing to see analytics
          </button>
        </div>
      )}
    </div>
  );
};
