
import React, { useState } from 'react';
import { ExamType } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { Button } from './Button';

interface PracticeConfigModalProps {
  examType: ExamType;
  onStart: (config: { subject: string; count: number; mode: 'finite' | 'endless' }) => void;
  onClose: () => void;
}

export const PracticeConfigModal: React.FC<PracticeConfigModalProps> = ({ examType, onStart, onClose }) => {
  const [subject, setSubject] = useState<string>('Mixed');
  const [mode, setMode] = useState<'short' | 'medium' | 'long' | 'endless'>('medium');

  const subjects = ['Mixed', ...EXAM_SUBJECTS[examType]];

  const modes = [
    { id: 'short', label: 'Quick 10', count: 10, icon: '⚡', desc: 'Rapid fire revision' },
    { id: 'medium', label: 'Standard 30', count: 30, icon: '📝', desc: 'Daily practice set' },
    { id: 'long', label: 'Marathon 50', count: 50, icon: '🏃', desc: 'Deep dive session' },
    { id: 'endless', label: 'Endless ∞', count: 1000, icon: '♾️', desc: 'Non-stop until you quit' },
  ];

  const handleStart = () => {
    const selectedMode = modes.find(m => m.id === mode)!;
    onStart({
      subject,
      count: selectedMode.count,
      mode: mode === 'endless' ? 'endless' : 'finite'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Practice Configuration</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Customize your session for {examType}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Subject Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
            >
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Session Length</label>
            <div className="grid grid-cols-2 gap-3">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    mode === m.id 
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-600' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-lg">{m.icon}</span>
                    {mode === m.id && <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>}
                  </div>
                  <div className={`font-bold text-sm ${mode === m.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{m.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleStart} className="w-full py-3.5 text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none">
            Start Practice
          </Button>
        </div>
      </div>
    </div>
  );
};
