
import React, { useState } from 'react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Simulate Google Login network delay
    setTimeout(() => {
      const mockUser: User = {
        id: 'user_student_local_001',
        name: 'Student User',
        email: 'student@example.com',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
      };
      onLogin(mockUser);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full relative bg-slate-900 flex flex-col items-center justify-between overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[120px] opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900 rounded-full blur-[150px] opacity-20"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto px-6 pt-12 pb-8">
        
        {/* Top Section: Logo & Title */}
        <div className={`flex flex-col items-center text-center transition-all duration-700 ${showLoginOptions ? 'mt-4 scale-90' : 'mt-20'}`}>
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-8 animate-fade-in-down">
            <span className="text-4xl">🎓</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
            ExamMaster <span className="text-indigo-400">AI</span>
          </h1>
          
          <p className="text-indigo-200 text-lg leading-relaxed max-w-xs mx-auto opacity-90">
            Master your competitive exams with AI-powered Previous Year Questions.
          </p>
        </div>

        {/* Middle Section: Attractive Owner Credit (Visible when not logging in) */}
        {!showLoginOptions && (
          <div className="flex-1 flex flex-col justify-center items-center animate-fade-in">
             <div className="group relative px-8 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden transition-all duration-300 hover:bg-white/10 hover:scale-105 cursor-default shadow-lg shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex flex-col items-center gap-1">
                <span className="text-[10px] tracking-[0.3em] text-indigo-300 uppercase font-semibold">Created By</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300 drop-shadow-sm font-serif tracking-wide">
                    Ritik Pandey
                  </span>
                  <span className="text-lg">✨</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section: Actions */}
        <div className="w-full mt-auto pt-10">
          {!showLoginOptions ? (
            <button
              onClick={() => setShowLoginOptions(true)}
              className="w-full group relative flex items-center justify-center gap-3 bg-white text-indigo-900 font-bold text-lg py-4 rounded-2xl shadow-xl shadow-indigo-900/20 hover:scale-[1.02] transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">Get Started</span>
              <svg className="w-5 h-5 text-indigo-600 group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-white text-xl font-bold">Sign In</h2>
                  <p className="text-indigo-200 text-sm">Continue your learning journey</p>
                </div>
                
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-indigo-50 text-slate-800 font-bold py-3.5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                       <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                       <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                       <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                       <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>
              </div>
              
              <button 
                onClick={() => setShowLoginOptions(false)}
                className="w-full text-indigo-300 text-sm hover:text-white py-2 transition-colors"
              >
                Go Back
              </button>
            </div>
          )}
        </div>

      </div>
      
      {/* Footer Copyright */}
      <div className="absolute bottom-2 text-[10px] text-white/20">
        © 2025 ExamMaster AI
      </div>
    </div>
  );
};
