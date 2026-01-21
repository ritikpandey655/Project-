import React, { useState, useEffect } from 'react';
import { ExamType } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { Button } from './Button';
import { generateFullPaper } from '../services/geminiService';

interface PaperGeneratorProps {
  examType: ExamType;
  onGenerate: (paper: any) => void;
  onBack: () => void;
  onExamChange: (exam: ExamType) => void;
  examSubjects?: string[];
}

export const PaperGenerator: React.FC<PaperGeneratorProps> = ({ 
  examType, 
  onGenerate, 
  onBack, 
  onExamChange,
  examSubjects = EXAM_SUBJECTS[examType]
}) => {
  const defaultSubject = examSubjects?.[0] || 'General';
  const [subject, setSubject] = useState(defaultSubject);
  const [difficulty, setDifficulty] = useState('Medium');
  const [seedData, setSeedData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mcqCount, setMcqCount] = useState(20);
  
  useEffect(() => {
    const newSubjects = examSubjects || EXAM_SUBJECTS[examType];
    setSubject(newSubjects?.[0] || 'General');
  }, [examType, examSubjects]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const promptData = {
        subject,
        difficulty,
        topic: seedData || "Mixed Topics (Full Syllabus)",
        questionCount: mcqCount,
        examType
      };

      const paper = await generateFullPaper(promptData);
      onGenerate(paper);
    } catch (error) {
      console.error("Failed to generate paper:", error);
      alert("Failed to generate paper. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 LOADING ANIMATION (SAND TIMER) START 👇
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 space-y-8 animate-in fade-in duration-500">
        
        {/* Sand Timer Animation */}
        <div className="relative">
          <div className="hourglass"></div>
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-purple-500/20 blur-xl rounded-full -z-10 animate-pulse"></div>
        </div>

        <div className="text-center space-y-3">
          <h3 className="text-2xl font-black text-slate-800 dark:text-white animate-pulse">
            Generating Paper...
          </h3>
          <p className="text-slate-500 font-medium text-sm">
            AI is analyzing topics & creating questions
          </p>
        </div>

        {/* Inline CSS for Sand Timer */}
        <style>{`
          .hourglass {
            display: block;
            background: #fff;
            width: 48px;
            height: 96px;
            box-shadow: inset 0 0 0 3px #cbd5e1;
            border-radius: 50% 50% 50% 50% / 12% 12% 12% 12%;
            animation: hourglass 2s infinite linear;
            position: relative;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.1);
          }
          /* Dark mode specific fix if needed */
          :global(.dark) .hourglass {
            box-shadow: inset 0 0 0 3px #475569;
          }

          .hourglass:before, .hourglass:after {
            content: "";
            display: block;
            position: absolute;
            width: 100%;
            height: 50%;
            background: #8b5cf6; /* Brand Purple */
            top: 0;
            left: 0;
            border-radius: 50% 50% 0 0 / 25% 25% 0 0;
            animation: hourglass-sand 2s infinite linear;
          }
          .hourglass:after {
            top: 50%;
            border-radius: 0 0 50% 50% / 0 0 25% 25%;
            transform: rotate(180deg);
            animation-delay: 1s;
          }
          @keyframes hourglass {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(180deg); }
            50% { transform: rotate(180deg); }
            75% { transform: rotate(360deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes hourglass-sand {
            0% { height: 50%; }
            25% { height: 0%; }
            50% { height: 0%; }
            51% { height: 50%; }
            100% { height: 50%; }
          }
        `}</style>
      </div>
    );
  }
  // 👆 LOADING ANIMATION END 👆

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            AI Generator
          </h2>
          <p className="text-sm text-slate-500 font-medium ml-1">
            Create custom papers instantly
          </p>
        </div>
        <Button variant="ghost" onClick={onBack} className="text-slate-400 hover:text-slate-600">
          Cancel
        </Button>
      </div>

      <div className="space-y-6 bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        
        {/* Exam Type Selector */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          {(['10th', '12th', 'JEE', 'NEET'] as ExamType[]).map((type) => (
            <button
              key={type}
              onClick={() => onExamChange(type)}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                examType === type 
                  ? 'bg-white dark:bg-slate-800 text-brand-purple shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Subject</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-purple transition-all"
            >
              {examSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Difficulty</label>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
              {['Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    difficulty === diff
                      ? diff === 'Hard' ? 'bg-red-500 text-white' : diff === 'Medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Count</label>
              <span className="text-xl font-black text-brand-purple">{mcqCount}</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="5" 
              value={mcqCount} 
              onChange={(e) => setMcqCount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-purple mb-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase">
              <span>10</span>
              <span>50</span>
              <span>100</span>
            </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Custom Topics (Hints)</label>
          <textarea 
            value={seedData}
            onChange={(e) => setSeedData(e.target.value)}
            placeholder={"E.g., High-weightage topics like Mechanics, Trigonometry..."}
            className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-brand-purple outline-none h-28 text-sm resize-none"
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          className="w-full py-4 text-lg font-black bg-brand-purple hover:bg-brand-purple/90 shadow-lg shadow-brand-purple/20"
        >
          Generate Paper
        </Button>
      </div>
    </div>
  );
};
