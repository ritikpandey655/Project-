
import React from 'react';

export const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Dynamic Gradient Blobs - Visible in Light & Dark Mode (Adjusted Opacity) */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300/40 dark:bg-purple-900/30 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen animate-blob" 
        style={{ animationDelay: '0s' }}
      ></div>
      
      <div 
        className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-300/40 dark:bg-indigo-900/30 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen animate-blob" 
        style={{ animationDelay: '2s' }}
      ></div>
      
      <div 
        className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-300/40 dark:bg-blue-900/30 rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen animate-blob" 
        style={{ animationDelay: '4s' }}
      ></div>

      {/* Floating Particles - Stars (Dark Mode Only) */}
      <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 bg-white/40 rounded-full animate-float hidden dark:block" style={{ animationDuration: '8s' }}></div>
      <div className="absolute top-[40%] right-[20%] w-1 h-1 bg-white/30 rounded-full animate-float hidden dark:block" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
      <div className="absolute bottom-[20%] left-[10%] w-2 h-2 bg-indigo-400/20 rounded-full animate-pulse hidden dark:block"></div>
      <div className="absolute bottom-[30%] right-[30%] w-1 h-1 bg-white/20 rounded-full animate-float hidden dark:block" style={{ animationDuration: '12s' }}></div>
      
      {/* Subtle Noise Texture for Texture (Optional, very low opacity) */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  );
};
