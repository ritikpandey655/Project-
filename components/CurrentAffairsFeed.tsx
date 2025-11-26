
import React, { useState } from 'react';
import { NewsItem, ExamType } from '../types';
import { Button } from './Button';
import { MONTHS, NEWS_CATEGORIES, EXAM_SUBJECTS } from '../constants';

interface CurrentAffairsFeedProps {
  news: NewsItem[];
  onBack: () => void;
  onTakeQuiz: () => void;
  language?: 'en' | 'hi';
  onFilterChange?: (filters: { month?: string; year?: number; category?: string; subject?: string }) => Promise<void>;
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

  const handleApplyFilter = async () => {
    if (!onFilterChange) return;
    setIsRefreshing(true);
    try {
      if (mode === 'news') {
        await onFilterChange({ month: selectedMonth, year: selectedYear, category: selectedCategory });
      } else {
        await onFilterChange({ subject: selectedSubject === 'Mixed' ? undefined : selectedSubject });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1">
          <span>←</span> Back
        </button>
        {mode === 'news' && (
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
             <span className="text-xs font-bold uppercase text-red-500 tracking-wider">Live Updates</span>
          </div>
        )}
      </div>

      <div className="text-center mb-6">
        <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">
          {mode === 'news' ? 'Daily Briefing' : 'Short Tricks & Formulas'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {mode === 'news' ? 'Curated Current Affairs for Exam Prep' : 'Key formulas and quick revision notes'}
        </p>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 animate-slide-up">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {mode === 'news' ? (
               <>
                 <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Year</label>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm outline-none focus:border-indigo-500"
                    >
                       <option value={2025}>2025</option>
                       <option value={2024}>2024</option>
                       <option value={2023}>2023</option>
                    </select>
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Month</label>
                    <select 
                       value={selectedMonth}
                       onChange={(e) => setSelectedMonth(e.target.value)}
                       className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm outline-none focus:border-indigo-500"
                    >
                       {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>
                 <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label>
                    <select 
                       value={selectedCategory}
                       onChange={(e) => setSelectedCategory(e.target.value)}
                       className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm outline-none focus:border-indigo-500"
                    >
                       {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
               </>
             ) : (
               // Notes / Formulas Mode Filters
               <div className="col-span-3 md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Subject</label>
                  <select 
                     value={selectedSubject}
                     onChange={(e) => setSelectedSubject(e.target.value)}
                     className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm outline-none focus:border-indigo-500"
                  >
                     <option value="Mixed">All Subjects</option>
                     {examType && EXAM_SUBJECTS[examType]?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
             )}
             
             <div className="col-span-2 md:col-span-1 flex items-end">
                <Button onClick={handleApplyFilter} isLoading={isRefreshing} size="sm" className="w-full">
                   {isRefreshing ? 'Fetching...' : (mode === 'news' ? 'Fetch News' : 'Get Formulas')}
                </Button>
             </div>
         </div>
      </div>

      {/* Loading State: Sand Timer */}
      {isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
           <div className="relative w-16 h-16 mb-4">
              {/* Sand Timer SVG Animation */}
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-500 animate-spin-slow">
                 <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-2xl animate-bounce">⏳</div>
           </div>
           <h3 className="text-lg font-bold text-slate-800 dark:text-white">Curating Content...</h3>
           <p className="text-slate-500 text-sm">Wait a moment</p>
        </div>
      ) : (
        <div className="space-y-6">
          {news.length === 0 ? (
             <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <span className="text-4xl opacity-50 block mb-2">📂</span>
                <p className="text-slate-500 dark:text-slate-400">No content found.</p>
             </div>
          ) : (
            news.map((item, index) => {
              const headline = (language === 'hi' && item.headlineHindi) ? item.headlineHindi : item.headline;
              const summary = (language === 'hi' && item.summaryHindi) ? item.summaryHindi : item.summary;

              return (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${mode === 'news' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'}`}>
                        {item.category}
                      </span>
                      {mode === 'news' && (
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           </svg>
                           <span className="text-xs font-bold">{item.date || `${selectedMonth} ${selectedYear}`}</span>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 leading-snug">
                      {headline}
                    </h3>
                    
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                      {summary}
                    </p>

                    {item.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!isRefreshing && mode === 'news' && news.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex justify-center z-20">
           <Button onClick={onTakeQuiz} size="lg" className="shadow-xl shadow-indigo-500/30">
              Take Quiz on {selectedMonth} News
           </Button>
        </div>
      )}
    </div>
  );
};
