
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
    <div className="min-h-screen w-full relative overflow-x-hidden text-slate-900 dark:text-white flex flex-col">
      
      {/* Dedicated Background to Prevent Blank Screen */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#1e1b4b] to-slate-950 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Modern Clean Navbar */}
      <nav className="fixed w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <LogoIcon size="sm" className="scale-90" />
              <span className="font-display font-black text-2xl tracking-tighter text-white">PYQverse</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLogin}
                className="text-slate-300 font-bold text-sm hover:text-white transition-colors"
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
      <div className="relative pt-28 pb-12 sm:pt-48 sm:pb-32 flex flex-col items-center text-center px-4 flex-1 overflow-hidden z-10">
        
        {/* Massive Headline */}
        <h1 className="max-w-5xl text-5xl sm:text-7xl lg:text-9xl font-display font-black text-white mb-6 leading-[0.95] tracking-tighter animate-slide-up">
          Prepare <span className="text-gold-gradient drop-shadow-sm">2026 Exams.</span><br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Instantly. AI Only.</span>
        </h1>
        
        {/* Subtext Flow */}
        <div className="flex items-center gap-4 text-xl sm:text-2xl font-bold text-slate-400 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
           <span>Idea</span>
           <span className="text-slate-600">→</span>
           <span className="text-white">Practice</span>
           <span className="text-slate-600">→</span>
           <span>Success</span>
        </div>
        
        {/* Primary CTA */}
        <button 
          onClick={() => onSignup()}
          className="bg-white text-slate-900 px-10 py-5 rounded-full text-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-slide-up mb-8 relative overflow-hidden group"
          style={{ animationDelay: '0.2s' }}
        >
           <span className="relative z-10">Launch 2026 Universe 🚀</span>
           <div className="absolute inset-0 bg-gradient-to-r from-brand-400/0 via-brand-400/30 to-brand-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>

        {/* Footer Note */}
        <p className="mt-4 text-sm font-medium text-slate-400 animate-slide-up" style={{ animationDelay: '0.3s' }}>
           Updated for UPSC, NEET, JEE & UP Board <span className="text-yellow-500 font-bold">2026 Patterns</span>.
        </p>
      </div>

      {/* Official Footer */}
      <footer className="w-full bg-slate-950/50 border-t border-white/5 py-12 px-6 mt-auto relative z-10 backdrop-blur-sm">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <LogoIcon size="sm" className="scale-75" />
               <span className="text-sm font-bold text-white">© 2026 PYQverse AI</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
               <button onClick={() => onNavigate('privacy')} className="hover:text-brand-500 transition-colors">Privacy Policy</button>
               <button onClick={() => onNavigate('terms')} className="hover:text-brand-500 transition-colors">Terms of Service</button>
               <a href="mailto:support@pyqverse.in" className="hover:text-brand-500 transition-colors">Contact Support</a>
            </div>
         </div>
      </footer>

    </div>
  );
};
