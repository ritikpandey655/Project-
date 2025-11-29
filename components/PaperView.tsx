
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
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [historicalTrend, setHistoricalTrend] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  
  // Local state for language if toggle is available
  const [localLang, setLocalLang] = useState(language);

  // Sync if prop changes
  useEffect(() => {
     setLocalLang(language);
  }, [language]);
  
  const handleToggle = () => {
     if (onToggleLanguage) {
        onToggleLanguage();
     } else {
        setLocalLang(prev => prev === 'en' ? 'hi' : 'en');
     }
  };

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

  const handleSaveOffline = () => {
    if(userId) {
      saveOfflinePaper(userId, paper);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Grade the paper (Auto-grade MCQs)
  const handleSubmit = () => {
    let calculatedScore = 0;
    paper.sections.forEach(section => {
      section.questions.forEach(q => {
        if (q.type === QuestionType.MCQ) {
          const userAns = answers[q.id];
          if (userAns && userAns === q.options[q.correctIndex]) {
            calculatedScore += (q.marks || section.marksPerQuestion);
          }
        }
      });
    });
    setScore(calculatedScore);
    setIsSubmitted(true);
    setShowSubmitConfirm(false);
  };

  // Calculate Stats when submitted
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
        const marks = q.marks || section.marksPerQuestion;
        sectionStats[section.id].totalMarks += marks;

        // Identify topic (Tag > Subject > 'General')
        const topic = (q.tags && q.tags.length > 0) ? q.tags[0] : (q.subject || 'General');
        if (!topicPerformance[topic]) {
           topicPerformance[topic] = { correct: 0, total: 0 };
        }
        topicPerformance[topic].total += 1;

        const userAns = answers[q.id];
        if (userAns) attemptedCount++;

        if (q.type === QuestionType.MCQ) {
          const isCorrect = userAns === q.options[q.correctIndex];
          if (isCorrect) {
            correctCount++;
            sectionStats[section.id].obtainedMarks += marks;
            sectionStats[section.id].correctQs++;
            topicPerformance[topic].correct += 1;
          }
        }
      });
    });

    const skippedCount = totalQuestions - attemptedCount;
    const incorrectCount = attemptedCount - correctCount; 
    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const percentage = Math.round((score / paper.totalMarks) * 100);
    const timeUsed = (paper.durationMinutes * 60) - timeLeft;

    // Determine Badge
    let badge = { label: 'Needs Improvement', color: 'text-red-600 bg-red-50 border-red-200' };
    if (percentage >= 80) badge = { label: 'Excellent', color: 'text-green-600 bg-green-50 border-green-200' };
    else if (percentage >= 60) badge = { label: 'Good', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    else if (percentage >= 40) badge = { label: 'Average', color: 'text-amber-600 bg-amber-50 border-amber-200' };

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
  }, [isSubmitted, answers, paper, score, timeLeft]);

  // Effect to Save Result & Fetch History on Submit
  useEffect(() => {
    if (isSubmitted && resultStats && userId) {
        const result: ExamResult = {
          id: `res-${Date.now()}`,
          examType: paper.examType,
          paperTitle: paper.title,
          score: score,
          totalMarks: paper.totalMarks,
          accuracy: resultStats.accuracy,
          date: Date.now(),
          timeTakenSeconds: resultStats.timeUsed,
          topicAnalysis: resultStats.topicPerformance
        };
        
        saveExamResult(userId, result);
        
        // Fetch history for trend graph
        getExamHistory(userId).then(history => {
           const trendData = history
             .filter(h => h.examType === paper.examType)
             .map((h, idx) => ({
                name: `Att. ${idx + 1}`,
                accuracy: h.accuracy,
                score: Math.round((h.score / h.totalMarks) * 100)
             }));
           setHistoricalTrend(trendData);
        });
    }
  }, [isSubmitted, resultStats, userId]);

  // Comparison Data (Simulated Average)
  const comparisonData = useMemo(() => {
    if (!resultStats) return [];
    const avgScore = 65; 
    const avgAccuracy = 55;
    return [
      { subject: 'Score %', You: resultStats.percentage, Average: avgScore, fullMark: 100 },
      { subject: 'Accuracy %', You: resultStats.accuracy, Average: avgAccuracy, fullMark: 100 },
    ];
  }, [resultStats]);


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

  const watermarks = Array(20).fill("ExamPilot Secure Mode");
  const radius = 60; // Increased size for mobile visibility
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = resultStats ? circumference - (resultStats.percentage / 100) * circumference : 0;

  if (isSubmitted && resultStats) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 overflow-y-auto safe-top animate-fade-in no-select">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
               <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Analytics</h1>
               <p className="text-slate-500 dark:text-slate-400 text-sm">{paper.title}</p>
            </div>
            <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Back to Dashboard</Button>
          </div>
          
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             {/* Score Card */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-6">
               <div className="relative w-48 h-48 flex items-center justify-center">
                   <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                     <circle stroke="currentColor" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} className="text-slate-100 dark:text-slate-700" />
                     <circle stroke="currentColor" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} className={`${resultStats.percentage >= 60 ? 'text-green-500' : resultStats.percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`} />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-4xl font-extrabold text-slate-800 dark:text-white">{resultStats.percentage}%</span>
                     <span className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Score</span>
                   </div>
               </div>
               
               <div className={`px-5 py-2 rounded-full text-base font-bold border ${resultStats.badge.color}`}>
                   {resultStats.badge.label}
               </div>
               
               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{score} <span className="text-sm text-slate-400 font-normal">/ {paper.totalMarks}</span></div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide">Marks Obtained</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{Math.floor(resultStats.timeUsed / 60)}m {resultStats.timeUsed % 60}s</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide">Time Taken</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl col-span-2">
                     <div className="flex justify-around items-center">
                        <div className="flex flex-col"><span className="text-xl font-bold text-green-600 dark:text-green-400">{resultStats.correctCount}</span><span className="text-[10px] text-slate-400 uppercase font-bold">Correct</span></div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex flex-col"><span className="text-xl font-bold text-red-600 dark:text-red-400">{resultStats.incorrectCount}</span><span className="text-[10px] text-slate-400 uppercase font-bold">Wrong</span></div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex flex-col"><span className="text-xl font-bold text-slate-600 dark:text-slate-400">{resultStats.skippedCount}</span><span className="text-[10px] text-slate-400 uppercase font-bold">Skip</span></div>
                     </div>
                  </div>
               </div>
             </div>
             
             {/* Charts Container */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700">
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Performance vs Average</h3>
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={comparisonData}>
                       <PolarGrid stroke="#e2e8f0" />
                       <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                       <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                       <Radar name="You" dataKey="You" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                       <Radar name="Avg" dataKey="Average" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.3} />
                       <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                 </ResponsiveContainer>
               </div>
             </div>
           </div>

           <div className="mt-8 space-y-8">
              <div className="flex items-center gap-3">
                 <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center uppercase tracking-widest">Detailed Analysis</h2>
                 <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
              </div>
              
              {paper.sections.map(section => (
                  <div key={section.id}>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 px-2">{section.title}</h3>
                    <div className="space-y-4">
                       {section.questions.map((q, idx) => {
                          const questionText = (localLang === 'hi' && q.textHindi) ? q.textHindi : q.text;
                          const answerText = (localLang === 'hi' && q.answerHindi) ? q.answerHindi : (q.type === QuestionType.MCQ ? q.options[q.correctIndex] : q.answer);
                          
                          return (
                            <div key={q.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                               <div className="flex gap-4 mb-4">
                                  <span className="font-bold text-slate-400 text-lg">{idx + 1}.</span>
                                  <div className="flex-1">
                                     <p className="font-medium text-slate-900 dark:text-white text-base leading-relaxed">{questionText}</p>
                                  </div>
                               </div>
                               <div className="space-y-3 pl-8 border-l-2 border-slate-100 dark:border-slate-700 ml-2">
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Your Answer</p>
                                     <p className={`text-sm font-medium ${q.type === QuestionType.MCQ ? (answers[q.id] === q.options[q.correctIndex] ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-slate-700 dark:text-slate-300'}`}>
                                        {answers[q.id] || 'Not attempted'}
                                     </p>
                                  </div>
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                                     <p className="text-[10px] text-green-700 dark:text-green-400 uppercase font-bold mb-1 tracking-wider">Correct Answer</p>
                                     <p className="text-sm font-bold text-slate-800 dark:text-white">{answerText}</p>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                  </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  // --- Exam Taking View ---
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 flex flex-col animate-fade-in no-select">
      {/* 1. Header (Fixed Top) - Title & Timer */}
      <div className="bg-white dark:bg-slate-800 shadow-md z-50 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{paper.title}</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
               {paper.totalMarks} Marks • {paper.durationMinutes} Mins
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <div className={`text-base font-mono font-bold tabular-nums px-3 py-1.5 rounded-lg border ${
                timeLeft < 300 
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse dark:bg-red-900/20 dark:border-red-800' 
                : 'bg-slate-100 text-indigo-600 border-slate-200 dark:bg-slate-900 dark:text-indigo-400 dark:border-slate-700'
            }`}>
                {formatTime(timeLeft)}
            </div>
          </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-24 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6">
              {paper.sections.map((section) => (
                <div key={section.id} className="space-y-4">
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-opacity-90">
                      <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm sm:text-base">{section.title}</h3>
                      <span className="text-[10px] sm:text-xs font-bold uppercase text-indigo-500">{section.questions.length} Qs</span>
                    </div>
                    
                    {section.questions.map((q, idx) => {
                        const displayText = (localLang === 'hi' && q.textHindi) ? q.textHindi : q.text;
                        const displayOptions = (localLang === 'hi' && q.optionsHindi) ? q.optionsHindi : q.options;

                        return (
                          <div key={q.id} className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                              <div className="flex gap-3 mb-4">
                                <span className="font-bold text-slate-400">{idx+1}.</span>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-white text-base sm:text-lg">{displayText}</p>
                                    <div className="flex gap-2 mt-2">
                                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded font-bold uppercase">
                                          {q.marks || section.marksPerQuestion} Marks
                                      </span>
                                      {q.type === QuestionType.MCQ && (
                                          <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-bold uppercase">MCQ</span>
                                      )}
                                    </div>
                                </div>
                              </div>

                              {q.type === QuestionType.MCQ ? (
                                <div className="space-y-2 ml-6 sm:ml-8">
                                    {displayOptions.map((opt, i) => (
                                      <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${answers[q.id] === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                          <input 
                                            type="radio" 
                                            name={q.id} 
                                            checked={answers[q.id] === opt} 
                                            onChange={() => handleAnswerChange(q.id, opt)}
                                            className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 accent-indigo-600"
                                          />
                                          <span className="text-sm sm:text-base text-slate-700 dark:text-slate-300">{opt}</span>
                                      </label>
                                    ))}
                                </div>
                              ) : (
                                <textarea 
                                    className="w-full ml-6 sm:ml-8 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    rows={3}
                                    placeholder="Type your answer here..."
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                />
                              )}
                          </div>
                        );
                    })}
                </div>
              ))}
          </div>
      </div>

      {/* 3. Footer (Fixed Bottom) - Submit Button */}
      <div className="bg-white dark:bg-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 px-4 py-3 border-t border-slate-200 dark:border-slate-700 safe-bottom">
         <div className="max-w-4xl mx-auto flex gap-4">
             <div className="flex-1 hidden sm:block"></div>
             <Button 
               onClick={() => setShowSubmitConfirm(true)} 
               variant="primary" 
               className="w-full sm:w-auto px-8 py-3 text-lg font-bold shadow-lg shadow-indigo-500/30"
             >
               Submit Exam
             </Button>
         </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-pop-in border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submit Exam?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to finish? You cannot change answers after submitting.</p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)} className="flex-1">Cancel</Button>
                  <Button variant="primary" onClick={handleSubmit} className="flex-1">Yes, Submit</Button>
                </div>
            </div>
          </div>
      )}

      {/* Warning Modal */}
      {showWarning && (
          <div className="fixed inset-0 z-[120] bg-red-900/40 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-500 animate-shake">
                  <div className="text-4xl mb-2 text-center">⚠️</div>
                  <h3 className="text-xl font-bold text-red-600 mb-2 text-center">Warning Issued</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-6 text-center text-sm">
                    Tab switching is detected. This incident has been recorded.
                    <br/>
                    <span className="font-bold mt-2 block text-lg">Warning {warningCount}/3</span>
                  </p>
                  <Button onClick={() => setShowWarning(false)} className="w-full bg-red-600 hover:bg-red-700 text-white border-0">I Understand</Button>
              </div>
          </div>
      )}
    </div>
  );
};
