
import React, { useState } from 'react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToSignup, onForgotPassword }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    // Simulate Auth API call
    setTimeout(() => {
      const mockUser: User = {
        id: `user_${Date.now()}`,
        name: email.split('@')[0], // Use part of email as name for demo
        email: email,
        // No photo for email login initially
      };
      onLogin(mockUser);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full relative bg-slate-900 flex flex-col items-center justify-between overflow-hidden font-sans selection:bg-indigo-500 selection:text-white overflow-y-auto">
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-scale-in {
          animation: scaleIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-title-enter {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.2s forwards;
        }
        .animate-subtitle-enter {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out 0.4s forwards;
        }
        .animate-fade-in {
          opacity: 0;
          animation: fadeInUp 1s ease-out 0.6s forwards;
        }
        .animate-blob {
          animation: pulseGlow 8s ease-in-out infinite;
        }
      `}</style>

      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[120px] animate-blob" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900 rounded-full blur-[150px] opacity-20 animate-blob" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-md mx-auto px-6 pt-12 pb-8">
        
        {/* Top Section: Logo & Title */}
        <div className={`flex flex-col items-center text-center transition-all duration-700 ${showLoginOptions ? 'mt-4 scale-90' : 'mt-20'}`}>
          
          {/* Logo Container with Scale In */}
          <div className="animate-scale-in">
            <div className="animate-float w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-8 border border-white/10 backdrop-blur-sm">
              <span className="text-5xl filter drop-shadow-md">🎓</span>
            </div>
          </div>
          
          <h1 className="animate-title-enter text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
            ExamMaster <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">AI</span>
          </h1>
          
          <p className="animate-subtitle-enter text-indigo-200 text-lg leading-relaxed max-w-xs mx-auto opacity-90 font-medium">
            Your personalized AI tutor for <br/> competitive exam success.
          </p>
        </div>

        {/* Spacer to push content down */}
        <div className="flex-1"></div>

        {/* Bottom Section: Actions */}
        <div className="w-full mt-auto pt-6 mb-8">
          {!showLoginOptions ? (
            <button
              onClick={() => setShowLoginOptions(true)}
              className="animate-fade-in w-full group relative flex items-center justify-center gap-3 bg-white text-indigo-900 font-bold text-lg py-4 rounded-2xl shadow-xl shadow-indigo-900/20 hover:scale-[1.02] transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">Get Started</span>
              <svg className="w-5 h-5 text-indigo-600 group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-white text-xl font-bold">Welcome Back</h2>
                  <p className="text-indigo-200 text-sm">Sign in to continue</p>
                </div>
                
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div>
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    />
                  </div>
                  
                  <div className="text-right">
                    <button 
                      type="button" 
                      onClick={onForgotPassword}
                      className="text-xs text-indigo-300 hover:text-white transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/30 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-4">
                   <div className="h-px bg-white/10 flex-1"></div>
                   <span className="text-[10px] text-indigo-200 uppercase tracking-wide">OR</span>
                   <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-indigo-50 text-slate-800 font-bold py-3 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                     <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                     <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                     <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                     <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Google</span>
                </button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-indigo-200">
                    Don't have an account?{' '}
                    <button 
                      onClick={onNavigateToSignup}
                      className="text-white font-bold hover:underline"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
