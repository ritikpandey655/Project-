
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
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(interval);
          onVerified();
        }
      }
    }, 3000);
    const countdown = setInterval(() => {
        setTimer(t => {
            if (t <= 1) { setCanResend(true); return 0; }
            return t - 1;
        });
    }, 1000);
    return () => { clearInterval(interval); clearInterval(countdown); };
  }, [onVerified]);

  const handleResend = async () => {
      if (auth.currentUser) {
          await auth.currentUser.sendEmailVerification();
          setCanResend(false);
          setTimer(60);
          alert("Sent! Check inbox.");
      }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl max-w-md w-full text-center border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
            <p className="text-slate-300 text-sm mb-6">Link sent to: <span className="text-white font-bold">{userEmail}</span></p>
            <div className="bg-slate-800/60 p-4 rounded-xl mb-6 border border-white/5 flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-orange-400 text-xs font-bold uppercase">Waiting for verification...</span>
            </div>
            <Button onClick={handleResend} disabled={!canResend} className="w-full py-3">
                {canResend ? 'Resend Email' : `Resend in ${timer}s`}
            </Button>
            <button onClick={onLogout} className="mt-6 text-slate-400 text-sm">Log Out</button>
        </div>
    </div>
  );
};
