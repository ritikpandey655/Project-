
import React, { useState, useEffect, useMemo } from 'react';
import { Question, QuestionSource } from '../types';
import { Button } from './Button';

interface QuestionCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onBack?: () => void;
  isLast: boolean;
  isLoadingNext?: boolean;
  language?: 'en' | 'hi';
  onToggleLanguage?: () => void;
  onBookmarkToggle?: (question: Question) => void;
  sessionStats?: {
    currentIndex: number;
    total: number;
    correct: number;
    wrong: number;
  };
  latency?: number; // New prop for latency display
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  onAnswer, 
  onNext, 
  onBack,
  isLast, 
  isLoadingNext = false,
  language = 'en',
  onToggleLanguage,
  onBookmarkToggle,
  sessionStats,
  latency = 0
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Timer logic for the current session
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setShowReport(false);
    setReportSent(false);
    setReportReason('');
    setIsBookmarked(!!question.isBookmarked);
  }, [question.id, question.isBookmarked]);

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    onAnswer(selectedOption === question.correctIndex);
  };

  const handleBookmarkClick = () => {
    if (onBookmarkToggle) {
      setIsBookmarked(!isBookmarked);
      onBookmarkToggle(question);
    }
  };

  const handleReportSubmit = () => {
    setTimeout(() => {
      setReportSent(true);
      setTimeout(() => {
        setShowReport(false);
        setReportSent(false);
        setReportReason('');
      }, 2000);
    }, 500);
  };

  const accuracy = useMemo(() => {
    if (!sessionStats) return 0;
    const totalAnswered = sessionStats.correct + sessionStats.wrong;
    return totalAnswered > 0 ? Math.round((sessionStats.correct / totalAnswered) * 100) : 0;
  }, [sessionStats]);

  // Content Selection Logic
  const displayHindi = language === 'hi' && question.textHindi;
  const displayText = displayHindi ? question.textHindi : question.text;
  
  let displayOptions: string[] = [];
  if (Array.isArray(question.options)) {
      displayOptions = (displayHindi && Array.isArray(question.optionsHindi) && question.optionsHindi.length === question.options.length) 
        ? question.optionsHindi 
        : question.options;
  }

  const displayExplanation = (displayHindi && question.explanationHindi) 
    ? question.explanationHindi 
    : question.explanation;

  if (showReport) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col h-full max-h-[80vh] relative transition-colors animate-pop-in">
        <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
          <h3 className="text-red-700 dark:text-red-400 font-bold flex items-center gap-2">Report Issue</h3>
          <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>
        <div className="p-6 space-y-4">
            {reportSent ? (
              <p className="text-green-600 font-bold text-center">Report Submitted!</p>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300">What's wrong with this question?</p>
                {['Incorrect Answer', 'Typos', 'Irrelevant', 'Other'].map((reason) => (
                    <label key={reason} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                      <input type="radio" name="report" value={reason} onChange={e => setReportReason(e.target.value)} />
                      <span className="text-slate-700 dark:text-slate-200">{reason}</span>
                    </label>
                ))}
                <Button onClick={handleReportSubmit} disabled={!reportReason} variant="danger" className="w-full">Submit Report</Button>
              </>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col min-h-[90vh] animate-slide-in-right pb-20">
      
      {/* Session Performance Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-4 mb-6 flex items-center justify-between shadow-sm sticky top-2 z-30">
          <div className="flex items-center gap-3">
             <button 
               onClick={onBack}
               className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
               title="Exit Practice"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Progress</p>
                <p className="text-sm font-black dark:text-white leading-none">
                  {sessionStats ? `${sessionStats.currentIndex + 1} of ${sessionStats.total}` : 'Practice'}
                </p>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-center hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Accuracy</p>
                <p className={`text-sm font-black leading-none ${accuracy > 70 ? 'text-green-500' : 'text-brand-500'}`}>{accuracy}%</p>
             </div>
             <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-2xl border border-brand-100 dark:border-brand-900/50 flex items-center gap-2">
                <span className="text-xs animate-pulse">⏱️</span>
                <span className="text-sm font-black font-mono text-brand-600 dark:text-brand-400">{formatTime(seconds)}</span>
             </div>
          </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors flex-1 flex flex-col">
        
        {/* Meta Bar */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
               {question.subject || 'General'}
            </span>
            {latency > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                   ⚡ {(latency / 1000).toFixed(2)}s
                </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {onToggleLanguage && (
              <button onClick={onToggleLanguage} className="mr-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600">
                {language === 'en' ? 'EN' : 'हि'}
              </button>
            )}
            <button onClick={handleBookmarkClick} className={`p-1 transition-colors ${isBookmarked ? 'text-red-500' : 'text-slate-300'}`}>
              <svg className="w-6 h-6" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Question Area */}
        <div className="px-6 py-4">
          <h2 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white leading-relaxed mb-8">
            {displayText}
          </h2>

          <div className="space-y-3 mb-8">
            {displayOptions.map((option, idx) => {
              let stateClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50";
              if (isSubmitted) {
                if (idx === question.correctIndex) stateClass = "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200";
                else if (idx === selectedOption) stateClass = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200";
                else stateClass = "opacity-50 border-slate-200 dark:border-slate-700";
              } else if (selectedOption === idx) {
                stateClass = "bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500";
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group active:scale-[0.99] ${stateClass}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 flex-shrink-0 transition-colors
                    ${isSubmitted && idx === question.correctIndex ? 'bg-green-500 border-green-500 text-white' : 
                      isSubmitted && idx === selectedOption ? 'bg-red-500 border-red-500 text-white' :
                      selectedOption === idx ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-400'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="font-bold text-base">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analytics & Explanation Footer */}
        {isSubmitted && (
          <div className="mt-auto bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-100 dark:border-slate-700 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💡</span>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Solution Insight</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base font-medium whitespace-pre-wrap">
                {displayExplanation || "No explanation provided."}
               </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {!isSubmitted ? (
          <Button onClick={handleSubmit} disabled={selectedOption === null} className="w-full py-4 text-lg font-black !rounded-full shadow-2xl shadow-brand-500/20">
            CONFIRM ANSWER
          </Button>
        ) : (
          <Button onClick={onNext} isLoading={isLoadingNext} className="w-full py-4 text-lg font-black !rounded-full shadow-2xl shadow-brand-500/20 !bg-slate-900 dark:!bg-white dark:!text-slate-900 text-white">
            {isLoadingNext ? 'Generating...' : isLast ? 'FINISH SESSION' : 'CONTINUE →'}
          </Button>
        )}
        <button onClick={() => setShowReport(true)} className="w-full text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">
          Report Error in Question
        </button>
      </div>
    </div>
  );
};
