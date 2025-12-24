
import React from 'react';

interface LogoIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ size = "md", className = "" }) => {
  const dimensions = size === "sm" ? "w-10 h-10" : size === "md" ? "w-24 h-24" : "w-32 h-32";
  const fontSize = size === "sm" ? "text-lg" : size === "md" ? "text-3xl" : "text-4xl";
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

      {/* The Main "Glass" Core */}
      <div className="relative z-10 w-4/5 h-4/5 bg-gradient-to-br from-brand-500 via-brand-600 to-pink-500 rounded-[28%] shadow-[0_25px_60px_-15px_rgba(79,70,229,0.4)] flex items-center justify-center border border-white/20 transform rotate-[10deg] hover:rotate-0 transition-all duration-500 animate-float backdrop-blur-sm">
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-[inherit]"></div>
        
        <span className={`${fontSize} font-black text-white font-display -rotate-[10deg] tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none`}>PV</span>
      </div>
    </div>
  );
};
