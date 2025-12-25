import React, { useState } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from './Button';
import { LogoIcon } from './LogoIcon';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
  isOnline?: boolean;
  isInitializing?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  onNavigateToSignup, 
  onForgotPassword,
  onNavigateToPrivacy,
  onNavigateToTerms,
  isOnline = true, 
  isInitializing = false 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const syncUserToDB = async (firebaseUser: any) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const userEmail = firebaseUser.email || "";
      const rawName = firebaseUser.displayName || "User"; 
      const emailToCheck = userEmail.toLowerCase();
      const isAdmin = emailToCheck === 'support@pyqverse.in' || emailToCheck === 'admin@pyqverse.com';

      const safeData = {
        id: firebaseUser.uid,
        name: rawName,
        email: userEmail,
        isAdmin: !!isAdmin 
      };

      if (userSnap.exists()) return userSnap.data() as User;
      else {
        await setDoc(userRef, safeData);
        return safeData as User;
      }
    } catch (e) {
      return { id: firebaseUser.uid, name: firebaseUser.displayName || "User", email: firebaseUser.email || "", isAdmin: false } as User;
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return alert("⚠️ No Internet Connection");
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        const user = await syncUserToDB(result.user);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Login Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isOnline) return alert("⚠️ No Internet Connection");
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
         const user = await syncUserToDB(result.user);
         onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign In Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between overflow-y-auto">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 border border-white/5 flex flex-col items-center animate-fade-in relative overflow-hidden">
          
          {/* Glow Effects */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-40 h-40 bg-brand-500/20 rounded-full blur-3xl"></div>

          <div className="mb-6 relative z-10"><LogoIcon size="md" /></div>
          
          <div className="text-center mb-8 relative z-10">
              <h1 className="text-3xl font-display font-black text-white mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-slate-400 text-sm">Enter the exam universe.</p>
          </div>
          
          <div className="w-full space-y-6 relative z-10">
              {error && <div className="p-3 bg-red-900/30 text-red-300 text-xs font-bold rounded-xl text-center border border-red-500/30">{error}</div>}
              
              <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Coordinates</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-brand-500 focus:bg-white/10 transition-all font-bold" placeholder="name@example.com" required />
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                          <button 
                              type="button" 
                              onClick={onForgotPassword}
                              className="text-[10px] font-bold text-brand-400 hover:underline"
                          >
                              Forgot?
                          </button>
                      </div>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-brand-500 focus:bg-white/10 transition-all font-bold" placeholder="••••••••" required />
                  </div>
                  <Button type="submit" isLoading={isLoading} className="w-full py-4 text-lg font-black shadow-lg shadow-brand-500/20 !rounded-2xl !bg-brand-600 hover:!bg-brand-500">Sign In</Button>
              </form>
              
              <div className="flex items-center gap-4 py-2"><div className="h-px bg-white/5 flex-1"></div><span className="text-[10px] font-black text-slate-600 uppercase">Or Continue With</span><div className="h-px bg-white/5 flex-1"></div></div>
              
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all group">
                  <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Google</span>
              </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 text-center w-full relative z-10">
              <p className="text-sm text-slate-500 font-medium">New Explorer? <button onClick={onNavigateToSignup} className="text-brand-400 font-bold hover:text-brand-300 transition-colors">Create Account</button></p>
          </div>
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