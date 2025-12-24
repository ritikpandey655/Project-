
import React from 'react';
import { Button } from './Button';
import { EXAM_SUBJECTS } from '../constants';
import { LogoIcon } from './LogoIcon';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup }) => {
  return (
    <div className="min-h-screen w-full bg-[#f8f9ff] dark:bg-[#0c0a1a] overflow-x-hidden">
      
      {/* Premium Navbar */}
      <nav className="fixed w-full z-50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <LogoIcon size="sm" />
              <span className="font-display font-black text-2xl text-slate-800 dark:text-white tracking-tighter">PYQverse</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLogin}
                className="text-slate-600 dark:text-slate-300 font-black text-sm hover:text-brand-purple transition-colors px-4 py-2"
              >
                Log In
              </button>
              <Button onClick={onSignup} size="md" className="hidden sm:inline-flex !bg-indigo-600 !rounded-full shadow-2xl shadow-indigo-500/20">
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Mirroring OneSpace layout */}
      <div className="relative pt-40 pb-20 sm:pt-52 sm:pb-32 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-100 dark:border-white/10 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-8 animate-slide-up">
            ✨ Next-Gen AI Exam Platform
          </div>

          <h1 className="text-6xl sm:text-8xl font-display font-black text-slate-900 dark:text-white mb-8 leading-[0.9] tracking-tighter animate-slide-up">
            Prepare Exams. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600">
               Instantly. AI Only.
            </span>
          </h1>
          
          <div className="flex justify-center items-center gap-4 text-slate-400 dark:text-slate-500 font-bold text-lg sm:text-2xl mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
             <span>Idea</span>
             <span className="text-indigo-500/40">→</span>
             <span className="text-slate-800 dark:text-slate-200">Practice</span>
             <span className="text-indigo-500/40">→</span>
             <span>Success</span>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button onClick={onSignup} size="lg" className="!bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 !px-10 !py-5 !rounded-full !text-xl font-black shadow-2xl transition-transform transform hover:scale-105 active:scale-95">
              Launch Universe Free
            </Button>
            <p className="text-slate-500 font-medium max-w-xs text-sm text-left hidden md:block">
              Built for UPSC, NEET, JEE & UP Board with the world's most accurate AI patterns.
            </p>
          </div>

          {/* Screenshot-like prompt bar for Landing Page */}
          <div className="mt-24 max-w-3xl mx-auto p-4 bg-white/40 dark:bg-white/5 backdrop-blur-3xl rounded-[32px] border border-white dark:border-white/10 shadow-2xl animate-pop-in" style={{ animationDelay: '0.4s' }}>
             <div className="w-full bg-white dark:bg-slate-900 rounded-[24px] p-6 text-left shadow-inner flex items-center justify-between border border-slate-100 dark:border-white/5">
                <span className="text-slate-400 font-medium">Ask PYQverse to solve any question...</span>
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                   ↑
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="py-20 border-t border-slate-200 dark:border-white/5">
         <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-8 sm:gap-16 grayscale opacity-40">
            {['UPSC', 'SSC', 'NEET', 'JEE', 'UP BOARD', 'RAILWAYS'].map(ex => (
              <span key={ex} className="font-display font-black text-2xl tracking-tighter dark:text-white">{ex}</span>
            ))}
         </div>
      </div>

      <div className="py-10 text-center text-[10px] text-slate-400 uppercase tracking-widest">
         © 2025 PYQverse AI • All Exams Ka Universe
      </div>
    </div>
  );
};
