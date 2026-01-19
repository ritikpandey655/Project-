
import React from 'react';

interface LogoIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ size = "md", className = "" }) => {
  const dimensions = size === "sm" ? "w-10 h-10" : size === "md" ? "w-24 h-24" : "w-32 h-32";
  const ballSize = size === "sm" ? "w-1.5 h-1.5" : size === "md" ? "w-3 h-3" : "w-4 h-4";
  
  return (
    <div className={`relative ${dimensions} flex items-center justify-center ${className}`}>
      {/* Outer Crystalline Ring (Slow) */}
      <div className="absolute inset-[-10%] border-[0.5px] border-brand-500/10 rounded-full animate-[spin_20s_linear_infinite]"></div>

      {/* Orbit Ring (Fast) */}
      <div className="absolute inset-0 border-[1.5px] border-brand-500/20 rounded-full animate-[spin_8s_linear_infinite]">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${ballSize} bg-brand-400 rounded-full shadow-[0_0_15px_var(--brand-primary)] animate-pulse`}></div>
      </div>
      
      {/* Counter-Orbit Ring */}
      <div className="absolute inset-2 border border-pink-500/10 rounded-full animate-[spin_12s_linear_infinite_reverse]">
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 ${size === 'sm' ? 'w-1 h-1' : 'w-2 h-2'} bg-pink-400 rounded-full`}></div>
      </div>

      {/* Center Deep Glow */}
      <div className="absolute inset-4 bg-brand-600/10 rounded-full blur-2xl animate-pulse-glow"></div>

      {/* The Main Icon Image - Animation Restored */}
      <div className="relative z-10 w-4/5 h-4/5 flex items-center justify-center animate-float">
        <img 
          src="/icon-512.png" 
          alt="PYQverse" 
          className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(91,46,255,0.3)] rounded-2xl"
        />
      </div>
    </div>
  );
};
