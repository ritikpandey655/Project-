
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../src/firebaseConfig';
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

  // Enhanced Firework Generation: Radial Bursts
  const bursts = useMemo(() => {
    const burstCount = 6; 
    const particlesPerBurst = 12; 
    const allParticles = [];
    const colors = ['#FDE047', '#60A5FA', '#F472B6', '#A855F7', '#34D399'];

    for (let b = 0; b < burstCount; b++) {
      const burstDelay = Math.random() * 2;
      const burstX = Math.random() * 100; // %
      const burstY = Math.random() * 100;  // Full Screen %

      for (let p = 0; p < particlesPerBurst; p++) {
        const angle = (Math.PI * 2 * p) / particlesPerBurst;
        const velocity = 60 + Math.random() * 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity + (Math.random() * 50);

        allParticles.push({
          id: `b${b}-p${p}`,
          top: `${burstY}%`,
          left: `${burstX}%`,
          tx: `${tx}px`,
          ty: `${ty}px`,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: `${burstDelay}s`,
          size: Math.random() > 0.5 ? '4px' : '2px'
        });
      }
    }
    return allParticles;
  }, []);

  const syncUserToDB = async (firebaseUser: any) => {
    try {
      const userRef = db.collection("users").doc(firebaseUser.uid);
      const userSnap = await userRef.get();
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

      if (userSnap.exists) return userSnap.data() as User;
      else {
        await userRef.set(safeData);
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

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between overflow-y-auto relative overflow-x-hidden">
      
      {/* FULL SCREEN FIXED Fireworks Container */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {bursts.map(p => (
              <div 
                key={p.id} 
                className="firework-particle" 
                style={{ 
                  top: p.top, 
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  '--tx': p.tx, 
                  '--ty': p.ty, 
                  backgroundColor: p.color, 
                  boxShadow: `0 0 6px ${p.color}`,
                  animationDelay: p.delay 
                } as React.CSSProperties}
              ></div>
          ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 border border-white/5 flex flex-col items-center animate-fade-in relative overflow-hidden ring-1 ring-white/10">
          
          {/* Glow Effects */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-60 h-60 bg-brand-500/20 rounded-full blur-[80px]"></div>

          <div className="mb-4 relative z-10 scale-110"><LogoIcon size="md" /></div>
          
          <div className="text-center mb-6 relative z-10 w-full">
              {/* Golden Welcome Back */}
              <h1 className="text-4xl font-display font-black text-gold-gradient mb-2 tracking-tight drop-shadow-sm">Welcome Back</h1>
              
              {/* Hanging Balloons with 2026 */}
              <div className="balloon-container">
                  <div className="balloon" style={{ backgroundColor: '#F87171', animationDelay: '0s' }}>2</div>
                  <div className="balloon" style={{ backgroundColor: '#FACC15', animationDelay: '0.5s' }}>0</div>
                  <div className="balloon" style={{ backgroundColor: '#60A5FA', animationDelay: '1s' }}>2</div>
                  <div className="balloon" style={{ backgroundColor: '#A78BFA', animationDelay: '1.5s' }}>6</div>
              </div>

              <p className="text-slate-400 text-sm font-medium">Enter the exam universe.</p>
          </div>
          
          <div className="w-full space-y-6 relative z-10">
              {error && <div className="p-3 bg-red-900/30 text-red-300 text-xs font-bold rounded-xl text-center border border-red-500/30">{error}</div>}
              
              <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Coordinates</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-brand-500 focus:bg-white/10 transition-all font-bold placeholder-slate-600" placeholder="name@example.com" required />
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                          <button 
                              type="button" 
                              onClick={onForgotPassword}
                              className="text-[10px] font-bold text-brand-400 hover:underline hover:text-brand-300 transition-colors"
                          >
                              Forgot?
                          </button>
                      </div>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-brand-500 focus:bg-white/10 transition-all font-bold placeholder-slate-600" placeholder="••••••••" required />
                  </div>
                  <Button type="submit" isLoading={isLoading} className="w-full py-4 text-lg font-black shadow-[0_0_20px_rgba(91,46,255,0.3)] !rounded-2xl !bg-gradient-to-r from-brand-600 to-brand-500 hover:!from-brand-500 hover:!to-brand-400 border border-white/10">Sign In</Button>
              </form>
              
              <div className="flex items-center gap-4 py-2"><div className="h-px bg-white/5 flex-1"></div><span className="text-[10px] font-black text-slate-600 uppercase">Or Continue With</span><div className="h-px bg-white/5 flex-1"></div></div>
              
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all group bg-white/5">
                  <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 group-hover:scale-110 transition-transform grayscale group-hover:grayscale-0" />
                  <span>Google</span>
              </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 text-center w-full relative z-10">
              <p className="text-sm text-slate-500 font-medium">New Explorer? <button onClick={onNavigateToSignup} className="text-brand-400 font-bold hover:text-brand-300 transition-colors">Create Account</button></p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full py-6 text-center border-t border-white/5 relative z-10 bg-slate-950/50 backdrop-blur-md">
         <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">© 2026 PYQverse AI</p>
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
