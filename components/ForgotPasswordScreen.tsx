import React, { useState } from 'react';
import { Button } from './Button';
import { auth } from '../src/firebaseConfig';
import { sendPasswordResetEmail } from "firebase/auth";

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
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError("No account found with this email.");
      else setError(err.message || "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
        {!isSent ? (
          <>
            <div className="text-center mb-8"><h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2><p className="text-orange-200/80 text-sm">Enter your email for a reset link.</p></div>
            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="name@example.com" />
              <Button type="submit" className="w-full py-3.5 font-bold text-lg bg-orange-600 text-white" isLoading={isLoading}>Send Link</Button>
            </form>
            <div className="mt-6 text-center"><button onClick={onBackToLogin} className="text-orange-300 text-sm font-bold">Back to Login</button></div>
          </>
        ) : (
          <div className="text-center py-4"><h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2><Button onClick={onBackToLogin} className="w-full py-3 bg-white/10 text-white mt-8">Back to Login</Button></div>
        )}
      </div>
    </div>
  );
};