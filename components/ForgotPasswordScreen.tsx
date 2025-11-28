
import React, { useState } from 'react';
import { Button } from './Button';
import { auth } from '../src/firebaseConfig';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await auth.sendPasswordResetEmail(email);
      setIsSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Failed to send reset link.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
        
        {!isSent ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 16.464a2 2 0 01-.943.586l-3.536.707 1.06-3.536a2 2 0 01.586-.943L17.657 10.257A6 6 0 0121 12a6 6 0 01-12 0v-.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
              <p className="text-indigo-200 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-900/30 p-2 rounded">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1 ml-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-3.5 font-bold text-lg shadow-xl shadow-indigo-900/20"
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={onBackToLogin}
                className="text-indigo-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 animate-fade-in">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
            <p className="text-indigo-200 text-sm mb-8">
              We have sent a password reset link to <br/>
              <span className="text-white font-medium">{email}</span>
            </p>
            
            <Button 
              onClick={onBackToLogin}
              className="w-full py-3"
              variant="secondary"
            >
              Back to Login
            </Button>
            
            <p className="text-xs text-indigo-300 mt-6">
              Didn't receive the email? <button onClick={() => { setIsSent(false); handleSubmit({ preventDefault: ()=>{} } as any); }} className="text-white hover:underline">Click to resend</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
