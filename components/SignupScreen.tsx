
import React, { useState } from 'react';
import { User, ExamType } from '../types';
import { Button } from './Button';
import { auth, db } from '../src/firebaseConfig';

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
      setError("Passwords do not match!");
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
      const lowerEmail = email.toLowerCase().trim();
      
      // Admin Logic: Automatically make support@pyqverse.in an Admin
      // (Hidden from UI now as requested)
      const isAdmin = lowerEmail === 'support@pyqverse.in' ||
                      lowerEmail === 'admin@pyqverse.com';

      const newUser: User = {
        id: firebaseUser ? firebaseUser.uid : 'temp-id',
        name: name,
        email: email,
        photoURL: null, 
        isAdmin: isAdmin 
      };
      
      if (firebaseUser) {
        await db.collection("users").doc(firebaseUser.uid).set(newUser);
      }

      // 4. Save Preference immediately
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
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-[#1c120e] to-black flex flex-col items-center justify-center p-4 relative overflow-hidden overflow-y-auto">
      
      {/* Background Particles - Warm/Sunset Tones */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[15%] right-[10%] w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-red-600/10 rounded-full blur-[80px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in flex flex-col my-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 mb-4">
             <span className="text-white font-bold font-display text-xl">PV</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-1">Create Account</h2>
          <p className="text-slate-400 text-sm">Start your preparation journey with PYQverse</p>
        </div>

        {error && (
            <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-center font-medium animate-shake">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase ml-1">Full Name</label>
            <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600 tracking-wide"
                placeholder="e.g. Rahul Kumar" 
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase ml-1">Email Address</label>
            <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600 tracking-wide"
                placeholder="name@example.com" 
            />
          </div>

          {/* Passwords Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600"
                  placeholder="••••••" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase ml-1">Confirm</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600"
                  placeholder="••••••" 
                />
              </div>
            </div>
          </div>

          {/* Exam Selection */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase ml-1">Target Exam</label>
            <div className="relative">
                <select 
                    value={selectedExam} 
                    onChange={(e) => setSelectedExam(e.target.value as ExamType)} 
                    className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium appearance-none cursor-pointer"
                >
                    {Object.values(ExamType).map((exam) => (<option key={exam} value={exam} className="text-slate-900 bg-white">{exam}</option>))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
          </div>

          <Button 
            type="submit" 
            isLoading={isLoading}
            className="w-full py-4 mt-2 text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/50 border-0 rounded-xl transition-transform active:scale-[0.98]"
          >
            Create Account
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-slate-400">Already have an account? <button onClick={onBackToLogin} className="text-white font-bold hover:text-orange-400 transition-colors ml-1">Log In</button></p>
        </div>
      </div>
      
      {/* Professional Footer */}
      <div className="relative z-10 text-center space-y-1 opacity-50 pb-4">
         <p className="text-[10px] text-slate-600">
            © 2025 PYQverse. All rights reserved.
         </p>
      </div>
    </div>
  );
};
