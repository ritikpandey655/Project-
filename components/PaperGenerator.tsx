
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
  
  const [config, setConfig] = useState({
    includeMCQ: true,
    includeShort: true,
    includeLong: false,
    includeViva: false,
  });

  useEffect(() => {
    const newSubjects = examSubjects || EXAM_SUBJECTS[examType];
    setSubject(newSubjects?.[0] || 'General');
  }, [examType, examSubjects]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const paper = await generateFullPaper(examType, subject, difficulty, seedData, {
        ...config,
        mcqCount: mcqCount,
      });
      
      if (paper) {
        setTimeout(() => {
            onGenerate(paper);
            setIsLoading(false);
        }, 1500);
      } else {
        alert("Failed to generate paper. Please check your connection and try again.");
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during generation.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
         <div className="mb-10 relative">
            {/* Professional Sand Timer */}
            <div className="sand-timer mx-auto">
               <div className="sand-top"></div>
               <div className="sand-bottom"></div>
               <div className="sand-stream"></div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/5 rounded-full animate-ping"></div>
         </div>
         
         <div className="space-y-4 max-w-sm">
            <h3 className="text-3xl font-display font-black text-white leading-tight">AI is crafting your exam universe...</h3>
            <div className="flex gap-1 justify-center">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
               Fetching latest {examType} patterns, generating {mcqCount} smart MCQs and calculating correct solution patterns.
            </p>
         </div>
      </div>
    );
  }

  const subjectsList = examSubjects || EXAM_SUBJECTS[examType] || ['General'];

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10 animate-slide-up transition-colors">
      <div className="mb-10">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-purple mb-4 flex items-center gap-2 group transition-colors">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
        </button>
        <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">Mock Generator</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Full-length professional papers powered by AI patterns.</p>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Exam Type</label>
             <div className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-3">
                <span className="text-lg opacity-50">🛡️</span> {examType}
             </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Subject</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-purple transition-all appearance-none cursor-pointer"
            >
              {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        
        <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Paper Difficulty</label>
            <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard'].map((d) => (
                    <button 
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${difficulty === d ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 hover:text-slate-600'}`}
                    >
                        {d}
                    </button>
                ))}
            </div>
        </div>

        <div className="animate-fade-in bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[28px] border border-slate-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Count</label>
              <span className="text-sm font-black text-brand-purple">{mcqCount} MCQs</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="180" 
              step="10" 
              value={mcqCount} 
              onChange={(e) => setMcqCount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-purple mb-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase">
              <span>10</span>
              <span>80</span>
              <span>180</span>
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
          className="w-full py-5 font-black text-xl !rounded-full shadow-2xl shadow-brand-purple/20 !border-0 mt-4"
        >
          GENERATE PAPER
        </Button>
      </div>
    </div>
  );
};
