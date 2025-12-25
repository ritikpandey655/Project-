
import React, { useState, useEffect } from 'react';

export const SafariInstallPrompt: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if already in standalone mode (installed)
    const isStandalone = (window.navigator as any).standalone === true;

    // Show only if on iOS and not installed
    if (isIOS && !isStandalone) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-slide-up">
      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-indigo-100 dark:border-white/10 relative overflow-hidden">
        {/* Shine effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-2xl flex-shrink-0">
            📲
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-display font-black text-slate-800 dark:text-white leading-tight">
                Install PYQverse on iOS
              </h3>
              <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
              Safari me install karne ke liye niche <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded mx-0.5"><svg className="w-4 h-4 text-indigo-600 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Share</span> icon par click karein aur phir <span className="font-bold text-indigo-600 dark:text-indigo-400">"Add to Home Screen"</span> chunein.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center">
            <div className="w-1 h-8 bg-indigo-500/20 rounded-full animate-bounce"></div>
        </div>
      </div>
      
      {/* Little arrow pointing down towards the browser toolbar */}
      <div className="flex justify-center -mt-1">
        <div className="w-4 h-4 bg-white dark:bg-slate-800 rotate-45 border-r border-b border-indigo-100 dark:border-white/10"></div>
      </div>
    </div>
  );
};
