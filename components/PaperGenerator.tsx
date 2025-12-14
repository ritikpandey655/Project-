
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
        mcqCount: config.includeMCQ ? mcqCount : 0,
      });
      
      if (paper) {
        onGenerate(paper);
      } else {
        alert("Failed to generate paper. Please check your connection and try again.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during generation.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center animate-fade-in">
         <div className="relative w-20 h-20 mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-500 animate-spin-slow">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">⏳</div>
         </div>
         <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Structuring Your Paper...</h3>
         <p className="text-slate-500 dark:text-slate-400 text-sm">
            Fetching Exam Pattern & Generating Questions...
         </p>
      </div>
    );
  }

  const subjectsList = examSubjects || EXAM_SUBJECTS[examType] || ['General'];

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-fade-in transition-colors">
      <div className="mb-6">
        <button onClick={onBack} className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-2 flex items-center gap-1">
          <span>←</span> Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Generate Mock Paper</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Create a custom exam paper with sections and marking scheme.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Exam</label>
             <div className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold flex items-center gap-2">
                <span>🔒</span> {examType}
             </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Subject</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        
        <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Difficulty</label>
            <select 
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Paper Sections</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <input type="checkbox" checked={config.includeMCQ} onChange={e => setConfig({...config, includeMCQ: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">MCQs (Objective)</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <input type="checkbox" checked={config.includeShort} onChange={e => setConfig({...config, includeShort: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Short Answers</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <input type="checkbox" checked={config.includeLong} onChange={e => setConfig({...config, includeLong: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Long Answers</span>
            </label>
            <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <input type="checkbox" checked={config.includeViva} onChange={e => setConfig({...config, includeViva: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Viva / Oral</span>
            </label>
          </div>
        </div>

        {config.includeMCQ && (
          <div className="animate-fade-in">
            <div className="flex justify-between mb-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Number of MCQs</label>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{mcqCount} Questions</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="180" 
              step="10" 
              value={mcqCount} 
              onChange={(e) => setMcqCount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10</span>
              <span>Standard (50)</span>
              <span>Full (180)</span>
            </div>
            {mcqCount > 50 && (
              <p className="text-xs text-amber-500 mt-1">Generating {mcqCount} questions may take a minute. Please wait while we fetch them in batches.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Topic Hints / Instructions</label>
          <textarea 
            value={seedData}
            onChange={(e) => setSeedData(e.target.value)}
            placeholder={"E.g., Optics, Modern History, Organic Chemistry..."}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">
             AI will prioritize these topics during generation.
          </p>
        </div>

        <Button 
          onClick={handleGenerate} 
          className="w-full py-4 font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          {config.includeMCQ && mcqCount > 50 ? 'Generate Large Paper' : 'Generate Paper'}
        </Button>
      </div>
    </div>
  );
};
