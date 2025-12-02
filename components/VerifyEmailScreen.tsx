
import React, { useEffect, useState } from 'react';
import { auth } from '../src/firebaseConfig';
import { Button } from './Button';

interface VerifyEmailScreenProps {
  userEmail: string;
  onVerified: () => void;
  onLogout: () => void;
}

export const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({ userEmail, onVerified, onLogout }) => {
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Poll for verification status every 3 seconds
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload(); // Critical: Refresh token/user data from Firebase
        if (user.emailVerified) {
          clearInterval(interval);
          onVerified();
        }
      }
    }, 3000);

    // Resend countdown timer
    const countdown = setInterval(() => {
        setTimer(t => {
            if (t <= 1) {
                setCanResend(true);
                return 0;
            }
            return t - 1;
        });
    }, 1000);

    return () => {
        clearInterval(interval);
        clearInterval(countdown);
    };
  }, [onVerified]);

  const handleResend = async () => {
      if (auth.currentUser) {
          await auth.currentUser.sendEmailVerification();
          setCanResend(false);
          setTimer(60);
          alert("Verification email sent! Check your inbox.");
      }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl max-w-md w-full text-center border border-white/10 shadow-2xl relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-[-50%] left-[20%] w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="relative z-10">
                <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/30 relative">
                    <svg className="w-10 h-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {/* Pulse Animation */}
                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/50 animate-ping opacity-75"></div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 font-display">Verify Your Email</h2>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    We've sent a secure link to <br/>
                    <span className="text-white font-bold text-lg">{userEmail}</span>
                </p>
                
                <div className="bg-slate-800/60 p-4 rounded-xl mb-6 border border-white/5 flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">Waiting for you to click...</span>
                </div>

                <Button 
                    onClick={handleResend} 
                    disabled={!canResend} 
                    className={`w-full py-3 ${!canResend ? 'opacity-50 cursor-not-allowed bg-slate-700' : 'bg-white text-slate-900 hover:bg-slate-200'}`}
                >
                    {canResend ? 'Resend Email' : `Resend in ${timer}s`}
                </Button>
                
                <button 
                    onClick={onLogout} 
                    className="mt-6 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                    Change Email / Log Out
                </button>
            </div>
        </div>
    </div>
  );
};
