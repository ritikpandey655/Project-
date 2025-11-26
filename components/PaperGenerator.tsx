
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
}

export const PaperGenerator: React.FC<PaperGeneratorProps> = ({ examType, onGenerate, onBack, onExamChange }) => {
  const [subject, setSubject] = useState(EXAM_SUBJECTS[examType][0]);
  const [difficulty, setDifficulty] = useState('Medium');
  const [seedData, setSeedData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mcqCount, setMcqCount] = useState(20); // Default increased to 20, allows up to 180

  const [config, setConfig] = useState({
    includeMCQ: true,
    includeShort: true,
    includeLong: false,
    includeViva: false,
  });

  // Update subject when examType changes (from props or internal switch)
  useEffect(() => {
    setSubject(EXAM_SUBJECTS[examType][0]);
  }, [examType]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      // Pass mcqCount to the service
      const paper = await generateFullPaper(examType, subject, difficulty, seedData, {
        ...config,
        mcqCount: config.includeMCQ ? mcqCount : 0
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
            {/* Sand Timer SVG */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-500 animate-spin-slow">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">⏳</div>
         </div>
         <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Structuring Your Paper...</h3>
         <p className="text-slate-500 dark:text-slate-400 text-sm">AI is generating questions for {subject} ({difficulty})</p>
         {config.includeMCQ && mcqCount > 30 && (
            <p className="text-xs text-amber-500 mt-4 animate-pulse">Large papers may take up to a minute.</p>
         )}
      </div>
    );
  }

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
             <select
              value={examType}
              onChange={(e) => onExamChange(e.target.value as ExamType)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            >
              {Object.values(ExamType).map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Subject</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {EXAM_SUBJECTS[examType].map(s => <option key={s} value={s}>{s}</option>)}
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
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Seed Data / Custom Topics (Optional)</label>
          <textarea 
            value={seedData}
            onChange={(e) => setSeedData(e.target.value)}
            placeholder="Paste specific topics, notes, or syllabus keywords here to customize the paper..."
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">AI will prioritize these topics when generating questions.</p>
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
