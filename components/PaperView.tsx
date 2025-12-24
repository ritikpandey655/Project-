
import React, { useState, useEffect, useMemo } from 'react';
import { QuestionPaper, QuestionType, ExamResult } from '../types';
import { Button } from './Button';
import { saveExamResult, getExamHistory, saveOfflinePaper } from '../services/storageService';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface PaperViewProps {
  paper: QuestionPaper;
  onClose: () => void;
  language?: 'en' | 'hi';
  onToggleLanguage?: () => void;
  userId: string;
}

interface SectionStat {
  title: string;
  totalMarks: number;
  obtainedMarks: number;
  totalQs: number;
  correctQs: number;
}

interface PaperStats {
  correctCount: number;
  incorrectCount: number;
  attemptedCount: number;
  skippedCount: number;
  accuracy: number;
  percentage: number;
  timeUsed: number;
  sectionStats: Record<string, SectionStat>;
  topicPerformance: Record<string, { correct: number; total: number }>;
  badge: { label: string; color: string };
  totalQuestions: number;
}

export const PaperView: React.FC<PaperViewProps> = ({ 
  paper, 
  onClose,
  language = 'en',
  onToggleLanguage,
  userId
}) => {
  const [timeLeft, setTimeLeft] = useState(paper.durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  const [localLang, setLocalLang] = useState(language);

  useEffect(() => {
     setLocalLang(language);
  }, [language]);
  
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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSaveOffline = () => {
    if(userId) {
      saveOfflinePaper(userId, paper);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleSubmit = () => {
    let calculatedScore = 0;
    paper.sections.forEach(section => {
      section.questions.forEach(q => {
        if (Array.isArray(q.options)) {
          const userAns = answers[q.id];
          if (userAns && userAns === q.options[q.correctIndex]) {
            calculatedScore += (q.marks || section.marksPerQuestion || 4);
          }
        }
      });
    });
    setScore(calculatedScore);
    setIsSubmitted(true);
    setShowSubmitConfirm(false);
  };

  const resultStats = useMemo<PaperStats | null>(() => {
    if (!isSubmitted) return null;

    let correctCount = 0;
    let attemptedCount = 0;
    let totalQuestions = 0;
    const sectionStats: Record<string, SectionStat> = {};
    const topicPerformance: Record<string, { correct: number; total: number }> = {};

    paper.sections.forEach(section => {
      totalQuestions += section.questions.length;
      sectionStats[section.id] = {
        title: section.title,
        totalMarks: 0,
        obtainedMarks: 0,
        totalQs: section.questions.length,
        correctQs: 0
      };

      section.questions.forEach(q => {
        const marks = q.marks || section.marksPerQuestion || 4;
        sectionStats[section.id].totalMarks += marks;

        const topic = (q.tags && q.tags.length > 0) ? q.tags[0] : (q.subject || 'General');
        if (!topicPerformance[topic]) {
           topicPerformance[topic] = { correct: 0, total: 0 };
        }
        topicPerformance[topic].total += 1;

        const userAns = answers[q.id];
        if (userAns) attemptedCount++;

        if (Array.isArray(q.options)) {
          const isCorrect = userAns === q.options[q.correctIndex];
          if (isCorrect) {
            correctCount++;
            sectionStats[section.id].correctQs++;
            sectionStats[section.id].obtainedMarks += marks;
            topicPerformance[topic].correct += 1;
          }
        }
      });
    });

    const incorrectCount = attemptedCount - correctCount;
    const skippedCount = totalQuestions - attemptedCount;
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const percentage = paper.totalMarks > 0 ? Math.round((score / paper.totalMarks) * 100) : 0;
    const timeUsed = (paper.durationMinutes * 60) - timeLeft;

    let badge = { label: 'Keep Pushing!', color: 'text-red-500 bg-red-50' };
    if (percentage > 90) badge = { label: 'Universe Conqueror 🏆', color: 'text-yellow-600 bg-yellow-50' };
    else if (percentage > 75) badge = { label: 'Elite Performer 🌟', color: 'text-green-600 bg-green-50' };
    else if (percentage > 50) badge = { label: 'Good Progress 👍', color: 'text-blue-600 bg-blue-50' };

    if (userId) {
       const result: ExamResult = {
         id: `res-${Date.now()}`,
         examType: paper.examType,
         paperTitle: paper.title,
         score,
         totalMarks: paper.totalMarks,
         accuracy,
         date: Date.now(),
         timeTakenSeconds: timeUsed,
         topicAnalysis: topicPerformance
       };
       saveExamResult(userId, result);
    }

    return {
      correctCount,
      incorrectCount,
      attemptedCount,
      skippedCount,
      accuracy,
      percentage,
      timeUsed,
      sectionStats,
      topicPerformance,
      badge,
      totalQuestions
    };
  }, [isSubmitted, paper, answers, score, timeLeft, userId]);

  const radarData = useMemo(() => {
    if (!resultStats) return [];
    return Object.entries(resultStats.topicPerformance).map(([topic, data]) => {
      const stats = data as { correct: number; total: number };
      return {
        subject: topic,
        A: Math.round((stats.correct / stats.total) * 100),
        fullMark: 100
      };
    }).slice(0, 6);
  }, [resultStats]);

  if (isSubmitted && resultStats) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 animate-fade-in pb-20">
        <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
          <div className="bg-brand-600 p-10 text-center text-white relative overflow-hidden">
             <div className="relative z-10">
               <h2 className="text-4xl font-black font-display mb-2 tracking-tighter">{resultStats.badge.label}</h2>
               <p className="text-brand-100 font-bold opacity-80 uppercase tracking-widest text-xs">Final Score: {score} / {paper.totalMarks}</p>
             </div>
             <div className="absolute top-[-50%] left-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="p-8">
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[24px] text-center border border-slate-100 dark:border-white/5">
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Accuracy</p>
                   <p className="text-3xl font-black text-slate-800 dark:text-white">{resultStats.accuracy}%</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[24px] text-center border border-slate-100 dark:border-white/5">
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Solved</p>
                   <p className="text-3xl font-black text-slate-800 dark:text-white">{resultStats.attemptedCount}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[24px] text-center border border-slate-100 dark:border-white/5">
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Time</p>
                   <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{Math.floor(resultStats.timeUsed/60)}m {resultStats.timeUsed%60}s</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[24px] text-center border border-slate-100 dark:border-white/5">
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Correct</p>
                   <p className="text-3xl font-black text-green-500">{resultStats.correctCount}</p>
                </div>
             </div>

             {/* Question Review Button */}
             {!showReview ? (
                <div className="flex flex-col gap-4">
                    <Button onClick={() => setShowReview(true)} variant="secondary" className="w-full py-4 text-brand-600 font-black tracking-wide bg-brand-50 border-brand-100 !rounded-2xl">
                        🔍 REVIEW DETAILED SOLUTIONS
                    </Button>
                    <Button onClick={onClose} className="w-full py-4 shadow-xl !rounded-2xl">RETURN TO DASHBOARD</Button>
                </div>
             ) : (
                <div className="space-y-8 animate-fade-in">
                   <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">Detailed Solutions</h3>
                      <button onClick={() => setShowReview(false)} className="text-xs font-bold text-slate-400 uppercase hover:text-brand-600">Close Review</button>
                   </div>
                   
                   {paper.sections.map(section => (
                      <div key={section.id} className="space-y-6">
                         {section.questions.map((q, idx) => {
                            const userAns = answers[q.id];
                            const isCorrect = userAns === q.options[q.correctIndex];
                            return (
                               <div key={q.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-white/5">
                                  <div className="flex gap-4 mb-4">
                                     <span className="font-black text-slate-300 dark:text-slate-600 text-lg">{idx + 1}.</span>
                                     <p className="font-bold text-slate-800 dark:text-white leading-relaxed">{q.text}</p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                     {q.options.map((opt, i) => (
                                        <div key={i} className={`p-3 rounded-xl text-sm font-medium border-2 flex items-center gap-3 ${
                                            i === q.correctIndex ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                            userAns === opt ? 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                            'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 opacity-60'
                                        }`}>
                                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === q.correctIndex ? 'bg-green-500 text-white' : userAns === opt ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                              {String.fromCharCode(65+i)}
                                           </div>
                                           <span>{opt}</span>
                                        </div>
                                     ))}
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                     <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="text-base">💡</span> AI Explanation
                                     </p>
                                     <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                        {q.explanation}
                                     </p>
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   ))}
                   
                   <Button onClick={onClose} className="w-full py-4 !rounded-2xl">DONE REVIEWING</Button>
                </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col h-full animate-fade-in">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
         <div>
            <h2 className="font-bold text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-md">{paper.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
               <span>{paper.totalMarks} Marks</span>
               <span>•</span>
               <span className={`${timeLeft < 300 ? 'text-red-500 animate-pulse font-bold' : ''}`}>
                 ⏱️ {formatTime(timeLeft)}
               </span>
            </div>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={handleSaveOffline}
              className={`p-2 rounded-xl transition-colors ${isSaved ? 'bg-green-100 text-green-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              title="Save Offline"
            >
               {isSaved ? '✔' : '📥'}
            </button>
            <Button onClick={() => setShowSubmitConfirm(true)} size="sm" variant="primary" className="hidden sm:inline-flex">Submit</Button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
         <div className="space-y-8 pb-10">
            {paper.sections.map((section) => (
                <div key={section.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <h3 className="font-display font-black text-2xl text-brand-purple mb-1">{section.title}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{section.instructions}</p>
                </div>
                
                <div className="space-y-12">
                    {section.questions.map((q, idx) => {
                        const displayText = (localLang === 'hi' && q.textHindi) 
                            ? q.textHindi 
                            : (q.text || "Question text unavailable.");
                        
                        const isMCQ = Array.isArray(q.options) && q.options.length > 0;

                        return (
                            <div key={q.id} className="group">
                                <div className="flex gap-4">
                                    <span className="font-black text-slate-300 dark:text-slate-600 text-2xl select-none min-w-[30px]">{idx + 1}.</span>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 dark:text-white text-xl mb-6 leading-relaxed">{displayText}</p>
                                        
                                        {isMCQ ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {q.options.map((opt, i) => (
                                                    <label 
                                                        key={i} 
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                                                        answers[q.id] === opt 
                                                        ? 'border-brand-purple bg-brand-50 dark:bg-brand-900/20 shadow-md' 
                                                        : 'border-slate-100 dark:border-slate-800 hover:border-brand-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 ${
                                                            answers[q.id] === opt ? 'bg-brand-purple border-brand-purple text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500'
                                                        }`}>
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                        <input 
                                                            type="radio" 
                                                            name={q.id} 
                                                            className="hidden"
                                                            checked={answers[q.id] === opt} 
                                                            onChange={() => handleAnswerChange(q.id, opt)}
                                                        />
                                                        <span className="text-slate-700 dark:text-slate-300 font-medium">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <textarea 
                                                placeholder="Type your answer here..." 
                                                className="w-full p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:border-brand-purple outline-none h-40 transition-colors"
                                                value={answers[q.id] || ''}
                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                </div>
            ))}
         </div>

         <div className="flex justify-center pb-24 pt-6">
            <Button onClick={() => setShowSubmitConfirm(true)} className="w-full max-w-sm py-5 text-xl font-black rounded-full shadow-2xl shadow-brand-purple/20">
               SUBMIT EXAM
            </Button>
         </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-2xl max-w-sm w-full animate-pop-in border border-white/10">
              <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-6 mx-auto text-3xl">🏁</div>
              <h3 className="font-display font-black text-2xl text-slate-800 dark:text-white mb-2 text-center">Ready to submit?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 text-center leading-relaxed">
                 You have answered <span className="font-bold text-brand-purple">{Object.keys(answers).length}</span> questions. You cannot change answers after submitting.
              </p>
              <div className="flex gap-3">
                 <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">Go Back</button>
                 <Button onClick={handleSubmit} className="flex-1 !rounded-2xl">Confirm</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
