
import React, { useState, useEffect, useCallback } from 'react';
import { QuestionPaper, QuestionType } from '../types';
import { Button } from './Button';

interface PaperViewProps {
  paper: QuestionPaper;
  onClose: () => void;
}

export const PaperView: React.FC<PaperViewProps> = ({ paper, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(paper.durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle Answer Change
  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  // Grade the paper (Auto-grade MCQs)
  const handleSubmit = () => {
    let calculatedScore = 0;
    paper.sections.forEach(section => {
      section.questions.forEach(q => {
        if (q.type === QuestionType.MCQ) {
          const userAns = answers[q.id];
          // Assuming option text is stored in answer or index mapped
          // Let's rely on exact string match of option text
          if (userAns && userAns === q.options[q.correctIndex]) {
            calculatedScore += (q.marks || section.marksPerQuestion);
          }
        }
      });
    });
    setScore(calculatedScore);
    setIsSubmitted(true);
  };

  // Timer Effect
  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted]);

  // Security: Blur Detection (Tab Switching)
  useEffect(() => {
    if (isSubmitted) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningCount(prev => prev + 1);
        setShowWarning(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSubmitted]);

  // Security: Disable Right Click & Copy
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    
    document.body.classList.add('no-select');

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
      document.body.classList.remove('no-select');
    };
  }, []);

  // Generate Watermark Content
  const watermarks = Array(20).fill("ExamMaster Secure Mode");

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto no-scrollbar safe-top">
      {/* Watermark Overlay */}
      <div className="secure-watermark">
        {watermarks.map((text, i) => (
          <span key={i} className="m-12">{text}</span>
        ))}
      </div>

      {/* Tab Switch Warning Modal */}
      {showWarning && !isSubmitted && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-red-50 dark:bg-red-900/90 p-6 rounded-2xl max-w-sm text-center shadow-2xl border-2 border-red-500">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-700 dark:text-red-100 mb-2">Warning: Tab Switch Detected</h2>
            <p className="text-red-600 dark:text-red-200 mb-4">
              Switching tabs or minimizing the app is not allowed during the exam. 
              <br/><strong>Strike {warningCount}/3</strong>
            </p>
            <Button onClick={() => setShowWarning(false)} variant="danger" className="w-full">
              I Understand
            </Button>
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="sticky top-0 z-40 bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg hidden sm:block">{paper.title}</h1>
          <span className="text-xs text-slate-300 sm:hidden">Mock Exam</span>
        </div>
        
        <div className={`font-mono text-xl font-bold px-4 py-1 rounded-lg ${timeLeft < 300 ? 'bg-red-600 animate-pulse' : 'bg-slate-800'}`}>
          {formatTime(timeLeft)}
        </div>

        {isSubmitted ? (
          <Button size="sm" onClick={onClose} className="bg-white text-slate-900 hover:bg-slate-200">
            Exit Exam
          </Button>
        ) : (
          <Button size="sm" variant="primary" onClick={() => {
            if (window.confirm("Are you sure you want to submit the exam?")) handleSubmit();
          }}>
            Submit Paper
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 pb-24 relative z-10">
        
        {isSubmitted && (
           <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-center animate-fade-in">
              <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">Exam Submitted!</h2>
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                {score} <span className="text-lg text-slate-500 dark:text-slate-400">/ {paper.totalMarks}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                 Subjective questions require self-evaluation. Check the model answers below.
              </p>
           </div>
        )}

        <div className="space-y-12">
          {paper.sections.map((section) => (
            <div key={section.id}>
              <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-2 mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase">{section.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{section.instructions}</p>
              </div>

              <div className="space-y-8">
                {section.questions.map((q, idx) => (
                  <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between gap-4 mb-4">
                       <div className="flex gap-3">
                          <span className="font-bold text-slate-500 dark:text-slate-400 select-none">{idx + 1}.</span>
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white leading-relaxed">{q.text}</h3>
                       </div>
                       <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded h-fit whitespace-nowrap">
                         {q.marks || section.marksPerQuestion} Marks
                       </span>
                    </div>

                    {/* Question Input Area */}
                    <div className="ml-0 sm:ml-8">
                      {q.type === QuestionType.MCQ ? (
                        <div className="grid grid-cols-1 gap-3">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = answers[q.id] === opt;
                            const isCorrect = q.options[q.correctIndex] === opt;
                            
                            let containerClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700";
                            if (isSubmitted) {
                                if (isCorrect) containerClass = "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500";
                                else if (isSelected && !isCorrect) containerClass = "border-red-500 bg-red-50 dark:bg-red-900/20";
                                else containerClass = "opacity-60";
                            } else if (isSelected) {
                                containerClass = "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500";
                            }

                            return (
                              <label 
                                key={oIdx}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${containerClass}`}
                              >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-indigo-600' : 'border-slate-400'
                                }`}>
                                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                                </div>
                                <input 
                                  type="radio" 
                                  name={q.id} 
                                  value={opt}
                                  checked={isSelected}
                                  onChange={() => !isSubmitted && handleAnswerChange(q.id, opt)}
                                  className="hidden"
                                  disabled={isSubmitted}
                                />
                                <span className="text-slate-800 dark:text-slate-200">{opt}</span>
                                {isSubmitted && isCorrect && (
                                   <span className="ml-auto text-green-600 font-bold text-sm">✓ Correct</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            disabled={isSubmitted}
                            placeholder="Type your answer here..."
                            className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-y"
                          />
                          {isSubmitted && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl text-sm">
                              <p className="font-bold text-green-800 dark:text-green-300 mb-1">Model Answer:</p>
                              <p className="text-slate-700 dark:text-slate-300">{q.answer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
