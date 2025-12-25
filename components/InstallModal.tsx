import React from 'react';
import { Button } from './Button';

interface InstallModalProps {
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        
        <div className="text-center">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                📲
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Install App</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                It looks like the automatic install isn't available. You can install manually:
            </p>
            
            <div className="text-left bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6 space-y-3">
                <div className="flex items-start gap-3">
                    <span className="font-bold text-brand-600 mt-0.5">1.</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Tap the <span className="font-bold">Three Dots (⋮)</span> or <span className="font-bold">Share</span> button in your browser.</span>
                </div>
                <div className="flex items-start gap-3">
                    <span className="font-bold text-brand-600 mt-0.5">2.</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Select <span className="font-bold">"Add to Home Screen"</span> or <span className="font-bold">"Install App"</span>.</span>
                </div>
            </div>

            <Button onClick={onClose} className="w-full">Got it</Button>
        </div>
      </div>
    </div>
  );
};