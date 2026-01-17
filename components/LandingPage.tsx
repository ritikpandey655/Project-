
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
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-brand-100 selection:text-brand-900">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

      {/* --- BACKGROUND FX (Light Mode Optimized) --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-200/30 rounded-full blur-[100px] animate-blob mix-blend-multiply"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-[100px] animate-blob mix-blend-multiply" style={{animationDelay: '4s'}}></div>
         <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-blue-200/30 rounded-full blur-[80px] animate-blob mix-blend-multiply" style={{animationDelay: '2s'}}></div>
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LogoIcon size="sm" className="scale-90" />
            <span className="font-display font-black text-2xl tracking-tighter text-slate-900">PYQverse</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="hidden sm:block text-slate-600 font-bold text-sm hover:text-brand-600 transition-colors">Log In</button>
            <button onClick={() => onSignup()} className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-black text-sm hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/20">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 pt-36 pb-20 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in shadow-sm">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
          Handmade Questions
        </div>
        
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-black leading-[0.9] tracking-tighter mb-8 animate-slide-up text-slate-900">
          Crush <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">{typingText}<span className="animate-blink text-brand-600">|</span></span><br/>
          With AI Precision.
        </h1>
        
        <p className="text-slate-600 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-slide-up" style={{animationDelay: '0.1s'}}>
          The only platform that turns <strong>10 years of PYQs</strong> into your personalized success roadmap. Instant solutions, smart analytics, and zero fluff.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <button onClick={() => onSignup()} className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-lg shadow-[0_10px_40px_-10px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-1">
            Start Practicing Free 🚀
          </button>
          <button onClick={onLogin} className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl font-bold text-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
            View Dashboard
          </button>
        </div>
      </section>

      {/* --- INFINITE EXAM TICKER --- */}
      <div className="relative z-10 border-y border-slate-200 bg-white py-6 overflow-hidden">
        <div className="flex gap-12 items-center animate-scroll whitespace-nowrap min-w-full">
           {[...Object.keys(EXAM_SUBJECTS), ...Object.keys(EXAM_SUBJECTS)].map((exam, i) => (
             <span key={i} className="text-2xl font-black text-slate-300 uppercase tracking-widest hover:text-brand-500 transition-colors cursor-default">
               {exam}
             </span>
           ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10"></div>
      </div>

      {/* --- BENTO GRID FEATURES --- */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-black mb-4 text-slate-900">Everything You Need to Rank</h2>
          <p className="text-slate-500 font-medium">Replace your stack of books with one intelligent app.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: AI Solver (Large) */}
          <div className="md:col-span-2 bg-white rounded-[32px] p-8 sm:p-12 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:border-brand-500/50 transition-all hover:shadow-2xl hover:shadow-brand-500/10">
             <div className="relative z-10">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-4xl mb-6 text-brand-600 shadow-inner">📸</div>
                <h3 className="text-3xl font-bold mb-4 text-slate-900">Snap & Solve Instantly</h3>
                <p className="text-slate-500 max-w-sm mb-8 leading-relaxed font-medium">
                  Stuck on a tricky math problem or a history date? Just upload a screenshot. Our AI breaks it down step-by-step in Hinglish.
                </p>
                <div className="inline-flex items-center gap-2 text-brand-600 font-bold uppercase tracking-widest text-sm group-hover:gap-4 transition-all">
                  Try Doubt Solver <span>→</span>
                </div>
             </div>
             {/* Mock UI Element */}
             <div className="absolute top-10 right-[-50px] sm:right-[-20px] w-80 bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-lg transform rotate-6 opacity-80 group-hover:rotate-0 group-hover:opacity-100 transition-all duration-500">
                <div className="flex gap-3 mb-4">
                   <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                   <div className="flex-1 bg-slate-200 h-2 rounded w-1/2"></div>
                </div>
                <div className="space-y-2">
                   <div className="h-2 bg-slate-100 rounded w-full"></div>
                   <div className="h-2 bg-slate-100 rounded w-5/6"></div>
                   <div className="h-2 bg-slate-100 rounded w-4/6"></div>
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-brand-100">
                   <div className="h-2 bg-brand-100 rounded w-1/3 mb-2"></div>
                   <div className="h-2 bg-brand-50 rounded w-full"></div>
                </div>
             </div>
          </div>

          {/* Card 2: Stats */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden hover:border-green-500/50 transition-all group hover:shadow-green-500/10">
             <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-4xl mb-6 text-green-600 shadow-inner">📊</div>
             <h3 className="text-2xl font-bold mb-2 text-slate-900">Real Analytics</h3>
             <p className="text-slate-500 text-sm mb-6 font-medium">Know exactly which topics are dragging your score down.</p>
             <div className="h-32 w-full flex items-end justify-between gap-2 px-2">
                {[40, 70, 50, 90, 60, 80].map((h, i) => (
                   <div key={i} className="w-full bg-slate-100 rounded-t-sm group-hover:bg-green-500 transition-colors duration-500 relative overflow-hidden" style={{height: `${h}%`}}></div>
                ))}
             </div>
          </div>

          {/* Card 3: Gamification */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 hover:border-orange-500/50 transition-all hover:shadow-orange-500/10">
             <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-4xl mb-6 text-orange-500 shadow-inner">🔥</div>
             <h3 className="text-2xl font-bold mb-2 text-slate-900">Maintain Streaks</h3>
             <p className="text-slate-500 text-sm font-medium">Consistency is key. Earn badges and climb the global leaderboard.</p>
          </div>

          {/* Card 4: Papers (Wide) */}
          <div className="md:col-span-2 bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row items-center gap-8 hover:border-blue-500/50 transition-all hover:shadow-blue-500/10">
             <div className="flex-1">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl mb-6 text-blue-500 shadow-inner">📝</div>
                <h3 className="text-3xl font-bold mb-4 text-slate-900">Unlimited Mock Tests</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                   Generate full-length papers for JEE, NEET or UPSC with one click. Simulate real exam pressure with our built-in timer.
                </p>
             </div>
             <div className="sm:w-64 w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-4"><span>TIME LEFT</span><span className="text-red-500">02:59:00</span></div>
                <div className="space-y-3">
                   {[1,2,3].map(i => (
                      <div key={i} className="flex gap-2">
                         <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                         <div className="h-2 bg-slate-200 rounded w-full mt-1"></div>
                      </div>
                   ))}
                </div>
                <div className="mt-4 w-full h-8 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/30"></div>
             </div>
          </div>
        </div>
      </section>

      {/* --- STATS COUNTER --- */}
      <section className="py-20 border-y border-slate-200 bg-white">
         <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
               { num: "1k+", label: "Active Aspirants" },
               { num: "10M+", label: "Questions Solved" },
               { num: "98%", label: "Accuracy Rate" },
               { num: "4.8/5", label: "App Rating" }
            ].map((stat, i) => (
               <div key={i}>
                  <div className="text-4xl sm:text-5xl font-black text-slate-900 mb-2">{stat.num}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
               </div>
            ))}
         </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="py-24 px-6 max-w-3xl mx-auto">
         <h2 className="text-4xl font-display font-black text-center mb-12 text-slate-900">Common Doubts</h2>
         <div className="space-y-4">
            {[
               {q: "Is PYQverse really free?", a: "Yes, our core features including unlimited practice questions and doubt solving are completely free."},
               {q: "Does it support Hindi Medium?", a: "Absolutely. You can toggle between Hindi and English instantly for any question."},
               {q: "Can I use it offline?", a: "Yes! You can download generated mock papers and access them without internet."}
            ].map((item, i) => (
               <details key={i} className="bg-white rounded-2xl p-6 border border-slate-200 group shadow-sm hover:shadow-md transition-all">
                  <summary className="flex justify-between items-center font-bold text-lg cursor-pointer list-none text-slate-800">
                     {item.q}
                     <span className="transform group-open:rotate-180 transition-transform text-brand-600">▼</span>
                  </summary>
                  <p className="mt-4 text-slate-600 leading-relaxed">{item.a}</p>
               </details>
            ))}
         </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <div className="py-20 text-center px-6 relative overflow-hidden bg-slate-50 border-b border-slate-200">
         <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-5xl sm:text-7xl font-display font-black mb-8 tracking-tighter text-slate-900">Ready to top the list?</h2>
            <button onClick={() => onSignup()} className="px-12 py-5 bg-slate-900 text-white rounded-full font-black text-xl shadow-xl hover:scale-105 transition-transform hover:shadow-2xl">
               Launch App ⚡
            </button>
         </div>
      </div>

      {/* --- COMPREHENSIVE FOOTER (Updated based on Quesverse) --- */}
      <footer className="bg-[#0f172a] pt-16 pb-8 border-t border-slate-800 text-slate-400">
         <div className="max-w-7xl mx-auto px-6">
            
            {/* Top Section: Who We Are & Why Choose Us */}
            <div className="grid md:grid-cols-2 gap-12 mb-16 border-b border-slate-800 pb-12">
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
               <div className="md:pl-12 md:border-l border-slate-800">
                  <h3 className="text-xl font-bold text-white mb-4">Why Choose Us?</h3>
                  <p className="leading-relaxed mb-8">
                     PYQverse streamlines exam preparation, reducing stress and boosting confidence with a focus on efficient study. Our platform helps you master subjects and achieve top results with clarity and ease.
                  </p>
                  <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
                     <p className="text-white font-bold mb-2">🚀 Instant AI Solutions</p>
                     <p className="text-sm">Get step-by-step explanations for any doubt instantly.</p>
                  </div>
               </div>
            </div>

            {/* Links Columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
               {/* Column 1: Company */}
               <div>
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 inline-block">Company</h4>
                  <ul className="space-y-3 text-sm">
                     <li><button onClick={() => {}} className="hover:text-brand-400 transition-colors">About Us</button></li>
                     <li><button onClick={() => onNavigate('terms')} className="hover:text-brand-400 transition-colors">Disclaimer</button></li>
                     <li><button onClick={() => onNavigate('privacy')} className="hover:text-brand-400 transition-colors">Privacy Policy</button></li>
                     <li><button onClick={() => onNavigate('terms')} className="hover:text-brand-400 transition-colors">Terms & Conditions</button></li>
                  </ul>
               </div>

               {/* Column 2: Help & Support */}
               <div>
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 inline-block">Help & Support</h4>
                  <ul className="space-y-3 text-sm">
                     <li><a href="mailto:support@pyqverse.in" className="hover:text-brand-400 transition-colors">Contact Us</a></li>
                     <li><button onClick={() => onNavigate('terms')} className="hover:text-brand-400 transition-colors">User Guidelines</button></li>
                     <li><button onClick={() => {}} className="hover:text-brand-400 transition-colors">Site Map</button></li>
                  </ul>
               </div>

               {/* Column 3: Our Features */}
               <div>
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 inline-block">Our Features</h4>
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
                  <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 inline-block">Connect</h4>
                  <div className="flex gap-4 mb-4">
                     {/* Instagram */}
                     <a href="https://instagram.com/learnwithpyqverse" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-600 hover:to-orange-500 hover:text-white transition-all group border border-slate-700 hover:border-transparent" aria-label="Instagram">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                     </a>
                     {/* Facebook */}
                     <a href="https://www.facebook.com/profile.php?id=100058332954672" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all group border border-slate-700 hover:border-transparent" aria-label="Facebook">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                     </a>
                     {/* Email (Official) */}
                     <a href="mailto:support@pyqverse.in" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-brand-600 hover:text-white transition-all group border border-slate-700 hover:border-transparent" aria-label="Email">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                     </a>
                  </div>
                  <p className="text-xs">
                     Stay updated with the latest exam notifications and study tips.
                  </p>
               </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-600">
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
