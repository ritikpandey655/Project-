
import React, { useState } from 'react';
import { User, ExamType } from '../types';
import { Button } from './Button';
import { auth, db } from '../src/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

interface SignupScreenProps {
  onSignup: (user: User, selectedExam: ExamType) => void;
  onBackToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onSignup, onBackToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamType>(ExamType.UPSC);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      // 1. Create Auth User
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;

      // 2. Update Profile Display Name
      if (firebaseUser) {
          await firebaseUser.updateProfile({ displayName: name });
      }

      // 3. Create Firestore User Doc
      // Allow Admin access if email matches specific ID OR if Name contains "Admin" (Case Insensitive)
      const lowerEmail = email.toLowerCase().trim();
      const lowerName = name.toLowerCase().trim();
      
      const isAdmin = lowerEmail === 'admin@pyqverse.com' || 
                      lowerName.includes('admin');

      const newUser: User = {
        id: firebaseUser ? firebaseUser.uid : 'temp-id',
        name: name,
        email: email,
        // CRITICAL FIX: Ensure this is null, NOT undefined. Firestore crashes on undefined.
        photoURL: null, 
        isAdmin: isAdmin 
      };
      
      if (firebaseUser) {
        await db.collection("users").doc(firebaseUser.uid).set(newUser);
      }

      // 4. Save Preference immediately (handled in App.tsx typically, but safe to pass here)
      onSignup(newUser, selectedExam);

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already exists. Please login.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#111827] flex items-center justify-center p-0 sm:p-4 font-sans relative overflow-hidden overflow-y-auto">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border-0 sm:border border-white/10 sm:rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-fade-in min-h-screen sm:min-h-0 flex flex-col justify-center">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-3xl font-display font-bold text-white mb-2">Create Account</h2>
          <p className="text-indigo-200 text-sm">Join the PYQverse</p>
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-900/30 p-2 rounded">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-indigo-200 mb-1 ml-1">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-purple text-sm" placeholder="e.g. Admin Rahul (for Admin Access)" />
              <p className="text-[10px] text-indigo-300 ml-1 mt-1">Tip: Include "Admin" in name to get Admin Panel access.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-indigo-200 mb-1 ml-1">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-purple text-sm" placeholder="john@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1 ml-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-purple text-sm pr-8" 
                    placeholder="••••" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white">
                    {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1 ml-1">Confirm</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-purple text-sm pr-8" 
                    placeholder="••••" 
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white">
                    {showConfirmPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-indigo-200 mb-1 ml-1">Target Exam</label>
              <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value as ExamType)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-purple text-sm [&>option]:text-slate-900">
                {Object.values(ExamType).map((exam) => (<option key={exam} value={exam}>{exam}</option>))}
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full py-3.5 mt-4 font-bold font-display text-lg shadow-xl shadow-brand-purple/20 bg-brand-purple hover:bg-[#4a25cf]" isLoading={isLoading}>
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-indigo-200">Already have an account? <button onClick={onBackToLogin} className="text-white font-bold hover:underline">Log In</button></p>
        </div>
      </div>
    </div>
  );
};
