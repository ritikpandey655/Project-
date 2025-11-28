
import React, { useState } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
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
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
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
      
      if (userSnap.exists()) {
        const existingData = userSnap.data() as User;
        userData = existingData;
        if (isAdmin && !existingData.isAdmin) {
           userData.isAdmin = true;
           await setDoc(userRef, { isAdmin: true }, { merge: true });
        }
      } else {
        userData = safeData as User;
        await setDoc(userRef, safeData);
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
      const result = await signInWithPopup(auth, googleProvider);
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
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = await syncUserToDB(result.user);
      onLogin(user);
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
         setError('Invalid Email or Password');
      } else if (err.code === 'auth/user-not-found') {
         setError('No account found with this email.');
      } else {
         setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700 animate-fade-in">
        
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-2xl font-bold mb-4 shadow-lg shadow-indigo-500/30">
               PV
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-xl text-center font-medium border border-red-100 dark:border-red-900/50">
                {error}
            </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Email Address</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    placeholder="name@example.com"
                    required
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium pr-12"
                        placeholder="••••••••"
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 text-sm font-bold"
                    >
                        {showPassword ? "HIDE" : "SHOW"}
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button type="button" onClick={onForgotPassword} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline">
                    Forgot Password?
                </button>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full py-4 text-lg shadow-xl shadow-indigo-500/20">
                Sign In
            </Button>
        </form>

        <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-white dark:bg-slate-800 text-slate-400 font-bold uppercase text-xs tracking-wider">Or continue with</span></div>
        </div>

        <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-slate-700 dark:text-slate-200 font-bold group"
        >
            <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Google</span>
        </button>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            New to PYQverse? <button onClick={onNavigateToSignup} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Create Account</button>
        </p>

      </div>
    </div>
  );
};
