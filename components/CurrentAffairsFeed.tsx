
import React, { useState } from 'react';
import { NewsItem, ExamType } from '../types';
import { Button } from './Button';
import { MONTHS, NEWS_CATEGORIES, EXAM_SUBJECTS } from '../constants';

interface CurrentAffairsFeedProps {
  news: NewsItem[];
  onBack: () => void;
  onTakeQuiz: () => void;
  language?: 'en' | 'hi';
  onFilterChange?: (filters: { month?: string; year?: number; category?: string; subject?: string }, isLoadMore?: boolean) => Promise<void>;
  mode?: 'news' | 'notes';
  examType?: ExamType;
}

export const CurrentAffairsFeed: React.FC<CurrentAffairsFeedProps> = ({ 
  news, 
  onBack, 
  onTakeQuiz, 
  language = 'en',
  onFilterChange,
  mode = 'news',
  examType
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mixed');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleApplyFilter = async () => {
    if (!onFilterChange) return;
    setIsRefreshing(true);
    try {
      if (mode === 'news') {
        await onFilterChange({ month: selectedMonth, year: selectedYear, category: selectedCategory });
      } else {
        await onFilterChange({ subject: selectedSubject === 'Mixed' ? undefined : selectedSubject });
      }
      await new Promise(r => setTimeout(r, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!onFilterChange) return;
    setIsLoadingMore(true);
    try {
        if (mode === 'news') {
          await onFilterChange({ month: selectedMonth, year: selectedYear, category: selectedCategory }, true);
        } else {
          await onFilterChange({ subject: selectedSubject === 'Mixed' ? undefined : selectedSubject }, true);
        }
    } finally {
        setIsLoadingMore(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in pb-20">
      
      {isRefreshing && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">📡</div>
           </div>
           <div className="space-y-4 max-w-sm">
              <h3 className="text-3xl font-display font-black text-white leading-tight">Syncing Universe...</h3>
              <p className="text-slate-400 text-sm font-medium tracking-wide">
                 Fetching latest {mode === 'news' ? 'affairs' : 'revision notes'} from the global patterns.
              </p>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-10">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-purple transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
           <span className="text-[10px] font-black uppercase text-brand-500 tracking-widest">LIVE SYNC</span>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">
          {mode === 'news' ? 'Daily Briefing' : 'Short Tricks'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Curated content powered by AI patterns for {examType}.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-8 animate-slide-up">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
             {mode === 'news' ? (
               <>
                 <div className="col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Year</label>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm font-bold">
                       <option value={2025}>2025</option>
                       <option value={2024}>2024</option>
                    </select>
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Month</label>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm font-bold">
                       {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>
                 <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Topic</label>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm font-bold">
                       {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
               </>
             ) : (
               <div className="col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Subject</label>
                  <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm font-bold">
                     <option value="Mixed">All Subjects</option>
                     {examType && EXAM_SUBJECTS[examType]?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
             )}
             <Button onClick={handleApplyFilter} isLoading={isRefreshing} className="!rounded-2xl py-4 shadow-lg">FETCH</Button>
         </div>
      </div>

      <div className="space-y-6">
        {news.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
               <span className="text-5xl block mb-4">📂</span>
               <p className="text-slate-500 dark:text-slate-400 font-bold">No updates found for this selection.</p>
            </div>
        ) : (
          <>
              {news.map((item, index) => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                            {item.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 leading-tight">{item.headline}</h3>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{item.summary}</p>
                  </div>
                  </div>
              ))}
              <div className="flex justify-center pt-8 pb-12">
                  <Button onClick={handleLoadMore} isLoading={isLoadingMore} variant="secondary" className="!rounded-2xl px-10 border-slate-200">
                      {isLoadingMore ? 'LOADING...' : 'LOAD MORE'}
                  </Button>
              </div>
          </>
        )}
      </div>

      {news.length > 0 && mode === 'news' && (
        <div className="fixed bottom-8 left-0 right-0 px-4 z-20">
           <Button onClick={onTakeQuiz} size="lg" className="w-full max-w-sm mx-auto flex shadow-2xl !rounded-full py-5 font-black text-xl">
              PRACTICE THIS MONTH →
           </Button>
        </div>
      )}
    </div>
  );
};
