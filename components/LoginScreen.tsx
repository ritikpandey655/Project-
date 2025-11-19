
import React, { useState } from 'react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Simulate Google Login network delay
    setTimeout(() => {
      // Use a consistent ID so local data persists across logouts for the demo user
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
    <div className="min-h-screen w-full flex bg-white overflow-hidden font-sans">
      {/* Left Side - Branding & Value Prop (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-[55%] bg-indigo-900 relative overflow-hidden flex-col justify-between p-16 text-white">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[120px] opacity-40"></div>
          <div className="absolute bottom-[-10%] left-[-20%] w-[600px] h-[600px] bg-purple-600 rounded-full blur-[120px] opacity-40"></div>
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-xl border border-white/20 shadow-lg">
            🎓
          </div>
          <span className="font-bold text-xl tracking-wide">ExamMaster AI</span>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-8">
          <h1 className="text-5xl xl:text-6xl font-bold leading-tight">
            Crack your exams <br/>
            with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">AI Precision</span>
          </h1>
          <p className="text-indigo-100 text-lg max-w-lg leading-relaxed opacity-90">
            The intelligent platform that combines previous year questions with your personal revision notes using spaced repetition.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-800/50 flex items-center justify-center text-indigo-200 border border-indigo-700/50">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">AI-Powered PYQs</h3>
                <p className="text-sm text-indigo-300">Unlimited practice based on real exam patterns</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-800/50 flex items-center justify-center text-purple-200 border border-purple-700/50">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">Smart Revision</h3>
                <p className="text-sm text-indigo-300">Spaced repetition for your personal notes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="relative z-10 pt-8 border-t border-white/10">
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-indigo-200 italic font-medium">"This app completely changed how I revise for SSC CGL. The AI questions are spot on!"</p>
          <p className="text-indigo-400 text-sm mt-2">— Priya S., Future Inspector</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 sm:p-12 relative bg-white">
         
         {/* Mobile Header Logo */}
         <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">E</div>
            <span className="font-bold text-slate-800">ExamMaster</span>
         </div>

         <div className="w-full max-w-[400px] animate-fade-in-up">
            <div className="mb-10">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Welcome back</h2>
                <p className="text-slate-500 text-lg">Please sign in to access your personalized dashboard.</p>
            </div>

            <div className="space-y-6">
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 text-slate-700 font-medium h-14 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                             <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                             <span className="text-indigo-600">Signing in...</span>
                        </div>
                    ) : (
                        <>
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-lg font-medium">Sign in with Google</span>
                        </>
                    )}
                </button>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>
                
                <form className="space-y-4 opacity-60 pointer-events-none grayscale" aria-disabled="true">
                     {/* Disabled inputs to show UI structure but encourage Google Sign In */}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                        <input type="email" disabled className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500" placeholder="name@example.com" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input type="password" disabled className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500" placeholder="••••••••" />
                     </div>
                     <button disabled className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium opacity-70">
                        Sign In
                     </button>
                </form>
                <p className="text-center text-xs text-slate-400">
                    (Email login is currently disabled. Please use Google Sign In)
                </p>

            </div>

            <div className="mt-10 text-center">
                 <p className="text-xs text-slate-400">
                    By continuing, you agree to our <span className="underline cursor-pointer hover:text-indigo-600">Terms of Service</span> and <span className="underline cursor-pointer hover:text-indigo-600">Privacy Policy</span>.
                 </p>
            </div>
         </div>
      </div>
    </div>
  );
};
