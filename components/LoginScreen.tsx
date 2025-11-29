import React, { useState } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from './Button';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  isOnline?: boolean;
  isInitializing?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToSignup, onForgotPassword, isOnline = true, isInitializing = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const syncUserToDB = async (firebaseUser: any) => {
    try {
      const userRef = db.collection("users").doc(firebaseUser.uid);
      const userSnap = await userRef.get();
      
      const userEmail = firebaseUser.email || email || "";
      const rawName = firebaseUser.displayName || (userEmail ? userEmail.split('@')[0] : "User");
      
      const nameToCheck = rawName.toLowerCase();
      const emailToCheck = userEmail.toLowerCase();
      
      const isAdmin = emailToCheck === 'admin@pyqverse.com' || 
                      emailToCheck === 'ritikpandey655@gmail.com' ||
                      nameToCheck.includes('admin') ||
                      emailToCheck.includes('admin');

      const safeData = {
        id: firebaseUser.uid,
        name: rawName || "User",
        email: userEmail || "no-email", 
        photoURL: firebaseUser.photoURL || null,
        isAdmin: !!isAdmin 
      };

      let userData: User;
      
      if (userSnap.exists) {
        const existingData = userSnap.data() as User;
        userData = existingData;
        if (isAdmin && !existingData.isAdmin) {
           userData.isAdmin = true;
           await userRef.set({ isAdmin: true }, { merge: true });
        }
      } else {
        userData = safeData as User;
        await userRef.set(safeData);
      }
      return userData;
    } catch (dbError: any) {
      console.error("Database Sync Error:", dbError);
      throw new Error("Failed to save user data. " + dbError.message);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isOnline) {
      alert("⚠️ No Internet Connection\n\nPlease connect to the internet to log in.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await auth.signInWithPopup(googleProvider);
      const user = await syncUserToDB(result.user);
      onLogin(user);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
         const currentDomain = window.location.hostname;
         alert(`Domain not authorized: ${currentDomain}`);
      } else if (err.code === 'auth/popup-closed-by-user') {
         setError('Sign in cancelled');
      } else {
         setError(err.message || 'Google Sign In Failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
       alert("⚠️ No Internet Connection");
       return;
    }
    if (!email || !password) return;
    
    setIsLoading(true);
    setError('');
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      const user = await syncUserToDB(result.user);
      onLogin(user);
    } catch (err: any) {
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(err.code)) {
         setError('Account not found or incorrect password. Please Sign Up if you are new.');
         // Do not log error to console for expected user mistakes to avoid noise
      } else if (err.code === 'auth/too-many-requests') {
         setError('Too many failed attempts. Try again later.');
      } else {
         console.error("Login Error:", err);
         setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-[#111827] to-black flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Particles (Light Stars) */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white rounded-full opacity-40 animate-pulse"></div>
         <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 bg-blue-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
         <div className="absolute bottom-[20%] left-[10%] w-1 h-1 bg-white rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
         <div className="absolute top-[50%] right-[5%] w-1 h-1 bg-purple-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10 animate-fade-in flex flex-col items-center relative z-10 transition-all duration-500">
        
        {/* Orbit Style Logo - Dark Navy Theme with Green/Yellow Orbits */}
        <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
            {/* Central Core - Sun Colors */}
            <div className="absolute w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-[0_0_40px_rgba(234,88,12,0.6)] flex items-center justify-center z-10 animate-pulse-glow border border-white/20">
                <span className="text-2xl font-bold text-white font-display tracking-tight">PV</span>
            </div>
            
            {/* Orbit 1 (Green) */}
            <div className="absolute w-full h-full border border-emerald-500/20 rounded-full animate-spin-slow" style={{ animationDuration: '8s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.8)]"></div>
            </div>
            
            {/* Orbit 2 (Yellow) */}
            <div className="absolute w-[70%] h-[70%] border border-yellow-500/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '6s' }}>
                <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)]"></div>
            </div>

            {/* Orbit 3 (Subtle Glow Ring - Warm) */}
            <div className="absolute w-[130%] h-[130%] border border-orange-500/10 rounded-full opacity-50 pointer-events-none"></div>
        </div>

        <div className="text-center mb-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-3xl font-display font-bold mb-2">
               <span className="text-white">PYQ</span><span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">verse</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">All exams ka pura universe.</p>
        </div>

        {/* LOADING STATE (SPLASH SCREEN) */}
        {isInitializing ? (
           <div className="flex flex-col items-center animate-fade-in my-8">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Loading Universe...</p>
           </div>
        ) : (
           /* LOGIN FORM STATE */
           <div className="w-full animate-fade-in">
                {error && (
                    <div className="mb-6 p-4 w-full bg-red-900/30 text-red-200 text-sm rounded-xl text-center font-medium border border-red-500/30 animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailLogin} className="space-y-5 w-full">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Email Address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium pr-12 placeholder-slate-600"
                                placeholder="••••••••"
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-400 text-xs font-bold uppercase"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="button" onClick={onForgotPassword} className="text-xs font-bold text-orange-500 hover:text-orange-400 hover:underline">
                            Forgot Password?
                        </button>
                    </div>

                    <Button type="submit" isLoading={isLoading} className="w-full py-4 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/50 border-0">
                        Sign In
                    </Button>
                </form>

                <div className="relative my-8 w-full">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-4 bg-[#0f1420] text-slate-500 font-bold uppercase text-[10px] tracking-wider rounded">Or continue with</span></div>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-slate-300 font-bold group bg-black/20"
                >
                    <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span>Google</span>
                </button>

                <p className="mt-8 text-center text-sm text-slate-500">
                    New to PYQverse? <button onClick={onNavigateToSignup} className="font-bold text-orange-400 hover:text-white transition-colors">Create Account</button>
                </p>
           </div>
        )}

      </div>
    </div>
  );
};