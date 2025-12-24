
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
        setQuestions([]); 
    }
    
    try {
      const data = await generatePYQList(examType, subject, year, topic);
      
      if (data && data.length > 0) {
        if (isLoadMore) {
            setQuestions(prev => {
                const existingIds = new Set(prev.map(q => q.id));
                const uniqueNew = data.filter(q => !existingIds.has(q.id));
                return [...prev, ...uniqueNew];
            });
        } else {
            // Artificial delay to show high-quality animation
            await new Promise(r => setTimeout(r, 1200));
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
      
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">📜</div>
           </div>
           <div className="space-y-4 max-w-sm">
              <h3 className="text-3xl font-display font-black text-white leading-tight">Accessing the archives...</h3>
              <p className="text-slate-400 text-sm font-medium tracking-wide">
                 Retrieving {year} PYQs for {subject}. Analyzing exam patterns and difficulty curves.
              </p>
           </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
          <span className="text-xl">⬅️</span> Back
        </button>
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">PYQ Library</h1>
           <p className="text-sm text-slate-500 dark:text-slate-400">Archive of {examType} Questions</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
         <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Subject</label>
               <select 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold outline-none"
               >
                 {EXAM_SUBJECTS[examType].map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Exam Year</label>
               <select 
                  value={year} 
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold outline-none"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Topic (Hint)</label>
               <input 
                  type="text" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Optics, Mughal"
                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-medium outline-none"
               />
            </div>
            <Button onClick={() => handleFetch(false)} className="w-full py-4 !rounded-2xl shadow-lg">
               FIND PYQs
            </Button>
         </div>
      </div>

      {questions.length === 0 && !isLoading ? (
         <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-5xl block mb-4">📜</span>
            <p className="text-slate-500 dark:text-slate-400 font-bold">Select filters to start your revision universe.</p>
         </div>
      ) : (
         <div className="space-y-4">
            {questions.map((q, idx) => {
               const displayText = (language === 'hi' && q.textHindi) ? q.textHindi : q.text;
               const displayExplanation = (language === 'hi' && q.explanationHindi) ? q.explanationHindi : q.explanation;
               
               return (
                 <div key={q.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all animate-slide-up" style={{animationDelay: `${(idx % 10) * 50}ms`}}>
                    <div 
                      className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      onClick={() => toggleExpand(q.id)}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                             <span className="bg-brand-50 text-brand-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">{q.pyqYear || year} PYQ</span>
                             <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">{q.subject}</span>
                          </div>
                          <span className={`transform transition-transform ${expandedQ === q.id ? 'rotate-180' : ''} text-slate-300`}>▼</span>
                       </div>
                       <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-relaxed">
                          <span className="text-slate-300 mr-2">{idx + 1}.</span> {displayText}
                       </h3>
                    </div>

                    {expandedQ === q.id && (
                       <div className="px-6 pb-6 pt-0 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                          <div className="mt-6 space-y-3">
                             {Array.isArray(q.options) && q.options.map((opt, i) => (
                                <div key={i} className={`p-4 rounded-2xl text-sm font-bold border-2 flex items-center gap-4 ${
                                   i === q.correctIndex 
                                      ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                                      : 'bg-white border-slate-100 text-slate-500 dark:bg-slate-800 dark:border-slate-700 opacity-60'
                                }`}>
                                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === q.correctIndex ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                      {String.fromCharCode(65+i)}
                                   </div>
                                   {opt}
                                </div>
                             ))}
                             
                             <div className="mt-6 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <strong className="text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest block mb-2 flex items-center gap-2">
                                   <span className="text-base">💡</span> AI Explanation
                                </strong>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium whitespace-pre-wrap">{displayExplanation}</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
               );
            })}
            
            <div className="pt-8 flex justify-center pb-12">
               <Button 
                 onClick={() => handleFetch(true)} 
                 isLoading={isFetchingMore} 
                 variant="secondary"
                 className="!rounded-2xl px-10 py-4 font-black text-sm tracking-widest uppercase border-slate-200"
               >
                 {isFetchingMore ? 'Loading More...' : 'Load More Questions'}
               </Button>
            </div>
         </div>
      )}
    </div>
  );
};
