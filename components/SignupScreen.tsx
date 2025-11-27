
import React, { useState } from 'react';
import { User, ExamType } from '../types';
import { Button } from './Button';
import { auth, db } from '../src/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Update Profile Display Name
      await updateProfile(firebaseUser, { displayName: name });

      // 3. Create Firestore User Doc
      // Allow Admin access if email matches specific ID OR if Name contains "Admin"
      const isAdmin = email === 'admin@pyqverse.com' || 
                      email === 'ritikpandey655@gmail.com' ||
                      name.toLowerCase().includes('admin');

      const newUser: User = {
        id: firebaseUser.uid,
        name: name,
        email: email,
        photoURL: undefined, // Or default
        isAdmin: isAdmin 
      };

      await setDoc(doc(db, "users", firebaseUser.uid), newUser);

      // 4. Save Preference immediately (handled in App.tsx typically, but safe to pass here)
      onSignup(newUser, selectedExam);

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already exists. Please login.');
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#111827] flex items-center justify-center p-4 font-sans relative overflow-hidden overflow-y-auto">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in my-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-white mb-2">Create Account</h2>
          <p className="text-indigo-200 text-sm">Join the PYQverse</p>
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-900/30 p-2 rounded">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                    {showPassword ? "Hide" : "Show"}
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
                    {showConfirmPassword ? "Hide" : "Show"}
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
