
import React, { useState, useEffect, useRef } from 'react';
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
  
  // Syllabus Upload State
  const [syllabusFile, setSyllabusFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Validate size (max 10MB for client performance)
        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large. Please upload an image/pdf under 10MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1];
            setSyllabusFile({
                name: file.name,
                mimeType: file.type || 'image/jpeg',
                data: base64
            });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const paper = await generateFullPaper(examType, subject, difficulty, seedData, {
        ...config,
        mcqCount: config.includeMCQ ? mcqCount : 0,
        syllabus: syllabusFile // Pass syllabus to service
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
         <p className="text-slate-500 dark:text-slate-400 text-sm">AI is reading your syllabus & creating questions.</p>
         {syllabusFile && (
             <p className="text-xs text-indigo-500 mt-2 font-bold animate-pulse">Analyzing: {syllabusFile.name}</p>
         )}
         {config.includeMCQ && mcqCount > 30 && (
            <p className="text-xs text-amber-500 mt-4 animate-pulse">Large papers may take up to a minute.</p>
         )}
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

        {/* Syllabus Upload Section - NEW */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                    📤 Upload Specific Syllabus
                </label>
                <span className="text-[10px] text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded">Optional</span>
            </div>
            
            {!syllabusFile ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-white/50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                >
                    <svg className="w-8 h-8 text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Click to upload Syllabus Image/PDF</p>
                    <p className="text-xs text-slate-500 mt-1">AI will generate questions strictly from this file.</p>
                    <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect}
                    />
                </div>
            ) : (
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-2xl">{syllabusFile.mimeType.includes('pdf') ? '📄' : '🖼️'}</span>
                        <div className="truncate">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{syllabusFile.name}</p>
                            <p className="text-xs text-green-600 dark:text-green-400 font-bold">Ready for Analysis</p>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSyllabusFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-colors"
                    >
                        ✕
                    </button>
                </div>
            )}
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
