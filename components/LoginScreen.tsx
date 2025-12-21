import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Button } from './Button';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  onNavigateToPrivacy?: () => void;
  isOnline?: boolean;
  isInitializing?: boolean;
}

const LogoIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const dimensions = size === "sm" ? "w-12 h-12" : size === "md" ? "w-28 h-28" : "w-36 h-36";
  const fontSize = size === "sm" ? "text-xl" : size === "md" ? "text-4xl" : "text-5xl";
  
  return (
    <div className={`relative ${dimensions} flex items-center justify-center`}>
      {/* Outer Orbit Ring */}
      <div className="absolute inset-0 border border-orange-500/30 rounded-full animate-spin-slow">
        {/* The Orbiting Satellite Orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-[0_0_20px_rgba(251,146,60,1)]"></div>
      </div>
      
      {/* Secondary Orbit (Anti-clockwise) */}
      <div className="absolute inset-4 border border-indigo-500/20 rounded-full animate-[spin_12s_linear_infinite_reverse]">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
      </div>

      {/* Glow Layer */}
      <div className="absolute inset-4 bg-orange-600/20 rounded-full blur-3xl animate-pulse-glow"></div>

      {/* Central Core Block */}
      <div className="relative z-10 w-3/4 h-3/4 bg-gradient-to-br from-orange-500 via-red-600 to-indigo-800 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center justify-center border-2 border-white/20 transform rotate-12 transition-transform hover:rotate-0 duration-700 animate-float">
        <span className={`${fontSize} font-black text-white font-display -rotate-12 tracking-tighter drop-shadow-lg`}>PV</span>
      </div>
    </div>
  );
};

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoClicks, setLogoClicks] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logoClicks > 0 && logoClicks < 5) {
      const timer = setTimeout(() => setLogoClicks(0), 1000);
      return () => clearTimeout(timer);
    }
    if (logoClicks >= 5) {
       setLogoClicks(0);
       alert("Admin Mode activated.");
    }
  }, [logoClicks]);

  useEffect(() => {
    if (loginMethod === 'phone' && !window.recaptchaVerifier && recaptchaRef.current) {
      try {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaRef.current, {
          'size': 'invisible',
          'callback': () => {},
          'expired-callback': () => setError('reCAPTCHA expired. Please try again.')
        });
        window.recaptchaVerifier.render();
      } catch (e) {
        console.error("Recaptcha Init Error:", e);
      }
    }
  }, [loginMethod]);

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
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
         </div>
         <LogoIcon size="lg" />
         <div className="relative z-10 text-center mt-12 animate-fade-in">
            <h1 className="text-4xl font-display font-bold text-white tracking-tight">PYQverse</h1>
            <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mt-3">All Exams Ka Universe</p>
         </div>
         <div className="absolute bottom-12 text-slate-500 text-[10px] font-mono z-10 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-orange-500 rounded-full animate-spin"></div>
            <span>Initializing Engine...</span>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-[#1c120e] to-black flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10 flex flex-col items-center z-10 my-8 animate-fade-in">
        <div className="cursor-pointer active:scale-95 transition-transform" onClick={() => setLogoClicks(p => p+1)}>
            <LogoIcon size="md" />
        </div>
        <h1 className="text-2xl font-display font-bold mt-8 mb-1 text-white">Welcome Back</h1>
        <p className="text-slate-400 text-sm mb-6">Login to access your universe.</p>
        
        <div className="w-full bg-black/30 p-1 rounded-xl flex mb-6">
            <button onClick={() => { setLoginMethod('email'); setError(''); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Email</button>
            <button onClick={() => { setLoginMethod('phone'); setError(''); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Phone</button>
        </div>

        <div className="w-full space-y-5">
            {error && <div className="p-3 bg-red-900/30 text-red-200 text-sm rounded-xl text-center border border-red-500/30">{error}</div>}
            
            {loginMethod === 'email' && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500" placeholder="Email" required />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500" placeholder="Password" required />
                    <Button type="submit" isLoading={isLoading} className="w-full py-3.5 !bg-orange-600">Sign In</Button>
                </form>
            )}

            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-bold bg-black/20 transition-colors">
                <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
                <span>Continue with Google</span>
            </button>
        </div>
      </div>
    </div>
  );
};