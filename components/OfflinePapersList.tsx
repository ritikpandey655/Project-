
import React, { useState, useEffect } from 'react';
import { QuestionPaper } from '../types';
import { getOfflinePapers, removeOfflinePaper } from '../services/storageService';
import { Button } from './Button';

interface OfflinePapersListProps {
  userId: string;
  onOpenPaper: (paper: QuestionPaper) => void;
  onBack: () => void;
}

export const OfflinePapersList: React.FC<OfflinePapersListProps> = ({ userId, onOpenPaper, onBack }) => {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);

  useEffect(() => {
    const loadPapers = async () => {
      const data = await getOfflinePapers(userId);
      setPapers(data);
    };
    loadPapers();
  }, [userId]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("Delete this paper from offline storage?")) {
      removeOfflinePaper(userId, id);
      setPapers(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in p-4 sm:p-0">
      <button 
        onClick={onBack}
        className="mb-6 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
      >
        ← Back to Dashboard
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <span className="text-3xl">📥</span> Offline Library
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Access your saved papers anytime, without internet.</p>
      </div>

      {papers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
           <div className="text-4xl mb-4 opacity-50">📂</div>
           <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-2">No Downloads Yet</h3>
           <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto mb-6">
             Generate a Mock Paper and click "Save Offline" to view it here.
           </p>
           <Button variant="secondary" onClick={onBack}>Go Generate Paper</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map(paper => (
            <div 
              key={paper.id}
              onClick={() => onOpenPaper(paper)}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all group relative"
            >
              <div className="flex justify-between items-start">
                 <div>
                    <div className="flex gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded">{paper.examType}</span>
                      <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{paper.subject}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{paper.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {paper.totalMarks} Marks • {paper.durationMinutes} Mins • {new Date(paper.createdAt).toLocaleDateString()}
                    </p>
                 </div>
                 <button 
                   onClick={(e) => handleDelete(e, paper.id)}
                   className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-700"
                   title="Delete"
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                 </button>
              </div>
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                 <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">Open Paper →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
