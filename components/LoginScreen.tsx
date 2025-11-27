
import React, { useState } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  isOnline?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToSignup, onForgotPassword, isOnline = true }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleStartPrep = () => {
    if (!isOnline) {
      alert("⚠️ No Internet Connection\n\nPlease connect to the internet to log in.");
      return;
    }
    setShowLoginOptions(true);
  };

  const syncUserToDB = async (firebaseUser: any) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    
    // Check for Admin rights in Name or Email (Case Insensitive)
    const nameToCheck = (firebaseUser.displayName || email.split('@')[0] || '').toLowerCase();
    const emailToCheck = (firebaseUser.email || '').toLowerCase();
    
    // Explicitly check for your email
    const isAdmin = emailToCheck === 'admin@pyqverse.com' || 
                    emailToCheck === 'ritikpandey655@gmail.com' ||
                    nameToCheck.includes('admin') ||
                    emailToCheck.includes('admin');

    let userData: User;
    if (userSnap.exists()) {
      userData = userSnap.data() as User;
      // Update admin status if it has changed
      if (isAdmin && !userData.isAdmin) {
         userData.isAdmin = true;
         await setDoc(userRef, { isAdmin: true }, { merge: true });
      }
    } else {
      userData = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || nameToCheck,
        email: firebaseUser.email || emailToCheck,
        // CRITICAL FIX: Use null for missing photoURL to avoid Firestore 'undefined' error
        photoURL: firebaseUser.photoURL || null,
        isAdmin: isAdmin
      };
      await setDoc(userRef, userData);
    }
    return userData;
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = await syncUserToDB(result.user);
      onLogin(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign In Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = await syncUserToDB(result.user);
      onLogin(user);
    } catch (err: any) {
      console.error(err);
      setError('Invalid Email or Password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-[#111827] flex flex-col items-center justify-between overflow-hidden selection:bg-brand-purple selection:text-white overflow-y-auto">
      {/* Styles & Background Animations kept same for aesthetics */}
      <style>{`
        @keyframes orbit { from { transform: rotate(0deg) translateX(30px) rotate(0deg); } to { transform: rotate(360deg) translateX(30px) rotate(-360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin-slow { animation: orbit 8s linear infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-fade-in { animation: fadeInUp 0.8s ease-out forwards; }
      `}</style>

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-purple/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-blue/30 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-md mx-auto px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
        <div className={`flex flex-col items-center text-center transition-all duration-700 ${showLoginOptions ? 'mt-4 sm:mt-10' : 'mt-6 sm:mt-20'}`}>
          <div className="mb-6 sm:mb-8 relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/10 flex items-center justify-center relative backdrop-blur-md bg-white/5">
               <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-lg shadow-brand-purple/50 z-10 font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tighter">PV</div>
               <div className="absolute inset-0 w-full h-full animate-spin-slow"><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-3 h-3 bg-brand-green rounded-full shadow-[0_0_10px_#10B981]"></div></div>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-2 font-display">PYQ<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-blue">verse</span></h1>
          <p className="text-indigo-100 text-base sm:text-lg leading-relaxed max-w-xs mx-auto opacity-90 font-medium">All exams ka pura universe.</p>
        </div>

        <div className="flex-1"></div>

        <div className="w-full mt-auto pt-4 mb-4 sm:mb-8">
          {!showLoginOptions ? (
            <button onClick={handleStartPrep} className="w-full group relative flex items-center justify-center gap-3 bg-white text-brand-dark font-display font-bold text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(91,46,255,0.3)] hover:scale-[1.02] transition-all duration-300">
              <span className="relative z-10">{isOnline ? 'Start Your Prep' : 'Offline (Req Login)'}</span>
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-white text-lg sm:text-xl font-display font-bold">Welcome Back</h2>
                  <p className="text-indigo-200 text-xs sm:text-sm">Sign in to sync your progress</p>
                </div>
                
                {error && <p className="text-red-400 text-xs text-center mb-3 bg-red-900/20 p-2 rounded">{error}</p>}

                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 outline-none focus:border-brand-purple text-sm" />
                  
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-indigo-200/50 outline-none focus:border-brand-purple text-sm pr-10" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                  
                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={onForgotPassword}
                      className="text-xs text-indigo-300 hover:text-white transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full bg-brand-purple hover:bg-[#4a25cf] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg mt-2">
                    {isLoading ? "Signing In..." : "Sign In"}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-4"><div className="h-px bg-white/10 flex-1"></div><span className="text-[10px] text-indigo-200 font-bold">OR</span><div className="h-px bg-white/10 flex-1"></div></div>

                <button 
                  type="button" 
                  onClick={handleGoogleLogin} 
                  disabled={isLoading} 
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-indigo-50 text-slate-800 font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
                  <span>Sign in with Google</span>
                </button>

                <div className="mt-4 text-center">
                  <p className="text-sm text-indigo-200">New here? <button onClick={onNavigateToSignup} className="text-white font-bold hover:underline">Sign Up</button></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
