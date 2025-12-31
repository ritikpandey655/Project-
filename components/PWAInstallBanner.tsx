
import React from 'react';
import { Button } from './Button';

interface PWAInstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onInstall, onDismiss }) => {
  return (
    <div className="fixed bottom-20 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 bg-[#0f172a]/95 backdrop-blur-xl border border-brand-500/30 p-5 rounded-3xl shadow-2xl z-[90] flex flex-col gap-4 animate-slide-up ring-1 ring-white/10">
       <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-brand-500/20 shrink-0">
             ✨
          </div>
          <div className="flex-1">
             <h3 className="font-display font-black text-white text-base tracking-tight">Install App Experience</h3>
             <p className="text-xs font-medium text-slate-300 mt-1 leading-relaxed">
                Add to home screen for fullscreen view, offline access, and instant performance.
             </p>
          </div>
          <button 
            onClick={onDismiss} 
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
       </div>
       <div className="flex gap-3">
          <button 
            onClick={onDismiss}
            className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Not Now
          </button>
          <Button onClick={onInstall} size="sm" className="flex-1 shadow-lg shadow-brand-500/20 !rounded-xl font-black uppercase tracking-wider">
            Install
          </Button>
       </div>
    </div>
  );
};
