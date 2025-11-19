
import React, { useState, useEffect } from 'react';
import { Question, QuestionSource } from '../types';
import { Button } from './Button';

interface QuestionCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer, onNext, isLast }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setShowReport(false);
    setReportSent(false);
    setReportReason('');
  }, [question.id]);

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    onAnswer(selectedOption === question.correctIndex);
  };

  const handleReportSubmit = () => {
    // Simulate API call
    setTimeout(() => {
      setReportSent(true);
      setTimeout(() => {
        setShowReport(false);
        setReportSent(false);
        setReportReason('');
      }, 2000);
    }, 500);
  };

  if (showReport) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col h-full max-h-[80vh] relative">
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
          <h3 className="text-red-700 font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Report Issue
          </h3>
          <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 flex flex-col h-full justify-center items-center text-center">
          {reportSent ? (
            <div className="animate-fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Report Received</h3>
              <p className="text-slate-500">Thanks for helping us improve!</p>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-4 text-left animate-fade-in">
              <p className="text-slate-600 mb-4 text-sm">What is wrong with this question?</p>
              
              {['Factually Incorrect', 'Wrong Answer Key', 'Spelling/Grammar', 'Confusing Explanation', 'Other'].map((reason) => (
                <label key={reason} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="radio" 
                    name="reportReason" 
                    value={reason} 
                    checked={reportReason === reason} 
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-slate-700 font-medium">{reason}</span>
                </label>
              ))}
              
              <div className="pt-4 flex gap-3">
                <Button variant="ghost" onClick={() => setShowReport(false)} className="flex-1">Cancel</Button>
                <Button 
                  variant="danger" 
                  onClick={handleReportSubmit} 
                  disabled={!reportReason}
                  className="flex-1"
                >
                  Submit Report
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase tracking-wide ${
            question.source === QuestionSource.USER ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {question.source === QuestionSource.USER ? 'Your Note' : 'AI PYQ'}
          </span>
          <span className="text-xs text-slate-500 font-medium">{question.subject || question.examType}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {question.tags && question.tags.length > 0 && (
             <span className="text-xs text-slate-400 hidden sm:inline">#{question.tags[0]}</span>
          )}
          <button 
            onClick={() => setShowReport(true)}
            className="text-slate-300 hover:text-red-500 transition-colors"
            title="Report issue with this question"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-8a2 2 0 01-2-2H5a2 2 0 012 2v8m0 0v2a2 2 0 012 2h2a2 2 0 012-2v-2m0 0h2a2 2 0 012 2v2a2 2 0 012-2h2a2 2 0 012 2v-2m0 0h2a2 2 0 012 2v2a2 2 0 012-2h2a2 2 0 012 2v-2m-6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1 .008-6C14.988 7.18 12.941 7.576 11.26 7.835a19.026 19.026 0 0 1-5.973-.634L3 6.75v6.75Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content (Scrollable) */}
      <div className="p-6 overflow-y-auto flex-1 no-scrollbar" dir="auto">
        <h3 className="text-xl font-semibold text-slate-800 mb-6 leading-relaxed text-start">
          {question.text}
        </h3>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            let optionStyle = "border-slate-200 hover:bg-slate-50 hover:border-indigo-300";
            
            if (isSubmitted) {
              if (index === question.correctIndex) {
                optionStyle = "bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500";
              } else if (index === selectedOption && index !== question.correctIndex) {
                optionStyle = "bg-red-50 border-red-500 text-red-800";
              } else {
                optionStyle = "opacity-50 border-slate-100";
              }
            } else if (selectedOption === index) {
              optionStyle = "bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500";
            }

            return (
              <button
                key={index}
                onClick={() => !isSubmitted && setSelectedOption(index)}
                disabled={isSubmitted}
                className={`w-full text-start p-4 rounded-xl border-2 transition-all duration-200 group relative flex items-center ${optionStyle}`}
              >
                <span className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 mr-3 text-sm font-bold rounded-full 
                  ${isSubmitted && index === question.correctIndex ? 'bg-green-200 text-green-800' : 
                    (selectedOption === index ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500')}
                `}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="font-medium flex-1">{option}</span>
                
                {isSubmitted && index === question.correctIndex && (
                  <svg className="absolute right-4 w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {isSubmitted && question.explanation && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 animate-fade-in text-start">
            <h4 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Explanation
            </h4>
            <p className="text-sm text-amber-900 leading-relaxed opacity-90">
              {question.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Footer - Sticky */}
      <div className="p-4 border-t border-slate-100 bg-white flex justify-end z-10">
        {!isSubmitted ? (
          <Button 
            onClick={handleSubmit} 
            disabled={selectedOption === null}
            className="w-full sm:w-auto"
          >
            Check Answer
          </Button>
        ) : (
          <Button onClick={onNext} variant="primary" className="w-full sm:w-auto">
            {isLast ? "Finish Practice" : "Next Question"}
          </Button>
        )}
      </div>
    </div>
  );
};
