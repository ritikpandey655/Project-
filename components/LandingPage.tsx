import React, { useState } from 'react';
import { Button } from './Button';
import { LogoIcon } from './LogoIcon';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: (initialQuery?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup }) => {
  const [query, setQuery] = useState('');

  const handleSolve = () => {
    if (!query.trim()) return;
    onSignup(query);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 overflow-x-hidden text-white selection:bg-brand-500/30">
      
      {/* Sci-Fi Navbar */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2">
              <LogoIcon size="sm" />
              <span className="font-display font-black text-2xl text-white tracking-tighter">PYQverse</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onLogin}
                className="text-slate-300 font-bold text-sm hover:text-white transition-colors px-4 py-2"
              >
                Log In
              </button>
              <Button onClick={() => onSignup()} className="hidden sm:inline-flex shadow-[0_0_20px_rgba(79,70,229,0.4)] !bg-brand-600 hover:!bg-brand-500 border border-white/10">
                Start Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-16 sm:pt-48 sm:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-900/20 border border-brand-500/30 text-brand-400 text-[10px] font-black uppercase tracking-widest mb-6 animate-slide-up shadow-[0_0_10px_rgba(79,70,229,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
            India's Smartest Exam Universe
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-display font-black text-white mb-8 leading-[1] tracking-tighter animate-slide-up drop-shadow-2xl">
            Master Exams<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">With AI.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Personalized practice, instant visual doubt solving, and full-length mock tests for UPSC, NEET, JEE, and all Indian state board exams.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button onClick={() => onSignup()} size="lg" className="w-full sm:w-auto px-10 py-5 text-xl font-black rounded-full shadow-[0_0_30px_rgba(79,70,229,0.4)] !bg-brand-600 hover:!scale-105 transition-transform">
              Get Started Free
            </Button>
            <button onClick={onLogin} className="w-full sm:w-auto px-8 py-5 text-white font-bold hover:bg-white/5 rounded-full border border-white/10 transition-all backdrop-blur-sm">
              Login to Universe
            </button>
          </div>

          {/* Glowing Prompt Bar */}
          <div className="mt-20 max-w-2xl mx-auto p-1.5 bg-slate-900/80 backdrop-blur-xl rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-2 group animate-pop-in hover:border-brand-500/50 transition-colors" style={{ animationDelay: '0.4s' }}>
             <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-xl flex-shrink-0 ml-1 text-brand-400">🧠</div>
             <input 
               type="text" 
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSolve()}
               className="flex-1 bg-transparent border-none outline-none px-2 py-3 text-white font-bold placeholder-slate-500"
               placeholder="Type any topic... e.g. 'Newton's Laws'" 
             />
             <button 
               onClick={handleSolve}
               className="px-8 py-3 rounded-full bg-white text-brand-900 font-black text-sm shadow-lg hover:bg-slate-200 transition-all flex-shrink-0"
             >
                SOLVE
             </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights (Dark) */}
      <div className="py-20 border-t border-white/5 bg-slate-900/30">
         <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm">
               <div className="text-4xl mb-6">🤖</div>
               <h3 className="text-xl font-black text-white mb-2">Adaptive AI Practice</h3>
               <p className="text-slate-400 text-sm font-medium leading-relaxed">Questions that evolve with your learning level for maximum efficiency.</p>
            </div>
            <div className="p-8 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm">
               <div className="text-4xl mb-6">📸</div>
               <h3 className="text-xl font-black text-white mb-2">Visual Doubt Solver</h3>
               <p className="text-slate-400 text-sm font-medium leading-relaxed">Scan handwritten notes or textbook pages for instant step-by-step solutions.</p>
            </div>
            <div className="p-8 bg-white/5 rounded-[32px] border border-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm">
               <div className="text-4xl mb-6">📈</div>
               <h3 className="text-xl font-black text-white mb-2">Smart Analytics</h3>
               <p className="text-slate-400 text-sm font-medium leading-relaxed">Deep insights into your strong and weak topics with AI recommendations.</p>
            </div>
         </div>
      </div>

      <div className="py-10 text-center text-[10px] text-slate-600 uppercase tracking-widest font-bold">
         © 2025 PYQverse • Accelerating India's Learners
      </div>
    </div>
  );
};