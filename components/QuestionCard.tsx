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

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
  }, [question.id]);

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    onAnswer(selectedOption === question.correctIndex);
  };

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
        {question.tags && question.tags.length > 0 && (
           <span className="text-xs text-slate-400">#{question.tags[0]}</span>
        )}
      </div>

      {/* Content (Scrollable) */}
      <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
        <h3 className="text-xl font-semibold text-slate-800 mb-6 leading-relaxed">
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
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative ${optionStyle}`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 mr-3 text-sm font-bold rounded-full 
                  ${isSubmitted && index === question.correctIndex ? 'bg-green-200 text-green-800' : 
                    (selectedOption === index ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500')}
                `}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="font-medium">{option}</span>
                
                {isSubmitted && index === question.correctIndex && (
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {isSubmitted && question.explanation && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 animate-fade-in">
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
