
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
      const paper = await generateFullPaper(examType, subject, difficulty, seedData, config);
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
          isLoading={isLoading} 
          className="w-full py-4 font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          Generate Paper
        </Button>
      </div>
    </div>
  );
};
