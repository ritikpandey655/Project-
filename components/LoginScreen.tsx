
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from './Button';
import { LogoIcon } from './LogoIcon';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  onNavigateToPrivacy?: () => void;
  isOnline?: boolean;
  isInitializing?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  onNavigateToSignup, 
  onForgotPassword, 
  onNavigateToPrivacy,
  isOnline = true, 
  isInitializing = false 
}) => {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoClicks, setLogoClicks] = useState(0);

  useEffect(() => {
    if (logoClicks >= 5) {
       setLogoClicks(0);
       alert("Admin Mode activated.");
    }
  }, [logoClicks]);

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
        mobile: firebaseUser.phoneNumber || null,
        photoURL: firebaseUser.photoURL || null,
        isAdmin: !!isAdmin 
      };

      if (userSnap.exists()) {
        return userSnap.data() as User;
      } else {
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
      const result = await auth.signInWithEmailAndPassword(email, password);
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
      const result = await auth.signInWithPopup(googleProvider);
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

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0c0a1a] flex flex-col items-center justify-center overflow-hidden">
         <div className="absolute inset-0">
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>
         </div>
         <LogoIcon size="lg" />
         <div className="relative z-10 text-center mt-12 animate-fade-in">
            <h1 className="text-4xl font-display font-bold text-white tracking-tight">PYQverse</h1>
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.3em] mt-3">All Exams Ka Universe</p>
         </div>
         <div className="absolute bottom-12 text-slate-500 text-[10px] font-mono z-10 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
            <span>Initializing Universe...</span>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-[#0a0814] to-black flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] bg-pink-600/5 rounded-full blur-[80px]"></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-3xl rounded-[40px] shadow-2xl p-10 border border-white/5 flex flex-col items-center z-10 my-8 animate-pop-in">
        
        <div className="cursor-pointer active:scale-95 transition-transform mb-8" onClick={() => setLogoClicks(p => p+1)}>
            <LogoIcon size="md" />
        </div>
        
        <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-black text-white tracking-tight mb-1">Welcome Back</h1>
            <p className="text-slate-400 text-sm font-medium">Login to access your universe.</p>
        </div>
        
        <div className="w-full bg-white/5 p-1.5 rounded-[20px] flex mb-8 border border-white/5">
            <button onClick={() => { setLoginMethod('email'); setError(''); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[14px] transition-all ${loginMethod === 'email' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500'}`}>Email</button>
            <button onClick={() => { setLoginMethod('phone'); setError(''); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[14px] transition-all ${loginMethod === 'phone' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500'}`}>Phone</button>
        </div>

        <div className="w-full space-y-6">
            {error && <div className="p-4 bg-red-500/10 text-red-200 text-xs font-bold rounded-2xl text-center border border-red-500/20 animate-shake">{error}</div>}
            
            {loginMethod === 'email' ? (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-indigo-500 placeholder-slate-700 transition-all" placeholder="name@example.com" required />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                           <button type="button" onClick={onForgotPassword} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white">Forgot?</button>
                        </div>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-indigo-500 placeholder-slate-700 transition-all" placeholder="••••••••" required />
                    </div>
                    <Button type="submit" isLoading={isLoading} className="w-full py-5 !rounded-2xl !bg-indigo-600 !text-white !font-black !text-lg !shadow-2xl !shadow-indigo-600/30 !border-0 transform hover:scale-[1.02] active:scale-[0.98]">Sign In</Button>
                </form>
            ) : (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                   <p className="text-slate-400 text-sm">Phone OTP support is currently under maintenance.</p>
                </div>
            )}

            <div className="flex items-center gap-4 py-2">
               <div className="h-px bg-white/5 flex-1"></div>
               <span className="text-[10px] font-black text-slate-600 uppercase">OR</span>
               <div className="h-px bg-white/5 flex-1"></div>
            </div>

            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-white/5 hover:bg-white/10 text-white font-black bg-white/5 transition-all active:scale-[0.98]">
                <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
                <span className="text-sm">Continue with Google</span>
            </button>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 text-center w-full">
            <p className="text-sm text-slate-500 font-bold">New to Universe? <button onClick={onNavigateToSignup} className="text-indigo-400 hover:text-white transition-colors ml-1">Create Account</button></p>
        </div>
      </div>

      {/* FOOTER LINKS - Restored as requested */}
      <div className="max-w-md w-full px-4 mt-8 flex flex-col items-center gap-4 opacity-40 z-10">
         <div className="flex items-center gap-6">
            <button onClick={onNavigateToPrivacy} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">Privacy Policy</button>
            <a href="mailto:support@pyqverse.in" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">Contact Support</a>
         </div>
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">© 2025 PYQverse AI</p>
      </div>
    </div>
  );
};
