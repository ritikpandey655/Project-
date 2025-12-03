
import React from 'react';
import { Button } from './Button';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors z-10"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        {/* Content */}
        <div className="p-8 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-brand-purple to-brand-blue rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20 transform rotate-3">
                <span className="text-4xl">🚀</span>
            </div>
            
            <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
                Pro Plan Coming Soon
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                We are finalizing the ultimate exam preparation experience. <br/>
                <strong>Unlimited AI Questions, Offline Mode, and more</strong> are just around the corner.
            </p>

            <div className="w-full space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">What's Coming</p>
                    <div className="flex justify-center gap-4 text-2xl">
                        <span title="Unlimited AI">♾️</span>
                        <span title="Offline Downloads">📥</span>
                        <span title="Detailed Analytics">📊</span>
                        <span title="Ad-Free">🚫</span>
                    </div>
                </div>

                <Button onClick={onClose} className="w-full py-3.5 text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none">
                    Notify Me When Live
                </Button>
                
                <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors pt-2">
                    Maybe Later
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
