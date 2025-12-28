
import React, { useState, useEffect } from 'react';
import { User, ExamType } from '../types';
import { Button } from './Button';
import { auth, db } from '../src/firebaseConfig';
import { getExamConfig } from '../services/storageService';
import { EXAM_SUBJECTS } from '../constants';
import { LogoIcon } from './LogoIcon';

interface SignupScreenProps {
  onSignup: (user: User, selectedExam: ExamType) => void;
  onBackToLogin: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ 
  onSignup, 
  onBackToLogin, 
  onNavigateToPrivacy, 
  onNavigateToTerms 
}) => {
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
    if (password !== confirmPassword) { setError("Passwords do not match!"); return; }
    setIsLoading(true);
    setLoadingText('Creating Account...');
    setError('');
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
          setLoadingText('Setting up Profile...');
          await firebaseUser.updateProfile({ displayName: name });
          const isAdmin = email.toLowerCase() === 'support@pyqverse.in';
          const newUser: User = { id: firebaseUser.uid, name, email, isAdmin };
          await db.collection("users").doc(firebaseUser.uid).set(newUser, { merge: true });
          await db.collection("users").doc(firebaseUser.uid).collection("data").doc("prefs").set({ selectedExam }, { merge: true });
          setLoadingText('Sending Verification Link...');
          await firebaseUser.sendEmailVerification();
          setIsVerificationSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerificationSent) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4">
         <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[40px] max-w-md w-full text-center border border-white/5 shadow-2xl animate-pop-in">
            <div className="mb-8 flex justify-center"><LogoIcon size="md" /></div>
            <h2 className="text-3xl font-black text-white mb-3 font-display">Check Your Inbox!</h2>
            <p className="text-slate-400 text-sm mb-8">Verification sent to: <span className="text-brand-400 font-black">{email}</span></p>
            <Button onClick={onBackToLogin} className="w-full !py-4 !bg-white/10 !text-white !rounded-2xl border-0 font-black">Back to Login</Button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-[#0a0814] to-black flex flex-col justify-between overflow-y-auto">
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 shadow-2xl relative z-10 animate-fade-in flex flex-col my-8">
          <div className="text-center mb-10"><div className="flex justify-center mb-6"><LogoIcon size="md" /></div><h2 className="text-3xl font-display font-black text-white mb-1">Create Account</h2></div>
          {error && <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-200 text-xs font-bold text-center">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-brand-500 font-bold" placeholder="Full Name" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-brand-500 font-bold" placeholder="Email" />
            <div className="grid grid-cols-2 gap-4">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-brand-500 font-bold" placeholder="Password" />
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-brand-500 font-bold" placeholder="Confirm" />
            </div>
            <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-brand-500 font-bold appearance-none cursor-pointer">
                {availableExams.map((exam) => (<option key={exam} value={exam} className="text-slate-900">{exam}</option>))}
            </select>
            <Button type="submit" isLoading={isLoading} className="w-full py-5 mt-4 !rounded-2xl !bg-brand-600 !text-white !font-black !text-lg shadow-2xl">{isLoading ? loadingText : 'Launch Universe'}</Button>
          </form>
          <div className="mt-10 pt-6 border-t border-white/5 text-center"><p className="text-sm text-slate-500 font-bold">Have an account? <button onClick={onBackToLogin} className="text-brand-400">Log In</button></p></div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full py-6 text-center border-t border-white/5">
         <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">© 2025 PYQverse AI</p>
         <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500">
            <button onClick={onNavigateToPrivacy} className="hover:text-brand-400 transition-colors">Privacy Policy</button>
            <button onClick={onNavigateToTerms} className="hover:text-brand-400 transition-colors">Terms of Service</button>
            <span>•</span>
            <a href="mailto:support@pyqverse.in" className="hover:text-brand-400 transition-colors">Contact Support</a>
         </div>
      </div>
    </div>
  );
};
