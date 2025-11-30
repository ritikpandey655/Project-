
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { Button } from './Button';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
  isOnline?: boolean;
  isInitializing?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isOnline = true, isInitializing = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  
  // Mobile Auth State
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  // Admin Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    if (logoClicks > 0 && logoClicks < 5) {
      const timer = setTimeout(() => setLogoClicks(0), 1000);
      return () => clearTimeout(timer);
    }
    if (logoClicks >= 5) {
        setIsAdminMode(true);
        setLogoClicks(0);
        setError('');
    }
  }, [logoClicks]);

  const handleLogoClick = () => {
      setLogoClicks(prev => prev + 1);
  };

  // Helper to init captcha safely
  const setupRecaptcha = () => {
    // Return existing if valid
    if ((window as any).recaptchaVerifier) {
      return (window as any).recaptchaVerifier;
    }

    const container = document.getElementById('recaptcha-container');
    if (!container) {
      console.warn("Recaptcha container not found");
      return null;
    }

    try {
      // Clear any artifacts
      container.innerHTML = '';
      
      const verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
           // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
           console.log("Recaptcha expired");
           if ((window as any).recaptchaVerifier) {
             (window as any).recaptchaVerifier.clear();
             (window as any).recaptchaVerifier = null;
           }
        }
      });
      
      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (e) {
      console.error("Recaptcha Setup Error:", e);
      return null;
    }
  };

  // Init on mount/view change
  useEffect(() => {
    if (!showOtpInput && !isAdminMode) {
       // Small delay to ensure DOM is ready
       const timer = setTimeout(() => {
          setupRecaptcha();
       }, 500);
       return () => clearTimeout(timer);
    }
  }, [showOtpInput, isAdminMode]);

  const syncUserToDB = async (firebaseUser: any) => {
    try {
      const userRef = db.collection("users").doc(firebaseUser.uid);
      const userSnap = await userRef.get();
      
      const userEmail = firebaseUser.email || "";
      const userMobile = firebaseUser.phoneNumber || phoneNumber;
      const rawName = firebaseUser.displayName || "User"; 
      
      const nameToCheck = rawName.toLowerCase();
      const emailToCheck = userEmail.toLowerCase();
      
      const isAdmin = emailToCheck === 'admin@pyqverse.com' || 
                      nameToCheck.includes('admin') ||
                      emailToCheck.includes('admin');

      const safeData = {
        id: firebaseUser.uid,
        name: rawName,
        email: userEmail, 
        mobile: userMobile,
        photoURL: firebaseUser.photoURL || null,
        isAdmin: !!isAdmin 
      };

      if (userSnap.exists) {
        const existingData = userSnap.data() as User;
        if (!existingData.mobile && userMobile) {
            await userRef.update({ mobile: userMobile });
            existingData.mobile = userMobile;
        }
        return existingData;
      } else {
        await userRef.set(safeData);
        return safeData as User;
      }
    } catch (dbError: any) {
      console.error("Database Sync Error:", dbError);
      throw new Error("Failed to save user data.");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return alert("⚠️ No Internet Connection");
    
    const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^\+[0-9]{10,15}$/.test(formattedPhone)) {
        setError("Invalid phone number. Format: +919876543210");
        return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // 1. Get or Create Verifier
      let appVerifier = (window as any).recaptchaVerifier;
      if (!appVerifier) {
        appVerifier = setupRecaptcha();
      }

      // 2. Strict Check
      if (!appVerifier) {
         throw new Error("Security check not ready. Please refresh.");
      }

      // 3. Send
      const confirmation = await auth.signInWithPhoneNumber(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setShowOtpInput(true);
    } catch (err: any) {
      console.error("OTP Error:", err);
      
      if (err.code === 'auth/argument-error') {
          setError('Security check error. Please reload page.');
      } else if (err.code === 'auth/invalid-phone-number') {
          setError('Invalid phone number.');
      } else if (err.code === 'auth/too-many-requests') {
          setError('Too many attempts. Try again later.');
      } else {
          setError(err.message || 'Failed to send OTP.');
      }

      // Reset on error to be safe
      if ((window as any).recaptchaVerifier) {
          try { (window as any).recaptchaVerifier.clear(); } catch(e){}
          (window as any).recaptchaVerifier = null;
          // Try re-init after short delay
          setTimeout(setupRecaptcha, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await confirmationResult.confirm(otp);
      const user = await syncUserToDB(result.user);
      onLogin(user);
    } catch (err: any) {
      console.error("Verify Error:", err);
      setError('Invalid OTP. Please try again.');
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
      const user = await syncUserToDB(result.user);
      onLogin(user);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(err.message || 'Google Sign In Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return alert("⚠️ No Internet Connection");
    setIsLoading(true);
    setError('');
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        const user = await syncUserToDB(result.user);
        onLogin(user);
    } catch (err: any) {
        console.error("Admin Login Error:", err);
        setError('Invalid Admin Credentials');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-[#111827] to-black flex items-center justify-center p-4 relative overflow-hidden">
      
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white rounded-full opacity-40 animate-pulse"></div>
         <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 bg-blue-300 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
         <div className="absolute bottom-[20%] left-[10%] w-1 h-1 bg-white rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10 animate-fade-in flex flex-col items-center relative z-10 transition-all duration-500">
        
        <div 
            className="relative w-32 h-32 mb-6 flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none"
            onClick={handleLogoClick}
            title="PV"
        >
            <div className="absolute w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-[0_0_40px_rgba(234,88,12,0.6)] flex items-center justify-center z-10 animate-pulse-glow border border-white/20">
                <span className="text-xl font-bold text-white font-display tracking-tight">PV</span>
            </div>
            <div className="absolute w-full h-full border border-emerald-500/20 rounded-full animate-spin-slow" style={{ animationDuration: '8s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.8)]"></div>
            </div>
            <div className="absolute w-[70%] h-[70%] border border-yellow-500/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '6s' }}>
                <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)]"></div>
            </div>
        </div>

        <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-2xl font-display font-bold mb-1 text-white">
                {isAdminMode ? 'Admin Access' : 'Welcome Back'}
            </h1>
            <p className="text-slate-400 text-sm">
                {isAdminMode ? 'Enter credentials to manage app' : 'Login with Mobile or Google'}
            </p>
        </div>

        {isInitializing ? (
           <div className="flex flex-col items-center animate-fade-in my-8">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Loading Universe...</p>
           </div>
        ) : (
           <div className="w-full animate-fade-in space-y-6">
                {error && (
                    <div className="p-3 w-full bg-red-900/30 text-red-200 text-sm rounded-xl text-center font-medium border border-red-500/30 animate-shake">
                        {error}
                    </div>
                )}

                {isAdminMode ? (
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Admin Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600 tracking-wide"
                                placeholder="admin@pyqverse.com"
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
                                placeholder="••••••"
                                required
                            />
                        </div>
                        <Button type="submit" isLoading={isLoading} className="w-full py-3.5 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/50 border-0">
                            Secure Login
                        </Button>
                        <button type="button" onClick={() => { setIsAdminMode(false); setError(''); }} className="w-full text-sm text-slate-500 hover:text-white transition-colors py-2">
                            ← Back to User Login
                        </button>
                    </form>
                ) : (
                    <>
                        {!showOtpInput ? (
                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Mobile Number</label>
                                    <input 
                                        type="tel" 
                                        value={phoneNumber}
                                        onChange={(e) => { setPhoneNumber(e.target.value); setError(''); }}
                                        className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-slate-600 tracking-wide"
                                        placeholder="+91 XXXXX XXXXX"
                                        required
                                    />
                                </div>
                                
                                {/* ReCAPTCHA Container - Kept in DOM but hidden */}
                                <div id="recaptcha-container" className="fixed bottom-0 right-0 z-0 opacity-0 pointer-events-none"></div>

                                <Button 
                                    type="submit" 
                                    isLoading={isLoading} 
                                    className="w-full py-3.5 text-lg font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/50 border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Get OTP
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-slide-up">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-bold text-slate-400 uppercase ml-1">Enter OTP</label>
                                        <button type="button" onClick={() => setShowOtpInput(false)} className="text-xs text-orange-400 font-bold hover:underline">Change Number</button>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full p-3.5 rounded-xl border border-white/10 bg-black/40 text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium text-center tracking-[0.5em] text-xl"
                                        placeholder="• • • • • •"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <Button type="submit" isLoading={isLoading} className="w-full py-3.5 text-lg font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50 border-0">
                                    Verify & Login
                                </Button>
                            </form>
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
                    </>
                )}
           </div>
        )}
      </div>
    </div>
  );
};
