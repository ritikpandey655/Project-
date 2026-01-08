
import React, { useState, useEffect } from 'react';
import { ExamType, QuestionSource, Question } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { Button } from './Button';
import { saveUserQuestion } from '../services/storageService';
import { solveTextQuestion } from '../services/geminiService';

interface UploadFormProps {
  userId: string;
  examType: ExamType;
  onSuccess: () => void;
  initialQuery?: string;
}

export const UploadForm: React.FC<UploadFormProps> = ({ userId, examType, onSuccess, initialQuery }) => {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [subject, setSubject] = useState(EXAM_SUBJECTS[examType][0]);
  const [tags, setTags] = useState('');
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSolution, setShowSolution] = useState(false); 
  
  // Automatically solve initial query if passed
  useEffect(() => {
    if (initialQuery) {
        setQuery(initialQuery);
        handleSolveQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  const handleSolveQuery = async (qText?: string) => {
    const queryToSolve = qText || query;
    if (!queryToSolve.trim()) {
      alert("Please enter a Question or Topic first!");
      return;
    }
    setIsGenerating(true);
    setShowSolution(false);
    try {
      const aiResult = await solveTextQuestion(queryToSolve, examType, subject);
      if (aiResult) {
        await new Promise(r => setTimeout(r, 1500));
        setText(aiResult.text || queryToSolve);
        if (aiResult.options && Array.isArray(aiResult.options)) {
          const newOpts = [...aiResult.options];
          while(newOpts.length < 4) newOpts.push(`Option ${newOpts.length + 1}`);
          setOptions(newOpts.slice(0, 4));
        }
        setCorrectIndex(aiResult.correctIndex || 0);
        setExplanation(aiResult.explanation || '');
        setTags('AI Solved');
        setShowSolution(true); 
      } else {
        alert("AI could not solve this specific doubt. Please try rephrasing.");
      }
    } catch (e) {
      alert("AI Server busy. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || options.some(o => !o)) return;

    setIsSaving(true);
    const newQuestion: Question = {
      id: `user-${Date.now()}`,
      text,
      options,
      correctIndex,
      explanation,
      source: QuestionSource.USER,
      examType: examType,
      subject: subject,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      createdAt: Date.now()
    };

    setTimeout(() => {
      saveUserQuestion(userId, newQuestion);
      setIsSaving(false);
      onSuccess();
    }, 600);
  };

  if (isGenerating || isSaving) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
         <div className="mb-10">
            <div className="sand-timer mx-auto">
               <div className="sand-top"></div>
               <div className="sand-bottom"></div>
               <div className="sand-stream"></div>
            </div>
         </div>
         <div className="space-y-4 max-w-sm">
            <h3 className="text-3xl font-display font-black text-white leading-tight">
               {isSaving ? 'Saving to Universe...' : 'Analyzing Doubt...'}
            </h3>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
               {isSaving ? 'Updating your personal notebook archives.' : 'AI Logic engines are extracting patterns and calculating the solution.'}
            </p>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Search Input Bar Overhaul */}
      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-2 shadow-xl border border-slate-100 dark:border-slate-700 transition-colors flex items-center gap-2 group animate-slide-up">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-xl flex-shrink-0 ml-2 text-brand-600">🔍</div>
          <input 
            type="text" 
            placeholder="Type any question or topic..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSolveQuery()}
            className="flex-1 p-4 bg-transparent text-slate-800 dark:text-white font-bold outline-none text-lg placeholder-slate-400"
          />
          <button 
            onClick={() => handleSolveQuery()}
            className="px-8 py-3.5 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-600/30 active:scale-95 transition-transform mr-1"
          >
            SOLVE
          </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10 animate-slide-up transition-colors">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">AI Solution Hub</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Solving for {examType} universe.</p>
          </div>
        </div>

        {showSolution && (
          <div className="mb-10 space-y-6 animate-fade-in">
             <div className="p-8 bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-[32px]">
                <h3 className="font-black text-brand-700 dark:text-brand-400 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="text-lg">💡</span> SOLUTION LOGIC
                </h3>
                <p className="text-base text-slate-700 dark:text-slate-300 mb-6 font-medium leading-relaxed whitespace-pre-wrap">{explanation}</p>
                <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-brand-100 dark:border-brand-900/20">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Correct Answer</p>
                   <p className="text-lg font-black text-brand-600">{options[correctIndex]}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 py-2 opacity-30">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[10px] font-black uppercase">Technical Breakdown Below</span>
                <div className="h-px bg-slate-200 flex-1"></div>
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Context</label>
             <textarea 
              required
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-medium outline-none h-32 resize-none focus:border-brand-500 transition-colors"
              placeholder="Paste question text here..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {options.map((opt, idx) => (
               <div key={idx} className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${correctIndex === idx ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 shadow-md' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'}`}>
                  <input type="radio" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} className="w-4 h-4 accent-brand-500" />
                  <input value={opt} onChange={e => handleOptionChange(idx, e.target.value)} placeholder={`Option ${String.fromCharCode(65+idx)}`} className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 dark:text-white" />
               </div>
             ))}
          </div>

          <div className="flex gap-4">
            <select 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="flex-1 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-white font-bold outline-none"
            >
               {EXAM_SUBJECTS[examType].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Tags (Comma separated)" 
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="flex-1 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-white font-bold outline-none"
            />
          </div>

          <Button type="submit" className="w-full py-5 !rounded-full shadow-2xl shadow-brand-500/20 font-black text-xl">
              SAVE TO NOTEBOOK
          </Button>
        </form>
      </div>
    </div>
  );
};
