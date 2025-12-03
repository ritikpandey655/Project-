
import React, { useState, useEffect } from 'react';
import { ExamType, Question, QuestionType } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { Button } from './Button';
import { generatePYQList } from '../services/geminiService';

interface PYQLibraryProps {
  examType: ExamType;
  onBack: () => void;
  onBookmarkToggle?: (question: Question) => void;
  language?: 'en' | 'hi';
}

export const PYQLibrary: React.FC<PYQLibraryProps> = ({ examType, onBack, onBookmarkToggle, language = 'en' }) => {
  const [subject, setSubject] = useState(EXAM_SUBJECTS[examType][0]);
  const [year, setYear] = useState(2023);
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

  const handleFetch = async (isLoadMore = false) => {
    if (isLoadMore) setIsFetchingMore(true);
    else setIsLoading(true);
    
    setFetchError(false);
    if (!isLoadMore) {
        setExpandedQ(null);
        setQuestions([]); // Clear previous if new search
    }
    
    try {
      // Pass a random seed to prompt if loading more to ensure variety
      const seed = isLoadMore ? `Batch-${Date.now()}` : undefined;
      const data = await generatePYQList(examType, subject, year, topic);
      
      if (data && data.length > 0) {
        if (isLoadMore) {
            // Append new questions, filtering out duplicates by ID
            setQuestions(prev => {
                const existingIds = new Set(prev.map(q => q.id));
                const uniqueNew = data.filter(q => !existingIds.has(q.id));
                return [...prev, ...uniqueNew];
            });
        } else {
            setQuestions(data);
        }
      } else {
        if (!isLoadMore) setFetchError(true);
      }
    } catch (e) {
      if (!isLoadMore) setFetchError(true);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedQ(prev => prev === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
          <span className="text-xl">⬅️</span> Back
        </button>
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">PYQ Library</h1>
           <p className="text-sm text-slate-500 dark:text-slate-400">Archive of {examType} Questions</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
         <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Subject</label>
               <select 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
               >
                 {EXAM_SUBJECTS[examType].map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Year</label>
               <select 
                  value={year} 
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Topic (Optional)</label>
               <input 
                  type="text" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Optics"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
               />
            </div>
            <Button onClick={() => handleFetch(false)} isLoading={isLoading} className="w-full sm:w-auto">
               {isLoading ? 'Fetching...' : 'Find Questions'}
            </Button>
         </div>
      </div>

      {isLoading ? (
         <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div className="relative w-16 h-16 mb-4">
               {/* Sand Timer SVG */}
               <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-500 animate-spin-slow">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
               </svg>
               <div className="absolute inset-0 flex items-center justify-center text-2xl animate-bounce">⏳</div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Searching Archives...</h3>
            <p className="text-slate-500 text-sm">Retrieving {year} pattern questions for {subject}</p>
         </div>
      ) : fetchError || (questions.length === 0 && !isLoading && topic) ? (
         <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 animate-pop-in">
            <span className="text-4xl opacity-50 block mb-2">😕</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Questions Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm max-w-xs mx-auto">
               We couldn't generate PYQs for this specific criteria. Try removing the "Topic" filter or selecting a different year.
            </p>
            <Button variant="secondary" size="sm" onClick={() => handleFetch(false)}>Try Again</Button>
         </div>
      ) : questions.length === 0 ? (
         <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-4xl opacity-50 block mb-2">📜</span>
            <p className="text-slate-500 dark:text-slate-400">Select filters above to view authentic-style Past Year Questions.</p>
         </div>
      ) : (
         <div className="space-y-4">
            {questions.map((q, idx) => {
               const displayText = (language === 'hi' && q.textHindi) ? q.textHindi : q.text;
               const displayExplanation = (language === 'hi' && q.explanationHindi) ? q.explanationHindi : q.explanation;
               
               return (
                 <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all animate-slide-up" style={{animationDelay: `${(idx % 10) * 50}ms`}}>
                    <div 
                      className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      onClick={() => toggleExpand(q.id)}
                    >
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                             <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{q.pyqYear || year}</span>
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                q.type === QuestionType.MCQ ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                             }`}>
                                {q.type === QuestionType.MCQ ? 'MCQ' : q.type === QuestionType.NUMERICAL ? 'Numerical' : 'Short Ans'}
                             </span>
                          </div>
                          <div className="flex items-center gap-3">
                             {onBookmarkToggle && (
                                <button 
                                   onClick={(e) => { e.stopPropagation(); onBookmarkToggle(q); }}
                                   className="text-slate-400 hover:text-red-500"
                                >
                                   ♡
                                </button>
                             )}
                             <span className={`transform transition-transform ${expandedQ === q.id ? 'rotate-180' : ''} text-slate-400`}>▼</span>
                          </div>
                       </div>
                       <h3 className="font-medium text-slate-800 dark:text-white text-lg">
                          <span className="text-slate-400 mr-2">{idx + 1}.</span> {displayText}
                       </h3>
                    </div>

                    {expandedQ === q.id && (
                       <div className="px-5 pb-5 pt-0 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
                          <div className="mt-4 space-y-2">
                             {q.type === QuestionType.MCQ && Array.isArray(q.options) && q.options.map((opt, i) => (
                                <div key={i} className={`p-3 rounded-lg text-sm border ${
                                   i === q.correctIndex 
                                      ? 'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-800 dark:text-green-100' 
                                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                }`}>
                                   <span className="font-bold mr-2">{String.fromCharCode(65+i)}.</span> {opt}
                                </div>
                             ))}
                             
                             {q.type !== QuestionType.MCQ && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                   <strong className="text-green-700 dark:text-green-400 text-xs uppercase block mb-1">Answer</strong>
                                   <p className="text-slate-800 dark:text-white">{q.answer}</p>
                                </div>
                             )}

                             <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <strong className="text-indigo-600 dark:text-indigo-400 text-xs uppercase block mb-2">💡 Explanation</strong>
                                <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{displayExplanation}</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
               );
            })}
            
            {/* Load More Button */}
            <div className="pt-4 flex justify-center pb-8">
               <Button 
                 onClick={() => handleFetch(true)} 
                 isLoading={isFetchingMore} 
                 variant="secondary"
                 className="shadow-md"
               >
                 {isFetchingMore ? 'Loading...' : 'Load More Questions'}
               </Button>
            </div>
         </div>
      )}
    </div>
  );
};
