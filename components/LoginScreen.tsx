import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Button } from './Button';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  isOnline?: boolean;
  isInitializing?: boolean;
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToSignup, onForgotPassword, isOnline = true, isInitializing = false }) => {
  // Login Method State
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  // Email State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);

  // General State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Admin toggle easter egg
  const [logoClicks, setLogoClicks] = useState(0);

  // Recaptcha Ref
  const recaptchaRef = useRef<HTMLDivElement>(null);

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

  // Initialize Recaptcha when switching to Phone mode
  useEffect(() => {
    if (loginMethod === 'phone' && !window.recaptchaVerifier && recaptchaRef.current) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
          'size': 'invisible',
          'callback': () => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            setError('reCAPTCHA expired. Please try again.');
          }
        });
        window.recaptchaVerifier.render();
      } catch (e) {
        console.error("Recaptcha Init Error:", e);
      }
    }

    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch(e) {}
      }
    };
  }, [loginMethod]);

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
        mobile: firebaseUser.phoneNumber || null,
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
         setError('Incorrect Email or Password. Please check and try again.');
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

  // --- PHONE AUTH HANDLERS ---

  const handleSendOtp = async () => {
    if (!isOnline) return alert("⚠️ No Internet Connection");
    if (phoneNumber.length < 10) {
        setError("Please enter a valid 10-digit mobile number");
        return;
    }
    
    setIsLoading(true);
    setError('');

    const appVerifier = window.recaptchaVerifier;
    if (!appVerifier) {
       setError("System initializing... try again in 2 seconds.");
       setIsLoading(false);
       return;
    }

    const formatPh = phoneNumber.includes('+') ? phoneNumber : "+91" + phoneNumber;

    try {
        const confirmation = await signInWithPhoneNumber(auth, formatPh, appVerifier);
        setConfirmationResult(confirmation);
        setIsOtpSent(true);
        setIsLoading(false);
    } catch (err: any) {
        console.error("OTP Error:", err);
        setIsLoading(false);
        if (err.code === 'auth/invalid-phone-number') {
            setError("Invalid Phone Number.");
        } else if (err.code === 'auth/billing-not-enabled') {
            setError("Technical Issue: SMS service unavailable. Please use Email Login.");
        } else if (err.code === 'auth/too-many-requests') {
            setError("Too many requests. Try again later.");
        } else if (err.code === 'auth/captcha-check-failed') {
            setError("Captcha failed. Please refresh.");
        } else {
            setError(err.message || "Failed to send OTP.");
        }
        
        // Reset recaptcha on error
        if(window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear(); 
              window.recaptchaVerifier = null;
              // Re-init trigger via state if needed, or simply force reload
            } catch(e) {}
        }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setIsLoading(true);
    setError('');

    try {
        const result = await confirmationResult.confirm(otp);
        if (result.user) {
            const user = await syncUserToDB(result.user);
            onLogin(user);
        }
    } catch (err: any) {
        console.error("Verify Error:", err);
        setError("Incorrect OTP. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center animate-fade-in overflow-hidden">
         {/* Splash Screen Background */}
         <div className="absolute inset-0">
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
         </div>

         {/* Animated Logo */}
         <div className="relative w-32 h-32 mb-8 z-10">
            <div className="absolute inset-0 bg-orange-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <img src="/icon.svg" alt="Logo" className="relative z-10 w-full h-full drop-shadow-2xl animate-float" />
         </div>
         
         <div className="relative z-10 text-center">
            <h1 className="text-4xl font-display font-bold text-white tracking-tight animate-slide-up">
                PYQverse
            </h1>
            <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.3em] mt-3 animate-slide-up" style={{animationDelay: '0.1s'}}>
                All Exams Ka Universe
            </p>
         </div>
         
         <div className="absolute bottom-12 text-slate-500 text-[10px] font-mono z-10 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-orange-500 rounded-full animate-spin"></div>
            <span>Initializing Engine...</span>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-[#1c120e] to-black flex flex-col items-center justify-center p-4 relative overflow-hidden overflow-y-auto">
      
      {/* Background Particles - Warm/Sunset Tones */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-orange-100 rounded-full opacity-40 animate-pulse"></div>
         <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 bg-orange-500 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
         <div className="absolute bottom-[20%] left-[10%] w-1 h-1 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
         <div className="absolute top-[60%] left-[50%] w-1 h-1 bg-red-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10 animate-fade-in flex flex-col items-center relative z-10 transition-all duration-500 mb-8 my-8">
        
        {/* Animated Logo - Sunset Orange Theme */}
        <div 
            className="relative w-24 h-24 mb-6 flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none"
            onClick={() => setLogoClicks(p => p+1)}
            title="PV"
        >
            <div className="absolute w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-[0_0_40px_rgba(249,115,22,0.6)] flex items-center justify-center z-10 animate-pulse-glow border border-white/20">
                <span className="text-lg font-bold text-white font-display tracking-tight">PV</span>
            </div>
            <div className="absolute w-full h-full border border-orange-500/20 rounded-full animate-spin-slow" style={{ animationDuration: '8s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-400 rounded-full shadow-[0_0_15px_rgba(251,146,60,0.8)]"></div>
            </div>
            <div className="absolute w-[70%] h-[70%] border border-red-500/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '6s' }}>
                <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
            </div>
        </div>

        <div className="text-center mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-2xl font-display font-bold mb-1 text-white">
                Welcome Back
            </h1>
            <p className="text-slate-400 text-sm">
                Login to access your universe.
            </p>
        </div>

        {/* Login Method Toggle */}
        <div className="w-full bg-black/30 p-1 rounded-xl flex mb-6">
            <button 
                onClick={() => { setLoginMethod('email'); setError(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Email
            </button>
            <button 
                onClick={() => { setLoginMethod('phone'); setError(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Phone
            </button>
        </div>

        <div className="w-full animate-fade-in space-y-5">
            {error && (
                <div className="p-3 w-full bg-red-900/30 text-red-200 text-sm rounded-xl text-center font-medium border border-red-500/30 animate-shake">
                    {error}
                </div>
            )}

            {loginMethod === 'email' ? (
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
            ) : (
                <div className="space-y-4">
                    {/* INVISIBLE RECAPTCHA CONTAINER */}
                    <div ref={recaptchaRef}></div>

                    {!isOtpSent ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Mobile Number</label>
                                <div className="flex gap-2">
                                    <div className="p-3.5 rounded-xl border border-white/10 bg-black/40 text-slate-400 font-medium">
                                        +91
                                    </div>
                                    <input 
                                        type="tel" 
                                        value={phoneNumber}
                                        onChange={(e) => { 
                                            const val = e.target.value.replace(/\D/g, ''); 
                                            if (val.length <= 10) setPhoneNumber(val); 
                                            setError(''); 
                                        }}
                                        className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600 tracking-wide"
                                        placeholder="98765 43210"
                                        required
                                    />
                                </div>
                            </div>
                            <Button 
                                type="button"
                                onClick={handleSendOtp}
                                isLoading={isLoading} 
                                disabled={phoneNumber.length < 10}
                                className="w-full py-3.5 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/50 border-0"
                            >
                                Get OTP
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-2">
                                <p className="text-slate-400 text-sm">OTP sent to <span className="text-white font-bold">+91 {phoneNumber}</span></p>
                                <button onClick={() => { setIsOtpSent(false); setOtp(''); }} className="text-orange-400 text-xs hover:underline">Change Number</button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 text-center">Enter OTP</label>
                                <input 
                                    type="text" 
                                    value={otp}
                                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').substring(0, 6)); setError(''); }}
                                    className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white text-center text-2xl tracking-[0.5em] outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-bold placeholder-slate-700"
                                    placeholder="••••••"
                                    required
                                />
                            </div>
                            <Button 
                                type="button"
                                onClick={handleVerifyOtp}
                                isLoading={isLoading} 
                                disabled={otp.length < 6}
                                className="w-full py-3.5 text-lg font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50 border-0"
                            >
                                Verify & Login
                            </Button>
                        </>
                    )}
                </div>
            )}

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

            {loginMethod === 'email' && (
                <div className="text-center mt-4">
                    <p className="text-sm text-slate-400">Don't have an account? <button onClick={onNavigateToSignup} className="text-white font-bold hover:underline">Sign Up</button></p>
                </div>
            )}
        </div>
      </div>

      {/* Professional Footer */}
      <div className="relative z-10 text-center space-y-2 opacity-60 pb-6">
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