
import React, { useState, useEffect } from 'react';
import { Question, QuestionSource } from '../types';
import { Button } from './Button';

interface QuestionCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  isLast: boolean;
  isLoadingNext?: boolean;
  language?: 'en' | 'hi';
  onToggleLanguage?: () => void;
  onBookmarkToggle?: (question: Question) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  onAnswer, 
  onNext, 
  isLast, 
  isLoadingNext = false,
  language = 'en',
  onToggleLanguage,
  onBookmarkToggle
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

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

  // Content Selection Logic
  const displayHindi = language === 'hi' && question.textHindi;
  const displayText = displayHindi ? question.textHindi : question.text;
  const displayOptions = (displayHindi && question.optionsHindi && question.optionsHindi.length === question.options.length) 
    ? question.optionsHindi 
    : question.options;
  const displayExplanation = (displayHindi && question.explanationHindi) 
    ? question.explanationHindi 
    : question.explanation;

  if (showReport) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col h-full max-h-[80vh] relative transition-colors animate-pop-in">
        <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
          <h3 className="text-red-700 dark:text-red-400 font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Report Issue
          </h3>
          <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {reportSent ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
             <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
               <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
             </div>
             <p className="text-lg font-bold text-slate-800 dark:text-white">Report Submitted</p>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Thank you for helping us improve!</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">What's wrong with this question?</p>
            <div className="space-y-2">
              {['Incorrect Answer', 'Typos / Grammar', 'Irrelevant to Exam', 'Other'].map((reason) => (
                <label key={reason} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <input 
                    type="radio" 
                    name="reportReason" 
                    value={reason} 
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="text-red-600 focus:ring-red-500" 
                  />
                  <span className="text-slate-700 dark:text-slate-200">{reason}</span>
                </label>
              ))}
            </div>
            <Button onClick={handleReportSubmit} disabled={!reportReason} variant="danger" className="w-full mt-2">
              Submit Report
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-full justify-between animate-slide-in-right">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors">
        
        {/* Header / Meta */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-start">
          <div className="flex flex-col gap-2">
             <div className="flex flex-wrap gap-2">
                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                question.source === QuestionSource.USER 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                }`}>
                {question.source === QuestionSource.USER ? 'Your Notes' : 'AI Generated'}
                </span>
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {question.subject || 'General'}
                </span>
             </div>
          </div>
          
          <div className="flex items-center gap-1">
            {onToggleLanguage && (
              <button
                onClick={onToggleLanguage}
                className="mr-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-1
                  bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-slate-600"
              >
                <span>{language === 'en' ? 'EN' : 'हि'}</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
            
            {/* Bookmark Button */}
            {onBookmarkToggle && (
              <button
                onClick={handleBookmarkClick}
                className={`p-1 transition-colors ${isBookmarked ? 'text-red-500 hover:text-red-600' : 'text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400'}`}
                title="Bookmark Question"
              >
                <svg className="w-6 h-6" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}

            <button 
                onClick={() => setShowReport(true)}
                className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors p-1"
                title="Report Issue"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="px-6 py-2 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">
            {displayText}
          </h2>
          {!displayHindi && language === 'hi' && (
             <p className="text-xs text-slate-400 italic mt-1">Hindi translation unavailable for this question.</p>
          )}
        </div>

        {/* Options */}
        <div className="px-6 pb-8 space-y-3">
          {displayOptions.map((option, idx) => {
            let stateClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600";
            
            if (isSubmitted) {
              if (idx === question.correctIndex) {
                stateClass = "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500/50 text-green-800 dark:text-green-200 shadow-[0_0_0_1px_rgba(34,197,94,0.4)]";
              } else if (idx === selectedOption) {
                stateClass = "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500/50 text-red-800 dark:text-red-200";
              } else {
                stateClass = "opacity-50 border-slate-200 dark:border-slate-700";
              }
            } else if (selectedOption === idx) {
              stateClass = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-400 shadow-[0_0_0_1px_rgba(99,102,241,0.4)] transform scale-[1.01]";
            }

            return (
              <button
                key={idx}
                disabled={isSubmitted}
                onClick={() => setSelectedOption(idx)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group active:scale-[0.99] animate-slide-up-fade ${stateClass}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors flex-shrink-0
                  ${isSubmitted && idx === question.correctIndex ? 'bg-green-500 border-green-500 text-white' : 
                    isSubmitted && idx === selectedOption ? 'bg-red-500 border-red-500 text-white' :
                    selectedOption === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'}`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className={`text-base font-medium ${isSubmitted && idx === question.correctIndex ? 'font-bold' : ''} text-slate-700 dark:text-slate-200`}>
                  {option}
                </span>
                {isSubmitted && idx === question.correctIndex && (
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400 ml-auto animate-bounce-slight" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isSubmitted && idx === selectedOption && idx !== question.correctIndex && (
                   <svg className="w-6 h-6 text-red-600 dark:text-red-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer / Explanation */}
        {isSubmitted && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Explanation</h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {displayExplanation || "No explanation provided."}
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-6">
        {!isSubmitted ? (
          <Button 
            onClick={handleSubmit} 
            disabled={selectedOption === null} 
            className="w-full py-4 text-lg font-bold shadow-xl shadow-indigo-200 dark:shadow-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            onClick={onNext} 
            isLoading={isLoadingNext}
            className={`w-full py-4 text-lg font-bold shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                isLast && !isLoadingNext ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : ''
            }`}
          >
            {isLoadingNext ? 'Fetching More...' : isLast ? 'Finish Session' : 'Next Question →'}
          </Button>
        )}
      </div>
    </div>
  );
};
