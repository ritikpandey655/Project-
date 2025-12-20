
import React from 'react';
import { Button } from './Button';
import { EXAM_SUBJECTS } from '../constants';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup }) => {
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white font-bold font-display shadow-lg">PV</div>
              <span className="font-display font-bold text-xl text-slate-800 dark:text-white">PYQverse</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLogin}
                className="text-slate-600 dark:text-slate-300 font-bold text-sm hover:text-brand-purple transition-colors"
              >
                Log In
              </button>
              <Button onClick={onSignup} size="sm" className="hidden sm:inline-flex shadow-lg shadow-brand-purple/20">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        {/* Decorative Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <h1 className="text-5xl sm:text-7xl font-display font-extrabold text-slate-900 dark:text-white mb-6 leading-tight animate-slide-up">
            All exams ka <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-blue relative">
               pura universe
               <svg className="absolute w-full h-3 -bottom-1 left-0 text-brand-yellow opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                 <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
               </svg>
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Master UPSC, SSC, JEE, NEET, and <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1 rounded">UP Board</span> with AI-powered Previous Year Questions, Mock Tests, and Smart Analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button onClick={onSignup} size="lg" className="!bg-brand-purple hover:!bg-brand-purple/90 text-white shadow-xl shadow-indigo-500/30 transition-all transform hover:scale-105">
              Start Practicing Free
            </Button>
            <button 
              onClick={onLogin}
              className="px-8 py-3.5 rounded-xl font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Log In
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20 bg-white dark:bg-slate-800 border-y border-slate-100 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-4">Why choose PYQverse?</h2>
              <p className="text-slate-500 dark:text-slate-400">Everything you need to crack your dream exam.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-shadow group">
                 <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                    🤖
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AI Exam Pilot</h3>
                 <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Generate unlimited mock questions based on real exam patterns. Never run out of practice material.
                 </p>
              </div>

              {/* Card 2 */}
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-shadow group">
                 <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                    📸
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Instant Doubt Solver</h3>
                 <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Stuck on a question? Snap a photo or type it out. Our AI explains the solution step-by-step instantly.
                 </p>
              </div>

              {/* Card 3 */}
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-shadow group">
                 <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                    📊
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Smart Analytics</h3>
                 <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Track your weak areas, accuracy, and speed. Get personalized insights to improve your score.
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* Exams Marquee */}
      <div className="py-12 overflow-hidden bg-slate-50 dark:bg-slate-900">
         <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Covering Top Exams</p>
         <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto px-4">
            {Object.keys(EXAM_SUBJECTS).map((exam) => (
               <div key={exam} className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:border-brand-purple hover:text-brand-purple transition-colors cursor-default">
                  {exam}
               </div>
            ))}
         </div>
      </div>

      {/* Footer CTA */}
      <div className="py-20 bg-slate-900 text-white text-center px-4">
         <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-display font-bold mb-6">Ready to enter the universe?</h2>
            <p className="text-slate-400 mb-8">Join thousands of aspirants preparing smarter, not harder.</p>
            <Button onClick={onSignup} size="lg" className="!bg-white !text-slate-900 hover:!bg-slate-100">
               Get Started Now
            </Button>
            <p className="mt-8 text-xs text-slate-600">© 2025 PYQverse. All rights reserved.</p>
         </div>
      </div>

    </div>
  );
};
