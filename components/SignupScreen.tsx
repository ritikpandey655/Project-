
import React, { useState, useEffect } from 'react';
import { User, ExamType } from '../types';
import { Button } from './Button';
import { auth, db } from '../src/firebaseConfig';
import { doc, setDoc } from "firebase/firestore";
import { getExamConfig } from '../services/storageService';
import { EXAM_SUBJECTS } from '../constants';
import { LogoIcon } from './LogoIcon';

interface SignupScreenProps {
  onSignup: (user: User, selectedExam: ExamType) => void;
  onBackToLogin: () => void;
  onNavigateToPrivacy?: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onSignup, onBackToLogin, onNavigateToPrivacy }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('UPSC');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [availableExams, setAvailableExams] = useState<string[]>(Object.keys(EXAM_SUBJECTS));
  
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  useEffect(() => {
    getExamConfig().then(config => {
        const exams = Object.keys(config);
        if(exams.length > 0) {
            setAvailableExams(exams);
            if (!exams.includes(selectedExam)) setSelectedExam(exams[0]);
        }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    
    setIsLoading(true);
    setLoadingText('Creating Account...');
    setError('');

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
          setLoadingText('Setting up Profile...');
          await firebaseUser.updateProfile({ displayName: name });

          const lowerEmail = email.toLowerCase().trim();
          const isAdmin = lowerEmail === 'support@pyqverse.in' || lowerEmail === 'admin@pyqverse.com';

          const newUser: User = {
            id: firebaseUser.uid,
            name: name,
            email: email,
            photoURL: null, 
            isAdmin: isAdmin 
          };
          
          try {
            await setDoc(doc(db, "users", firebaseUser.uid), newUser, { merge: true });
            await setDoc(doc(db, "users", firebaseUser.uid, "data", "prefs"), { selectedExam }, { merge: true });
          } catch (dbError) {
            console.warn("Firestore profile creation failed", dbError);
          }

          setLoadingText('Sending Verification Link...');
          await firebaseUser.sendEmailVerification();
          setIsVerificationSent(true);
      }

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Account already exists with this email. Please Log In.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerificationSent) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4">
         <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[40px] max-w-md w-full text-center border border-white/5 shadow-2xl animate-pop-in">
            <div className="mb-8 flex justify-center">
               <LogoIcon size="md" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3 font-display tracking-tight">Check Your Inbox!</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">
               A verification link is on its way to:<br/>
               <span className="text-indigo-400 font-black text-lg">{email}</span>
            </p>
            <Button onClick={onBackToLogin} className="w-full !py-4 !bg-white/10 !text-white !rounded-2xl border-0 font-black hover:bg-white/20">
               Back to Login
            </Button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-[#0a0814] to-black flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[15%] right-[10%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px]"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 shadow-2xl relative z-10 animate-fade-in flex flex-col my-8">
        
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <LogoIcon size="md" />
          </div>
          <h2 className="text-3xl font-display font-black text-white mb-1 tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-sm font-medium">Join the largest exam universe.</p>
        </div>

        {error && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-200 text-xs font-bold text-center animate-shake">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Full Name</label>
            <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-indigo-500 placeholder-slate-700 transition-all font-bold"
                placeholder="Rahul Kumar" 
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Email Address</label>
            <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-indigo-500 placeholder-slate-700 transition-all font-bold"
                placeholder="name@example.com" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Password</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-indigo-500 placeholder-slate-700 transition-all font-bold"
                placeholder="••••••" 
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Confirm</label>
              <input 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-indigo-500 placeholder-slate-700 transition-all font-bold"
                placeholder="••••••" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Target Exam</label>
            <select 
                value={selectedExam} 
                onChange={(e) => setSelectedExam(e.target.value)} 
                className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
            >
                {availableExams.map((exam) => (<option key={exam} value={exam} className="text-slate-900">{exam}</option>))}
            </select>
          </div>

          <Button 
            type="submit" 
            isLoading={isLoading}
            className="w-full py-5 mt-4 !rounded-2xl !bg-indigo-600 !text-white !font-black !text-lg !shadow-2xl !shadow-indigo-600/30 !border-0 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? loadingText || 'Creating...' : 'Launch Universe'}
          </Button>
        </form>

        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-sm text-slate-500 font-bold">Already have an account? <button onClick={onBackToLogin} className="text-indigo-400 hover:text-white transition-colors ml-1">Log In</button></p>
        </div>
      </div>

      {/* FOOTER LINKS - Restored as requested */}
      <div className="max-w-md w-full px-4 mt-4 flex flex-col items-center gap-4 opacity-40 z-10 pb-8">
         <div className="flex items-center gap-6">
            <button onClick={onNavigateToPrivacy} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">Privacy Policy</button>
            <a href="mailto:support@pyqverse.in" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">Contact Support</a>
         </div>
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">© 2025 PYQverse AI</p>
      </div>
    </div>
  );
};
