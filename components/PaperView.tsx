import React, { useState, useEffect, useMemo } from 'react';
import { QuestionPaper, QuestionType, ExamResult } from '../types';
import { Button } from './Button';
import { saveExamResult, getExamHistory, getUser } from '../services/storageService';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, CartesianGrid
} from 'recharts';

interface PaperViewProps {
  paper: QuestionPaper;
  onClose: () => void;
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

export const PaperView: React.FC<PaperViewProps> = ({ paper, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(paper.durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [historicalTrend, setHistoricalTrend] = useState<any[]>([]);

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
          if (userAns && userAns === q.options[q.correctIndex]) {
            calculatedScore += (q.marks || section.marksPerQuestion);
          }
        }
      });
    });
    setScore(calculatedScore);
    setIsSubmitted(true);
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
    if (isSubmitted && resultStats) {
      const user = getUser();
      if (user) {
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
        
        saveExamResult(user.id, result);
        
        // Fetch history for trend graph
        const history = getExamHistory(user.id);
        const trendData = history
          .filter(h => h.examType === paper.examType)
          .map((h, idx) => ({
             name: `Att. ${idx + 1}`,
             accuracy: h.accuracy,
             score: Math.round((h.score / h.totalMarks) * 100)
          }));
        setHistoricalTrend(trendData);
      }
    }
  }, [isSubmitted, resultStats]);

  // Prepare Topic Chart Data
  const topicChartData = useMemo(() => {
     if (!resultStats) return [];
     return Object.keys(resultStats.topicPerformance).map(topic => ({
        topic: topic.length > 12 ? topic.substring(0,10) + '..' : topic,
        fullTopic: topic,
        accuracy: Math.round((resultStats.topicPerformance[topic].correct / resultStats.topicPerformance[topic].total) * 100)
     })).sort((a, b) => b.accuracy - a.accuracy);
  }, [resultStats]);

  // Comparison Data (Simulated Average)
  const comparisonData = useMemo(() => {
    if (!resultStats) return [];
    // Simulate an average student score (usually around 60-70% for mocks)
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

  // Generate Watermark Content
  const watermarks = Array(20).fill("ExamMaster Secure Mode");

  // Score Gauge Circle
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = resultStats ? circumference - (resultStats.percentage / 100) * circumference : 0;

  if (isSubmitted && resultStats) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto safe-top animate-fade-in">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
               <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Analytics</h1>
               <p className="text-slate-500 dark:text-slate-400">{paper.title}</p>
            </div>
            <Button onClick={onClose} variant="outline">Back to Dashboard</Button>
          </div>

          {/* Main Score Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left: Score & Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                    <circle
                      stroke="currentColor"
                      strokeWidth={stroke}
                      fill="transparent"
                      r={normalizedRadius}
                      cx={radius}
                      cy={radius}
                      className="text-slate-100 dark:text-slate-700"
                    />
                    <circle
                      stroke="currentColor"
                      strokeWidth={stroke}
                      strokeDasharray={circumference + ' ' + circumference}
                      style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                      strokeLinecap="round"
                      fill="transparent"
                      r={normalizedRadius}
                      cx={radius}
                      cy={radius}
                      className={`${resultStats.percentage >= 60 ? 'text-green-500' : resultStats.percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-800 dark:text-white">{resultStats.percentage}%</span>
                    <span className="text-xs text-slate-400 uppercase font-bold">Score</span>
                  </div>
                </div>
                <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-bold border ${resultStats.badge.color}`}>
                  {resultStats.badge.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="text-xl font-bold text-slate-800 dark:text-white">{score} <span className="text-sm text-slate-400">/ {paper.totalMarks}</span></div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Marks</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="text-xl font-bold text-slate-800 dark:text-white">{Math.floor(resultStats.timeUsed / 60)}m {resultStats.timeUsed % 60}s</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Time Taken</div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl col-span-2">
                   <div className="flex justify-around">
                      <div>
                        <span className="block text-lg font-bold text-green-600 dark:text-green-400">{resultStats.correctCount}</span>
                        <span className="text-[10px] text-slate-400 uppercase">Correct</span>
                      </div>
                      <div>
                        <span className="block text-lg font-bold text-red-600 dark:text-red-400">{resultStats.incorrectCount}</span>
                        <span className="text-[10px] text-slate-400 uppercase">Wrong</span>
                      </div>
                      <div>
                        <span className="block text-lg font-bold text-slate-600 dark:text-slate-400">{resultStats.skippedCount}</span>
                        <span className="text-[10px] text-slate-400 uppercase">Skip</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Right: Comparative Analysis */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Performance vs Average</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="You" dataKey="You" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                      <Radar name="Avg" dataKey="Average" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.3} />
                      <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                   </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">Comparison based on typical exam averages.</p>
            </div>
          </div>

          {/* Advanced Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             
             {/* Topic Strength Analysis */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Topic Strength</h3>
                <div className="h-64">
                   {topicChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={topicChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis 
                               dataKey="topic" 
                               type="category" 
                               width={80} 
                               tick={{fontSize: 11, fill: '#64748b'}} 
                               axisLine={false} 
                               tickLine={false} 
                            />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                            <Bar dataKey="accuracy" name="Accuracy %" radius={[0, 4, 4, 0]} barSize={15}>
                               {topicChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.accuracy > 75 ? '#4ade80' : entry.accuracy > 40 ? '#facc15' : '#f87171'} />
                               ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   ) : (
                      <p className="text-center text-slate-400 py-10">Not enough data for topic analysis.</p>
                   )}
                </div>
             </div>

             {/* Historical Trend */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Progress Trend</h3>
                <div className="h-64">
                  {historicalTrend.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={historicalTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{borderRadius: '8px'}} />
                          <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} name="Score %" />
                          <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={false} name="Accuracy %" strokeDasharray="5 5" />
                       </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                       <span className="text-3xl mb-2">📉</span>
                       <p>Complete more exams to see your trend.</p>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Section Analysis Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
             <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Section-wise Breakdown</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                   <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">
                      <tr>
                         <th className="px-6 py-4">Section</th>
                         <th className="px-6 py-4">Questions</th>
                         <th className="px-6 py-4">Marks Obtained</th>
                         <th className="px-6 py-4">Performance</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {Object.values(resultStats.sectionStats).map((sec: SectionStat, idx) => (
                         <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{sec.title}</td>
                            <td className="px-6 py-4">{sec.correctQs} / {sec.totalQs}</td>
                            <td className="px-6 py-4">{sec.obtainedMarks} / {sec.totalMarks}</td>
                            <td className="px-6 py-4">
                               <div className="w-full max-w-[100px] h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500" 
                                    style={{ width: `${sec.totalMarks > 0 ? (sec.obtainedMarks / sec.totalMarks) * 100 : 0}%` }}
                                  ></div>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
          
           <div className="mt-8 space-y-8">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center">Detailed Solutions</h2>
              {paper.sections.map(section => (
                  <div key={section.id}>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 px-4">{section.title}</h3>
                    <div className="space-y-4">
                       {section.questions.map((q, idx) => (
                          <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                             <div className="flex gap-3 mb-3">
                                <span className="font-bold text-slate-500 dark:text-slate-400">{idx + 1}.</span>
                                <p className="font-medium text-slate-900 dark:text-white">{q.text}</p>
                             </div>
                             
                             <div className="ml-6 sm:ml-8 space-y-3">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                   <p className="text-xs text-slate-500 uppercase font-bold mb-1">Your Answer</p>
                                   <p className={`text-sm ${
                                      q.type === QuestionType.MCQ 
                                        ? (answers[q.id] === q.options[q.correctIndex] ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400')
                                        : 'text-slate-700 dark:text-slate-300'
                                   }`}>
                                      {answers[q.id] || 'Not attempted'}
                                   </p>
                                </div>

                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                                   <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold mb-1">Correct Answer / Model Solution</p>
                                   <p className="text-sm text-slate-800 dark:text-slate-200">
                                      {q.type === QuestionType.MCQ ? q.options[q.correctIndex] : q.answer}
                                   </p>
                                </div>
                                
                                {q.explanation && (
                                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                                    <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-bold mb-1">Explanation</p>
                                    <p className="text-sm text-slate-800 dark:text-slate-200">{q.explanation}</p>
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
  }

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

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && !isSubmitted && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-700 relative">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Submit Exam?</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
              You are about to submit your answers. You won't be able to change them afterwards.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="flex-1 dark:text-slate-300">Cancel</Button>
              <Button variant="primary" onClick={() => { handleSubmit(); setShowSubmitConfirm(false); }} className="flex-1">Yes, Submit</Button>
            </div>
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

        <Button size="sm" variant="primary" onClick={() => setShowSubmitConfirm(true)}>
          Submit Paper
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 pb-24 relative z-10">
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
                            
                            let containerClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700";
                            if (isSelected) {
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
                                  onChange={() => handleAnswerChange(q.id, opt)}
                                  className="hidden"
                                />
                                <span className="text-slate-800 dark:text-slate-200">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-y"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Finish Exam Button (Bottom) */}
           <div className="flex justify-center pt-8">
             <Button 
                size="lg" 
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full sm:w-auto px-12 shadow-lg shadow-indigo-500/20"
             >
               Finish & Submit Exam
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
};