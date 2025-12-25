import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { getBookmarks, toggleBookmark } from '../services/storageService';
import { Button } from './Button';

interface BookmarksListProps {
  userId: string;
  onBack: () => void;
}

export const BookmarksList: React.FC<BookmarksListProps> = ({ userId, onBack }) => {
  const [bookmarks, setBookmarks] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const data = await getBookmarks(userId);
      setBookmarks(data);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleRemove = async (q: Question) => {
    await toggleBookmark(userId, q);
    setBookmarks(prev => prev.filter(b => b.id !== q.id));
  };

  const toggleReveal = (id: string) => {
    const newSet = new Set(revealedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setRevealedIds(newSet);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors">
          <span className="text-xl">⬅️</span> Back
        </button>
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Bookmarks</h1>
           <p className="text-sm text-slate-500 dark:text-slate-400">Your saved revision questions</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
           <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           <p className="text-slate-500">Loading your vault...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
           <span className="text-5xl block mb-4">🔖</span>
           <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-2">No Bookmarks Yet</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto mb-6">
             Tap the bookmark icon during practice to save tricky questions here.
           </p>
           <Button onClick={onBack}>Go Practice</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((q, idx) => {
             const isRevealed = revealedIds.has(q.id);
             return (
               <div key={q.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded">
                        {q.subject || 'General'}
                     </span>
                     <button 
                       onClick={() => handleRemove(q)}
                       className="text-red-400 hover:text-red-600 p-1"
                       title="Remove Bookmark"
                     >
                       ✕
                     </button>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4 leading-relaxed">
                     {q.text}
                  </h3>

                  {isRevealed ? (
                     <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-xl border border-brand-100 dark:border-brand-900/30 animate-fade-in">
                        <p className="text-sm font-bold text-brand-700 dark:text-brand-300 mb-2">
                           Correct Answer: {q.options[q.correctIndex]}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                           {q.explanation}
                        </p>
                     </div>
                  ) : (
                     <button 
                       onClick={() => toggleReveal(q.id)}
                       className="w-full py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-xs font-bold text-slate-500 uppercase tracking-widest hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700 transition-colors"
                     >
                       Reveal Answer
                     </button>
                  )}
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
};