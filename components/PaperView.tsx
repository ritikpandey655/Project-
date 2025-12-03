
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
  
  // Local state for language if toggle is available
  const [localLang, setLocalLang] = useState(language);

  // Sync if prop changes
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
    const percentage = Math.round((score / paper.totalMarks) * 100);
    const timeUsed = (paper.durationMinutes * 60) - timeLeft;

    let badge = { label: 'Needs Improvement', color: 'text-red-500 bg-red-50' };
    if (percentage > 90) badge = { label: 'Outstanding 🏆', color: 'text-yellow-600 bg-yellow-50' };
    else if (percentage > 75) badge = { label: 'Excellent 🌟', color: 'text-green-600 bg-green-50' };
    else if (percentage > 50) badge = { label: 'Good 👍', color: 'text-blue-600 bg-blue-50' };

    // Save history
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
    }).slice(0, 6); // Limit to 6 axes for readability
  }, [resultStats]);

  if (isSubmitted && resultStats) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 animate-fade-in pb-20">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="bg-indigo-600 p-8 text-center text-white relative overflow-hidden">
             <div className="relative z-10">
               <h2 className="text-3xl font-bold font-display mb-2">{resultStats.badge.label}</h2>
               <p className="text-indigo-100">You scored {score} out of {paper.totalMarks}</p>
             </div>
             <div className="absolute top-[-50%] left-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="p-6">
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center">
                   <p className="text-xs text-slate-500 uppercase font-bold">Accuracy</p>
                   <p className="text-2xl font-bold text-slate-800 dark:text-white">{resultStats.accuracy}%</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center">
                   <p className="text-xs text-slate-500 uppercase font-bold">Attempted</p>
                   <p className="text-2xl font-bold text-slate-800 dark:text-white">{resultStats.attemptedCount}/{resultStats.totalQuestions}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center">
                   <p className="text-xs text-slate-500 uppercase font-bold">Time Taken</p>
                   <p className="text-2xl font-bold text-slate-800 dark:text-white">{Math.floor(resultStats.timeUsed/60)}m {resultStats.timeUsed%60}s</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center">
                   <p className="text-xs text-slate-500 uppercase font-bold">Correct</p>
                   <p className="text-2xl font-bold text-green-600">{resultStats.correctCount}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Topic Radar */}
                <div className="h-64 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
                   <h3 className="text-center text-sm font-bold text-slate-500 mb-2">Topic Strength</h3>
                   <ResponsiveContainer width="100%" height="100%" debounce={300}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Accuracy" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                        <Tooltip />
                      </RadarChart>
                   </ResponsiveContainer>
                </div>

                {/* Score Distribution */}
                <div className="h-64 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center">
                   <h3 className="text-center text-sm font-bold text-slate-500 mb-2">Answer Distribution</h3>
                   <ResponsiveContainer width="100%" height="100%" debounce={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Correct', value: resultStats.correctCount },
                            { name: 'Incorrect', value: resultStats.incorrectCount },
                            { name: 'Skipped', value: resultStats.skippedCount }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                          <Cell fill="#94A3B8" />
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
             
             <Button onClick={onClose} className="w-full py-3 shadow-lg">Return to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col h-full animate-fade-in">
      {/* Header */}
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

      {/* Questions Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
         <div className="space-y-8 pb-10">
            {paper.sections.map((section) => (
                <div key={section.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{section.title}</h3>
                    <p className="text-xs text-slate-500">{section.instructions}</p>
                </div>
                
                <div className="space-y-8">
                    {section.questions.map((q, idx) => {
                        const displayText = (localLang === 'hi' && q.textHindi) ? q.textHindi : q.text;
                        return (
                            <div key={q.id} className="group">
                            <div className="flex gap-4">
                                <span className="font-bold text-slate-400 dark:text-slate-500 text-lg select-none">{idx + 1}.</span>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800 dark:text-white text-lg mb-4 leading-relaxed">{displayText}</p>
                                    
                                    {q.type === QuestionType.MCQ ? (
                                        <div className="space-y-3">
                                        {q.options.map((opt, i) => (
                                            <label 
                                                key={i} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                answers[q.id] === opt 
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                <input 
                                                type="radio" 
                                                name={q.id} 
                                                checked={answers[q.id] === opt} 
                                                onChange={() => handleAnswerChange(q.id, opt)}
                                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-slate-700 dark:text-slate-300">{opt}</span>
                                            </label>
                                        ))}
                                        </div>
                                    ) : (
                                        <textarea 
                                        placeholder="Type your answer here..." 
                                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none h-32"
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

         {/* Bottom Submit Button */}
         <div className="flex justify-center pb-20 pt-6">
            <Button onClick={() => setShowSubmitConfirm(true)} className="w-full max-w-sm py-4 text-lg font-bold shadow-xl">
               Submit Exam
            </Button>
         </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-pop-in">
              <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">Submit Exam?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                 You have answered {Object.keys(answers).length} questions. You cannot change answers after submitting.
              </p>
              <div className="flex gap-3">
                 <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)} className="flex-1">Cancel</Button>
                 <Button onClick={handleSubmit} className="flex-1">Submit Now</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
