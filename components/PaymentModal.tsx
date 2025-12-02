
import React from 'react';
import { Button } from './Button';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700 relative overflow-hidden text-center">
        
        {/* Background Decoration */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none animate-pulse"></div>

        <div className="relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30 animate-float">
                <span className="text-4xl">🚀</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white mb-3">
                Premium Coming Soon
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm sm:text-base">
                We are crafting the ultimate study experience with <strong>Unlimited AI Generation</strong>, <strong>Offline Downloads</strong>, and <strong>Deep Analytics</strong>.
                <br/><br/>
                The payment gateway is currently under integration. Stay tuned for the launch!
            </p>

            <div className="flex flex-col gap-3">
                <Button 
                    onClick={onClose} 
                    className="w-full py-3.5 text-lg font-bold shadow-xl shadow-indigo-500/20"
                >
                    Notify Me When Ready
                </Button>
                <button 
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
