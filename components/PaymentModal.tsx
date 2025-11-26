
import React, { useState } from 'react';
import { SUBSCRIPTION_PLANS } from '../constants';
import { Button } from './Button';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = 'card' | 'upi' | 'netbanking';

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(SUBSCRIPTION_PLANS.find(p => p.recommended)?.id || SUBSCRIPTION_PLANS[0].id);
  const [step, setStep] = useState<'plans' | 'payment' | 'success'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId);

  const validateForm = () => {
    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.length < 16) return "Invalid Card Number";
      if (!expiry || !expiry.includes('/')) return "Invalid Expiry Date";
      if (!cvv || cvv.length < 3) return "Invalid CVV";
      if (!cardName) return "Enter Card Holder Name";
    }
    if (paymentMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) return "Invalid UPI ID";
    }
    return null;
  };

  const handlePayment = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsProcessing(true);

    /**
     * ------------------------------------------------------------------
     * 🔴 REAL PAYMENT INTEGRATION GUIDE (Razorpay Example)
     * ------------------------------------------------------------------
     * To go live, replace the setTimeout below with your Gateway logic.
     */

    // --- SIMULATION (Active) ---
    setTimeout(() => {
      setIsProcessing(false);
      setStep('success');
    }, 2500);
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-12 text-center shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
           <div className="relative w-16 h-16 mb-6">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-500 animate-spin-slow">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-2xl animate-bounce">⏳</div>
           </div>
           <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Processing...</h3>
           <p className="text-slate-500 text-sm">Securing your premium access</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-pop-in border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            You are now a Pro member. <br/> Transaction ID: #TXN_{Math.floor(Math.random()*1000000)}
          </p>
          <Button onClick={onSuccess} className="w-full py-3 text-lg shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700">
            Start Learning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-slate-200 dark:border-slate-700">
        
        {/* Left Side - Plan Selection / Summary */}
        <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-800 p-6 sm:p-8 flex flex-col border-r border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[30vh] md:max-h-full">
          <button onClick={onClose} className="md:hidden text-slate-500 mb-4 flex items-center gap-1 hover:text-slate-800 dark:hover:text-white transition-colors sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 py-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back
          </button>
          
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Upgrade to Pro</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Unlock AI generation & analytics.</p>
          </div>

          <div className="space-y-4 flex-1">
            {SUBSCRIPTION_PLANS.map(plan => (
              <div 
                key={plan.id}
                onClick={() => { setSelectedPlanId(plan.id); setStep('plans'); }}
                className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPlanId === plan.id 
                    ? 'border-indigo-600 bg-white dark:bg-slate-700 shadow-lg ring-1 ring-indigo-600 scale-[1.02]' 
                    : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800/50'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Recommended
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold ${selectedPlanId === plan.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {plan.name}
                  </h3>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">{plan.currency}{plan.price}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/{plan.duration}</span>
                  </div>
                </div>
                <ul className="space-y-1.5 hidden sm:block">
                  {plan.features.slice(0, 3).map((feat, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Checkout Form */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 flex flex-col bg-white dark:bg-slate-900 relative overflow-y-auto h-full">
          
          {/* Close Button Desktop */}
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 hidden md:block text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="mb-4">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white">Checkout Details</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400">Complete your purchase safely.</p>
          </div>

          <div className="mb-4 flex space-x-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['card', 'upi', 'netbanking'] as PaymentMethod[]).map(method => (
              <button
                key={method}
                onClick={() => { setPaymentMethod(method); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  paymentMethod === method 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {method === 'card' ? 'Card' : method === 'upi' ? 'UPI' : 'Net Banking'}
              </button>
            ))}
          </div>

          <div className="flex-1">
            {paymentMethod === 'card' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Card Number</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="0000 0000 0000 0000" 
                      maxLength={19}
                      value={cardNumber}
                      onChange={e => {
                         const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                         setCardNumber(v.slice(0, 19));
                      }}
                      className="w-full p-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Card Holder Name</label>
                  <input 
                      type="text" 
                      placeholder="John Doe" 
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input 
                      type="text" 
                      placeholder="MM/YY" 
                      maxLength={5}
                      value={expiry}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if(v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4);
                        setExpiry(v);
                      }}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CVV</label>
                    <input 
                      type="password" 
                      placeholder="123" 
                      maxLength={3}
                      value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0,3))}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center tracking-widest"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="space-y-4 animate-fade-in py-4">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">UPI ID / VPA</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="username@bank" 
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    className="w-full p-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="absolute left-3 top-3.5 text-slate-400 font-bold text-xs">@</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-sm text-indigo-700 dark:text-indigo-300 flex items-start gap-3">
                  <div className="mt-0.5">ℹ️</div>
                  <p>A payment request will be sent to this ID. Open your UPI app (GPay, PhonePe, Paytm) to approve.</p>
                </div>
              </div>
            )}

            {paymentMethod === 'netbanking' && (
               <div className="grid grid-cols-2 gap-3 animate-fade-in py-2">
                 {['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Other'].map(bank => (
                   <div key={bank} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {bank[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{bank}</span>
                   </div>
                 ))}
               </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center font-medium animate-shake">
                {error}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs px-3 py-2 rounded-lg mb-4 flex items-center gap-2 border border-amber-100 dark:border-amber-800/30">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>Demo Mode Active:</strong> No real money will be deducted.</span>
            </div>

            <div className="flex justify-between items-center mb-4">
               <span className="text-slate-500 dark:text-slate-400 font-medium">Total Payable</span>
               <span className="text-3xl font-bold text-slate-900 dark:text-white">{selectedPlan?.currency}{selectedPlan?.price}</span>
            </div>
            <Button 
              onClick={handlePayment} 
              className="w-full py-4 text-lg font-bold shadow-xl shadow-indigo-500/20 transition-transform active:scale-[0.98]"
            >
              Confirm & Pay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
