
import React, { useState } from 'react';
import { Button } from './Button';
import { LogoIcon } from './LogoIcon';
import { EXAM_SUBJECTS } from '../constants';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: (initialQuery?: string) => void;
  onNavigate: (view: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup, onNavigate }) => {
  const [query, setQuery] = useState('');

  // SEO Schema - FAQ + App
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "PYQverse",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Web, Android, iOS",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR"
        },
        "description": "AI-powered exam preparation app for UPSC, JEE, NEET, and SSC. Practice Previous Year Questions (PYQ) with instant AI solutions."
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is PYQverse free?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, PYQverse offers unlimited practice questions and doubt solving for free. We also have a Pro plan for advanced analytics."
            }
          },
          {
            "@type": "Question",
            "name": "Does PYQverse work offline?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, you can download practice papers and questions to use the app in offline mode."
            }
          },
          {
            "@type": "Question",
            "name": "Which exams are covered?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We cover UPSC, JEE Mains, NEET, SSC CGL, Railways, and UP Board (Class 10 & 12)."
            }
          },
          {
            "@type": "Question",
            "name": "Is content available in Hindi?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely! PYQverse supports full bilingual (Hindi & English) content for all questions and explanations."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden text-slate-900 dark:text-white flex flex-col">
      
      {/* SEO Script */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      {/* Dedicated Background to Prevent Blank Screen */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#1e1b4b] to-slate-950 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Modern Clean Navbar */}
      <nav className="fixed w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <LogoIcon size="sm" className="scale-90" />
              <span className="font-display font-black text-2xl tracking-tighter text-white">PYQverse</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLogin}
                className="text-slate-300 font-bold text-sm hover:text-white transition-colors"
              >
                Log In
              </button>
              <button 
                onClick={() => onSignup()} 
                className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-brand-500/20 transition-all"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-28 pb-12 sm:pt-48 sm:pb-32 flex flex-col items-center text-center px-4 overflow-hidden z-10 min-h-[80vh]">
        
        {/* Massive Headline */}
        <h1 className="max-w-5xl text-5xl sm:text-7xl lg:text-9xl font-display font-black text-white mb-6 leading-[0.95] tracking-tighter animate-slide-up">
          Prepare <span className="text-gold-gradient drop-shadow-sm">2026 Exams.</span><br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Instantly. AI Only.</span>
        </h1>
        
        {/* Subtext Flow */}
        <div className="flex items-center gap-4 text-xl sm:text-2xl font-bold text-slate-400 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
           <span>Idea</span>
           <span className="text-slate-600">→</span>
           <span className="text-white">Practice</span>
           <span className="text-slate-600">→</span>
           <span>Success</span>
        </div>
        
        {/* Primary CTA */}
        <button 
          onClick={() => onSignup()}
          className="bg-white text-slate-900 px-10 py-5 rounded-full text-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-slide-up mb-8 relative overflow-hidden group"
          style={{ animationDelay: '0.2s' }}
        >
           <span className="relative z-10">Launch 2026 Universe 🚀</span>
           <div className="absolute inset-0 bg-gradient-to-r from-brand-400/0 via-brand-400/30 to-brand-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>

        {/* Footer Note */}
        <p className="mt-4 text-sm font-medium text-slate-400 animate-slide-up" style={{ animationDelay: '0.3s' }}>
           Updated for UPSC, NEET, JEE & UP Board <span className="text-yellow-500 font-bold">2026 Patterns</span>.
        </p>
      </div>

      {/* SEO Content Section (Rich Text for Crawlers) */}
      <section className="relative z-10 bg-slate-950 py-20 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-3xl font-display font-black text-white mb-8 text-center">Supported Examination Universe</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <h3 className="text-xl font-bold text-brand-400 mb-2">UPSC Civil Services</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                          Comprehensive Previous Year Questions (PYQ) for Prelims and Mains. Cover History, Polity, Geography, and Current Affairs with AI-generated explanations.
                      </p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <h3 className="text-xl font-bold text-green-400 mb-2">JEE Mains & Advanced</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                          Master Physics, Chemistry, and Mathematics. Solve numericals instantly with our AI Doubt Solver and practice chapter-wise mock tests.
                      </p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <h3 className="text-xl font-bold text-pink-400 mb-2">NEET Medical</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                          Biology, Physics, and Chemistry questions from last 10 years. Special focus on NCERT-based patterns for 2026 preparation.
                      </p>
                  </div>
              </div>

              {/* FAQ Section Visual */}
              <div className="max-w-3xl mx-auto mb-16">
                  <h3 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                      <details className="bg-white/5 rounded-2xl p-4 border border-white/10 cursor-pointer group">
                          <summary className="font-bold text-white flex justify-between items-center list-none">
                              Is PYQverse free?
                              <span className="group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <p className="text-slate-400 text-sm mt-2">Yes, the core practice and doubt solving features are completely free.</p>
                      </details>
                      <details className="bg-white/5 rounded-2xl p-4 border border-white/10 cursor-pointer group">
                          <summary className="font-bold text-white flex justify-between items-center list-none">
                              Does it support Hindi?
                              <span className="group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <p className="text-slate-400 text-sm mt-2">Yes, toggle the language button in the dashboard for full Hindi support.</p>
                      </details>
                  </div>
              </div>

              <div className="text-center">
                  <div className="flex flex-wrap justify-center gap-4">
                      {["Instant AI Solutions", "Exam Pattern Analytics", "Daily Streaks", "Leaderboard", "Offline Mode", "Bilingual (Hindi/English)"].map((feat, i) => (
                          <span key={i} className="px-4 py-2 rounded-full bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700">
                              {feat}
                          </span>
                      ))}
                  </div>
              </div>
          </div>
      </section>

      {/* Official Footer */}
      <footer className="w-full bg-slate-950/50 border-t border-white/5 py-12 px-6 relative z-10 backdrop-blur-sm">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <LogoIcon size="sm" className="scale-75" />
               <span className="text-sm font-bold text-white">© 2026 PYQverse AI</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
               <button onClick={() => onNavigate('privacy')} className="hover:text-brand-500 transition-colors">Privacy Policy</button>
               <button onClick={() => onNavigate('terms')} className="hover:text-brand-500 transition-colors">Terms of Service</button>
               <a href="mailto:support@pyqverse.in" className="hover:text-brand-500 transition-colors">Contact Support</a>
            </div>
         </div>
      </footer>

    </div>
  );
};
