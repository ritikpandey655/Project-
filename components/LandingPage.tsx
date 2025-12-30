
import React, { useState } from 'react';
import { Button } from './Button';
import { LogoIcon } from './LogoIcon';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: (initialQuery?: string) => void;
  onNavigate: (view: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup, onNavigate }) => {
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 overflow-x-hidden text-slate-900 dark:text-white transition-colors flex flex-col">
      
      {/* Modern Clean Navbar */}
      <nav className="fixed w-full z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <LogoIcon size="sm" className="scale-90" />
              <span className="font-display font-black text-2xl tracking-tighter text-slate-900 dark:text-white">PYQverse</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLogin}
                className="text-slate-700 dark:text-slate-300 font-bold text-sm hover:text-brand-600 dark:hover:text-white transition-colors"
              >
                Log In
              </button>
              <button 
                onClick={() => onSignup()} 
                className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-brand-500/20 transition-all"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-28 pb-12 sm:pt-48 sm:pb-32 flex flex-col items-center text-center px-4 flex-1">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/30 text-brand-700 dark:text-brand-300 text-[11px] font-black uppercase tracking-widest mb-8 animate-slide-up">
           <span className="text-yellow-500 dark:text-yellow-400">✨</span> NEXT-GEN AI EXAM PLATFORM
        </div>

        {/* Massive Headline */}
        <h1 className="max-w-5xl text-5xl sm:text-7xl lg:text-9xl font-display font-black text-slate-900 dark:text-white mb-6 leading-[0.95] tracking-tighter animate-slide-up">
          Prepare Exams.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-400 dark:to-brand-600">Instantly. AI Only.</span>
        </h1>
        
        {/* Subtext Flow */}
        <div className="flex items-center gap-4 text-xl sm:text-2xl font-bold text-slate-500 dark:text-slate-500 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
           <span>Idea</span>
           <span className="text-slate-300">→</span>
           <span className="text-slate-800 dark:text-white">Practice</span>
           <span className="text-slate-300">→</span>
           <span>Success</span>
        </div>
        
        {/* Primary CTA */}
        <button 
          onClick={() => onSignup()}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-5 rounded-full text-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl animate-slide-up mb-8"
          style={{ animationDelay: '0.2s' }}
        >
           Launch Universe Free
        </button>

        {/* Footer Note */}
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400 animate-slide-up" style={{ animationDelay: '0.3s' }}>
           Built for UPSC, NEET, JEE & UP Board with the <br/> world's most accurate AI patterns.
        </p>

        {/* Bottom Glow Effect (Matching screenshot) */}
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-brand-500/10 via-brand-500/5 to-transparent blur-[100px] rounded-full pointer-events-none -z-10"></div>
      </div>

      {/* Official Footer */}
      <footer className="w-full bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 px-6 mt-auto">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <LogoIcon size="sm" className="scale-75" />
               <span className="text-sm font-bold text-slate-900 dark:text-white">© 2025 PYQverse AI</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
               <button onClick={() => onNavigate('privacy')} className="hover:text-brand-500 transition-colors">Privacy Policy</button>
               <button onClick={() => onNavigate('terms')} className="hover:text-brand-500 transition-colors">Terms of Service</button>
               <a href="mailto:support@pyqverse.in" className="hover:text-brand-500 transition-colors">Contact Support</a>
            </div>
         </div>
      </footer>

    </div>
  );
};
