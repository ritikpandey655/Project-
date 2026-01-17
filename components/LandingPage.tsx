
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { LogoIcon } from './LogoIcon';
import { EXAM_SUBJECTS } from '../constants';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: (initialQuery?: string) => void;
  onNavigate: (view: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('solve');
  const [typingText, setTypingText] = useState('');
  const words = ["UPSC", "JEE Mains", "NEET", "SSC CGL", "Boards"];
  
  // Typing Effect
  useEffect(() => {
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    const type = () => {
      const currentWord = words[wordIndex];
      if (isDeleting) {
        setTypingText(currentWord.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setTypingText(currentWord.substring(0, charIndex + 1));
        charIndex++;
      }

      if (!isDeleting && charIndex === currentWord.length) {
        setTimeout(() => isDeleting = true, 1500);
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
      }
    };
    
    const timer = setInterval(type, isDeleting ? 100 : 200);
    return () => clearInterval(timer);
  }, []);

  // SEO Schema
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PYQverse",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web, Android, iOS",
    "description": "AI-powered exam preparation app for UPSC, JEE, NEET, and SSC."
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0814] text-white overflow-x-hidden font-sans selection:bg-brand-500/30">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

      {/* --- BACKGROUND FX --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px] animate-blob"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-blob" style={{animationDelay: '4s'}}></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0814]/50 to-[#0a0814]"></div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed w-full z-50 bg-[#0a0814]/80 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LogoIcon size="sm" className="scale-90" />
            <span className="font-display font-black text-2xl tracking-tighter text-white">PYQverse</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="hidden sm:block text-slate-300 font-bold text-sm hover:text-white transition-colors">Log In</button>
            <button onClick={() => onSignup()} className="bg-white text-slate-950 px-6 py-2.5 rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
          Now with Gemini 3.0 AI Model
        </div>
        
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-black leading-[0.9] tracking-tighter mb-8 animate-slide-up">
          Crush <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">{typingText}<span className="animate-blink text-brand-400">|</span></span><br/>
          With AI Precision.
        </h1>
        
        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-slide-up" style={{animationDelay: '0.1s'}}>
          The only platform that turns <strong>10 years of PYQs</strong> into your personalized success roadmap. Instant solutions, smart analytics, and zero fluff.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <button onClick={() => onSignup()} className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-lg shadow-[0_10px_40px_-10px_rgba(91,46,255,0.5)] hover:shadow-[0_20px_60px_-15px_rgba(91,46,255,0.6)] transition-all transform hover:-translate-y-1">
            Start Practicing Free 🚀
          </button>
          <button onClick={onLogin} className="px-8 py-4 bg-[#1a1625] hover:bg-[#252033] text-white rounded-2xl font-bold text-lg border border-white/10 transition-all">
            View Dashboard
          </button>
        </div>
      </section>

      {/* --- INFINITE EXAM TICKER --- */}
      <div className="relative z-10 border-y border-white/5 bg-white/[0.02] overflow-hidden py-6">
        <div className="flex gap-12 items-center animate-scroll whitespace-nowrap min-w-full">
           {[...Object.keys(EXAM_SUBJECTS), ...Object.keys(EXAM_SUBJECTS)].map((exam, i) => (
             <span key={i} className="text-2xl font-black text-white/20 uppercase tracking-widest hover:text-brand-500/50 transition-colors cursor-default">
               {exam}
             </span>
           ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0a0814] to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0a0814] to-transparent z-10"></div>
      </div>

      {/* --- BENTO GRID FEATURES --- */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-black mb-4">Everything You Need to Rank</h2>
          <p className="text-slate-400">Replace your stack of books with one intelligent app.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: AI Solver (Large) */}
          <div className="md:col-span-2 bg-[#121026] rounded-[32px] p-8 sm:p-12 border border-white/10 relative overflow-hidden group hover:border-brand-500/30 transition-colors">
             <div className="relative z-10">
                <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center text-4xl mb-6 text-brand-400">📸</div>
                <h3 className="text-3xl font-bold mb-4">Snap & Solve Instantly</h3>
                <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
                  Stuck on a tricky math problem or a history date? Just upload a screenshot. Our AI breaks it down step-by-step in Hinglish.
                </p>
                <div className="inline-flex items-center gap-2 text-brand-400 font-bold uppercase tracking-widest text-sm group-hover:gap-4 transition-all">
                  Try Doubt Solver <span>→</span>
                </div>
             </div>
             {/* Mock UI Element */}
             <div className="absolute top-10 right-[-50px] sm:right-[-20px] w-80 bg-[#1a1625] rounded-xl border border-white/10 p-4 shadow-2xl transform rotate-6 opacity-80 group-hover:rotate-0 group-hover:opacity-100 transition-all duration-500">
                <div className="flex gap-3 mb-4">
                   <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                   <div className="flex-1 bg-slate-700 h-2 rounded w-1/2"></div>
                </div>
                <div className="space-y-2">
                   <div className="h-2 bg-slate-800 rounded w-full"></div>
                   <div className="h-2 bg-slate-800 rounded w-5/6"></div>
                   <div className="h-2 bg-slate-800 rounded w-4/6"></div>
                </div>
                <div className="mt-4 p-3 bg-brand-500/10 rounded-lg border border-brand-500/20">
                   <div className="h-2 bg-brand-500/40 rounded w-1/3 mb-2"></div>
                   <div className="h-2 bg-brand-500/20 rounded w-full"></div>
                </div>
             </div>
          </div>

          {/* Card 2: Stats */}
          <div className="bg-[#121026] rounded-[32px] p-8 border border-white/10 relative overflow-hidden hover:border-green-500/30 transition-colors group">
             <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center text-4xl mb-6 text-green-400">📊</div>
             <h3 className="text-2xl font-bold mb-2">Real Analytics</h3>
             <p className="text-slate-400 text-sm mb-6">Know exactly which topics are dragging your score down.</p>
             <div className="h-32 w-full flex items-end justify-between gap-2 px-2">
                {[40, 70, 50, 90, 60, 80].map((h, i) => (
                   <div key={i} className="w-full bg-slate-800 rounded-t-sm group-hover:bg-green-500 transition-colors duration-500 relative overflow-hidden" style={{height: `${h}%`}}></div>
                ))}
             </div>
          </div>

          {/* Card 3: Gamification */}
          <div className="bg-[#121026] rounded-[32px] p-8 border border-white/10 hover:border-orange-500/30 transition-colors">
             <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center text-4xl mb-6 text-orange-400">🔥</div>
             <h3 className="text-2xl font-bold mb-2">Maintain Streaks</h3>
             <p className="text-slate-400 text-sm">Consistency is key. Earn badges and climb the global leaderboard.</p>
          </div>

          {/* Card 4: Papers (Wide) */}
          <div className="md:col-span-2 bg-[#121026] rounded-[32px] p-8 border border-white/10 flex flex-col sm:flex-row items-center gap-8 hover:border-blue-500/30 transition-colors">
             <div className="flex-1">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-4xl mb-6 text-blue-400">📝</div>
                <h3 className="text-3xl font-bold mb-4">Unlimited Mock Tests</h3>
                <p className="text-slate-400 leading-relaxed">
                   Generate full-length papers for JEE, NEET or UPSC with one click. Simulate real exam pressure with our built-in timer.
                </p>
             </div>
             <div className="sm:w-64 w-full bg-[#0a0814] p-4 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-4"><span>TIME LEFT</span><span className="text-red-400">02:59:00</span></div>
                <div className="space-y-3">
                   {[1,2,3].map(i => (
                      <div key={i} className="flex gap-2">
                         <div className="w-4 h-4 rounded-full border border-slate-700"></div>
                         <div className="h-2 bg-slate-800 rounded w-full mt-1"></div>
                      </div>
                   ))}
                </div>
                <div className="mt-4 w-full h-8 bg-blue-600 rounded-lg"></div>
             </div>
          </div>
        </div>
      </section>

      {/* --- STATS COUNTER --- */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
         <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
               { num: "1k+", label: "Active Aspirants" },
               { num: "10M+", label: "Questions Solved" },
               { num: "98%", label: "Accuracy Rate" },
               { num: "4.8/5", label: "App Rating" }
            ].map((stat, i) => (
               <div key={i}>
                  <div className="text-4xl sm:text-5xl font-black text-white mb-2">{stat.num}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
               </div>
            ))}
         </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="py-24 px-6 max-w-3xl mx-auto">
         <h2 className="text-4xl font-display font-black text-center mb-12">Common Doubts</h2>
         <div className="space-y-4">
            {[
               {q: "Is PYQverse really free?", a: "Yes, our core features including unlimited practice questions and doubt solving are completely free."},
               {q: "Does it support Hindi Medium?", a: "Absolutely. You can toggle between Hindi and English instantly for any question."},
               {q: "Can I use it offline?", a: "Yes! You can download generated mock papers and access them without internet."}
            ].map((item, i) => (
               <details key={i} className="bg-[#121026] rounded-2xl p-6 border border-white/10 group">
                  <summary className="flex justify-between items-center font-bold text-lg cursor-pointer list-none">
                     {item.q}
                     <span className="transform group-open:rotate-180 transition-transform text-brand-500">▼</span>
                  </summary>
                  <p className="mt-4 text-slate-400 leading-relaxed">{item.a}</p>
               </details>
            ))}
         </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <div className="py-20 text-center px-6 relative overflow-hidden border-b border-white/5">
         <div className="absolute inset-0 bg-gradient-to-t from-brand-900/20 to-transparent pointer-events-none"></div>
         <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-5xl sm:text-7xl font-display font-black mb-8 tracking-tighter">Ready to top the list?</h2>
            <button onClick={() => onSignup()} className="px-12 py-5 bg-white text-slate-950 rounded-full font-black text-xl shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
               Launch App ⚡
            </button>
         </div>
      </div>

      {/* --- COMPREHENSIVE FOOTER (Updated based on Quesverse) --- */}
      <footer className="bg-[#05040a] pt-16 pb-8 border-t border-white/5 text-slate-400">
         <div className="max-w-7xl mx-auto px-6">
            
            {/* Top Section: Who We Are & Why Choose Us */}
            <div className="grid md:grid-cols-2 gap-12 mb-16 border-b border-white/5 pb-12">
               <div>
                  <div className="flex items-center gap-3 mb-6">
                     <LogoIcon size="sm" className="scale-75 origin-left" />
                     <span className="font-display font-black text-2xl text-white tracking-tighter">PYQverse</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">Who we are</h3>
                  <p className="leading-relaxed mb-6">
                     PYQverse transforms exam preparation by making high-quality study materials accessible, helping students excel with confidence. We simplify exam preparation by providing AI-curated question papers that empower students to succeed.
                  </p>
                  <h4 className="text-lg font-bold text-white mb-2">What Makes Us Different?</h4>
                  <p className="leading-relaxed">
                     At PYQverse, we deliver clear, easy-to-understand materials with meticulously curated question papers and answers. Our personalized AI approach ensures every student can confidently prepare for exams with the best tools.
                  </p>
               </div>
               <div className="md:pl-12 md:border-l border-white/5">
                  <h3 className="text-xl font-bold text-white mb-4">Why Choose Us?</h3>
                  <p className="leading-relaxed mb-8">
                     PYQverse streamlines exam preparation, reducing stress and boosting confidence with a focus on efficient study. Our platform helps you master subjects and achieve top results with clarity and ease.
                  </p>
                  <div className="p-6 bg-[#121026] rounded-2xl border border-white/5">
                     <p className="text-white font-bold mb-2">🚀 Instant AI Solutions</p>
                     <p className="text-sm">Get step-by-step explanations for any doubt instantly.</p>
                  </div>
               </div>
            </div>

            {/* Links Columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
               {/* Column 1: Company */}
               <div>
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2 inline-block">Company</h4>
                  <ul className="space-y-3 text-sm">
                     <li><button onClick={() => {}} className="hover:text-brand-400 transition-colors">About Us</button></li>
                     <li><button onClick={() => onNavigate('terms')} className="hover:text-brand-400 transition-colors">Disclaimer</button></li>
                     <li><button onClick={() => onNavigate('privacy')} className="hover:text-brand-400 transition-colors">Privacy Policy</button></li>
                     <li><button onClick={() => onNavigate('terms')} className="hover:text-brand-400 transition-colors">Terms & Conditions</button></li>
                  </ul>
               </div>

               {/* Column 2: Help & Support */}
               <div>
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2 inline-block">Help & Support</h4>
                  <ul className="space-y-3 text-sm">
                     <li><a href="mailto:support@pyqverse.in" className="hover:text-brand-400 transition-colors">Contact Us</a></li>
                     <li><button onClick={() => onNavigate('terms')} className="hover:text-brand-400 transition-colors">User Guidelines</button></li>
                     <li><button onClick={() => {}} className="hover:text-brand-400 transition-colors">Site Map</button></li>
                  </ul>
               </div>

               {/* Column 3: Our Features */}
               <div>
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2 inline-block">Our Features</h4>
                  <ul className="space-y-3 text-sm">
                     <li><button onClick={() => onSignup()} className="hover:text-brand-400 transition-colors">Question Papers</button></li>
                     <li><button onClick={() => onSignup()} className="hover:text-brand-400 transition-colors">PYQ Solutions</button></li>
                     <li><button onClick={() => onSignup()} className="hover:text-brand-400 transition-colors">Gamified Learning</button></li>
                     <li>
                        <button onClick={() => alert("We are curating the best notes for you. Launching soon!")} className="hover:text-brand-400 transition-colors flex items-center gap-2 group text-left">
                           Toppers Notes 
                           <span className="text-[9px] bg-brand-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wide group-hover:scale-110 transition-transform">Soon</span>
                        </button>
                     </li>
                  </ul>
               </div>

               {/* Column 4: Contact/Social (Optional/Extra) */}
               <div>
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2 inline-block">Connect</h4>
                  <div className="flex gap-4 mb-4">
                     <a href="https://instagram.com/learnwithpyqverse" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-600 hover:to-orange-500 hover:text-white transition-all text-xl" aria-label="Instagram">
                        📸
                     </a>
                     <a href="https://www.facebook.com/profile.php?id=100058332954672" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all text-xl" aria-label="Facebook">
                        📘
                     </a>
                     <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all text-xl" aria-label="YouTube">
                        ▶️
                     </a>
                  </div>
                  <p className="text-xs">
                     Stay updated with the latest exam notifications and study tips.
                  </p>
               </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-600">
               <p>© 2026 PYQverse AI. All Rights Reserved.</p>
               <div className="flex gap-6">
                  <span>Made with ❤️ in India</span>
               </div>
            </div>
         </div>
      </footer>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
