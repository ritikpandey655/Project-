import React from 'react';

export const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-slate-950">
      {/* Sci-Fi Universe Orbs */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[100px] animate-blob" 
        style={{ animationDelay: '0s' }}
      ></div>
      
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-blob" 
        style={{ animationDelay: '2s' }}
      ></div>

      <div 
        className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-pink-600/20 rounded-full blur-[80px] animate-blob" 
        style={{ animationDelay: '4s' }}
      ></div>

      {/* Star Field */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
      
      {/* Grid Overlay for Tech Feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
    </div>
  );
};