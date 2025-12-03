
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Button } from './Button';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  isOnline?: boolean;
  isInitializing?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToSignup, onForgotPassword, isOnline = true, isInitializing = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Admin toggle easter egg
  const [logoClicks, setLogoClicks] = useState(0);

  useEffect(() => {
    if (logoClicks > 0 && logoClicks < 5) {
      const timer = setTimeout(() => setLogoClicks(0), 1000);
      return () => clearTimeout(timer);
    }
    if (logoClicks >= 5) {
       setLogoClicks(0);
       alert("Admin Mode: Please enter admin credentials.");
    }
  }, [logoClicks]);

  const syncUserToDB = async (firebaseUser: any) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      // Attempt to read first
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (readError) {
        console.warn("Could not read user profile (Permission/Network issue):", readError);
        userSnap = { exists: () => false, data: () => ({}) } as any;
      }
      
      const userEmail = firebaseUser.email || "";
      const rawName = firebaseUser.displayName || "User"; 
      
      const nameToCheck = rawName.toLowerCase();
      const emailToCheck = userEmail.toLowerCase();
      
      const isAdmin = emailToCheck === 'support@pyqverse.in' || 
                      emailToCheck === 'admin@pyqverse.com' || 
                      nameToCheck.includes('admin') ||
                      emailToCheck.includes('admin');

      const safeData = {
        id: firebaseUser.uid,
        name: rawName,
        email: userEmail,
        photoURL: firebaseUser.photoURL || null,
        isAdmin: !!isAdmin 
      };

      // @ts-ignore
      if (userSnap.exists()) {
        // @ts-ignore
        const currentData = userSnap.data() as User;
        // Auto-upgrade admin privileges if email matches
        if (emailToCheck === 'support@pyqverse.in' && !currentData?.isAdmin) {
            try { await updateDoc(userRef, { isAdmin: true }); } catch(e) {}
            return { ...safeData, isAdmin: true } as User;
        }
        return currentData as User;
      } else {
        // Try to create the user doc if it doesn't exist
        try {
            await setDoc(userRef, safeData);
        } catch (writeError) {
            console.warn("Could not write user profile (Permission issue):", writeError);
        }
        return safeData as User;
      }
    } catch (dbError: any) {
      console.error("Database Sync Error:", dbError);
      // Fallback: Return basic auth info so the app doesn't block the user
      return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || "User",
        email: firebaseUser.email || "",
        isAdmin: false
      } as User;
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
        // ALLOW unverified login to proceed. 
        // App.tsx handles the redirection to VerifyEmailScreen based on result.user.emailVerified
        const user = await syncUserToDB(result.user);
        onLogin(user);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      const code = err.code;
      if (
        code === 'auth/user-not-found' || 
        code === 'auth/wrong-password' || 
        code === 'auth/invalid-credential' || 
        code === 'auth/invalid-login-credentials'
      ) {
         setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
         setError('Too many failed attempts. Try again later.');
      } else {
         setError(err.message || 'Login Failed');
      }
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
         // Google accounts are inherently verified
         const user = await syncUserToDB(result.user);
         onLogin(user);
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(err.message || 'Google Sign In Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-[#1c120e] to-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Particles - Warm/Sunset Tones */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-orange-100 rounded-full opacity-40 animate-pulse"></div>
         <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 bg-orange-500 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
         <div className="absolute bottom-[20%] left-[10%] w-1 h-1 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
         <div className="absolute top-[60%] left-[50%] w-1 h-1 bg-red-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10 animate-fade-in flex flex-col items-center relative z-10 transition-all duration-500 mb-8">
        
        {/* Animated Logo - Sunset Orange Theme */}
        <div 
            className="relative w-32 h-32 mb-6 flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none"
            onClick={() => setLogoClicks(p => p+1)}
            title="PV"
        >
            <div className="absolute w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-[0_0_40px_rgba(249,115,22,0.6)] flex items-center justify-center z-10 animate-pulse-glow border border-white/20">
                <span className="text-xl font-bold text-white font-display tracking-tight">PV</span>
            </div>
            <div className="absolute w-full h-full border border-orange-500/20 rounded-full animate-spin-slow" style={{ animationDuration: '8s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-orange-400 rounded-full shadow-[0_0_15px_rgba(251,146,60,0.8)]"></div>
            </div>
            <div className="absolute w-[70%] h-[70%] border border-red-500/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '6s' }}>
                <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
            </div>
        </div>

        <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-2xl font-display font-bold mb-1 text-white">
                Welcome Back
            </h1>
            <p className="text-slate-400 text-sm">
                Login to access your universe.
            </p>
        </div>

        {isInitializing ? (
           <div className="flex flex-col items-center animate-fade-in my-8">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Loading Universe...</p>
           </div>
        ) : (
           <div className="w-full animate-fade-in space-y-5">
                {error && (
                    <div className="p-3 w-full bg-red-900/30 text-red-200 text-sm rounded-xl text-center font-medium border border-red-500/30 animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Email Address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600 tracking-wide"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600 tracking-wide"
                            placeholder="••••••••"
                            required
                        />
                        <div className="text-right mt-2">
                           <button type="button" onClick={onForgotPassword} className="text-xs text-orange-400 hover:text-orange-300 font-bold">Forgot Password?</button>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        isLoading={isLoading} 
                        className="w-full py-3.5 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/50 border-0"
                    >
                        Sign In
                    </Button>
                </form>

                <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-4 bg-[#0f1420] text-slate-500 font-bold uppercase text-[10px] tracking-wider rounded">OR</span></div>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-slate-300 font-bold group bg-black/20"
                >
                    <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-all" />
                    <span>Continue with Google</span>
                </button>

                <div className="text-center mt-4">
                   <p className="text-sm text-slate-400">Don't have an account? <button onClick={onNavigateToSignup} className="text-white font-bold hover:underline">Sign Up</button></p>
                </div>
           </div>
        )}
      </div>

      {/* Professional Footer */}
      <div className="relative z-10 text-center space-y-2 opacity-60">
         <p className="text-xs text-slate-500">
            Need help? Contact <a href="mailto:support@pyqverse.in?subject=Login%20Issue%20-%20PYQverse" className="text-orange-400 hover:text-orange-300 font-bold transition-colors">support@pyqverse.in</a>
         </p>
         <p className="text-[10px] text-slate-600">
            © 2025 PYQverse. All rights reserved.
         </p>
      </div>
    </div>
  );
};
