
import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, User } from '../types';
import { getLeaderboardData } from '../services/storageService';

interface LeaderboardProps {
  user: User;
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ user, onBack }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<'Global' | 'Friends'>('Global');

  useEffect(() => {
    // Simulate fetching
    const data = getLeaderboardData(user);
    setEntries(data);
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 animate-slide-up pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">🏆 Leaderboard</h2>
      </div>

      {/* Toggle */}
      <div className="flex bg-slate-200 dark:bg-slate-700 rounded-xl p-1 mb-6 max-w-xs">
        <button 
          onClick={() => setFilter('Global')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'Global' ? 'bg-white dark:bg-slate-800 shadow text-brand-purple' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Global
        </button>
        <button 
          onClick={() => setFilter('Friends')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'Friends' ? 'bg-white dark:bg-slate-800 shadow text-brand-purple' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Friends
        </button>
      </div>

      {/* Top 3 Podium */}
      {filter === 'Global' && entries.length > 2 && (
        <div className="flex justify-center items-end gap-4 mb-8">
           {/* 2nd Place */}
           <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-4 border-slate-300 overflow-hidden mb-2 relative">
                <img src={`https://api.dicebear.com/9.x/avataaars/png?seed=${entries[1].name}`} className="w-full h-full" alt="Rank 2" />
                <div className="absolute bottom-0 inset-x-0 bg-slate-300 text-slate-800 text-[10px] font-bold text-center">#2</div>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{entries[1].name}</p>
              <p className="text-xs text-brand-purple font-bold">{entries[1].score} XP</p>
              <div className="w-16 h-24 bg-slate-300/30 rounded-t-xl mt-2"></div>
           </div>

           {/* 1st Place */}
           <div className="flex flex-col items-center">
              <div className="text-2xl mb-1">👑</div>
              <div className="w-20 h-20 rounded-full border-4 border-yellow-400 overflow-hidden mb-2 relative shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                <img src={`https://api.dicebear.com/9.x/avataaars/png?seed=${entries[0].name}`} className="w-full h-full" alt="Rank 1" />
                <div className="absolute bottom-0 inset-x-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold text-center">#1</div>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{entries[0].name}</p>
              <p className="text-sm text-brand-purple font-bold">{entries[0].score} XP</p>
              <div className="w-20 h-32 bg-yellow-400/20 rounded-t-xl mt-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/40 to-transparent"></div>
              </div>
           </div>

           {/* 3rd Place */}
           <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-4 border-orange-300 overflow-hidden mb-2 relative">
                <img src={`https://api.dicebear.com/9.x/avataaars/png?seed=${entries[2].name}`} className="w-full h-full" alt="Rank 3" />
                <div className="absolute bottom-0 inset-x-0 bg-orange-300 text-orange-900 text-[10px] font-bold text-center">#3</div>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{entries[2].name}</p>
              <p className="text-xs text-brand-purple font-bold">{entries[2].score} XP</p>
              <div className="w-16 h-20 bg-orange-300/30 rounded-t-xl mt-2"></div>
           </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {entries.slice(3).map((entry) => (
          <div 
            key={entry.id} 
            className={`flex items-center gap-4 p-4 rounded-xl border ${
              entry.isCurrentUser 
                ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' 
                : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
             <span className={`w-8 font-bold text-center ${entry.rank <= 3 ? 'text-brand-yellow text-xl' : 'text-slate-500'}`}>
                {entry.rank}
             </span>
             <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                <img src={`https://api.dicebear.com/9.x/avataaars/png?seed=${entry.name}`} alt="Avatar" />
             </div>
             <div className="flex-1">
                <h4 className={`font-bold ${entry.isCurrentUser ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>
                   {entry.name} {entry.isCurrentUser && '(You)'}
                </h4>
                <p className="text-xs text-slate-500">{entry.exam}</p>
             </div>
             <div className="text-right">
                <p className="font-mono font-bold text-brand-purple">{entry.score}</p>
                <p className="text-[10px] text-slate-400 uppercase">XP</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
