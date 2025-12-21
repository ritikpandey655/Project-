import React from 'react';

interface LogoIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ size = "md", className = "" }) => {
  const dimensions = size === "sm" ? "w-12 h-12" : size === "md" ? "w-28 h-28" : "w-36 h-36";
  const fontSize = size === "sm" ? "text-xl" : size === "md" ? "text-4xl" : "text-5xl";
  const ballSize = size === "sm" ? "w-1.5 h-1.5" : size === "md" ? "w-3 h-3" : "w-4 h-4";
  
  return (
    <div className={`relative ${dimensions} flex items-center justify-center ${className}`}>
      {/* Outer Orbit Ring with 2 Balls */}
      <div className="absolute inset-0 border border-orange-500/30 rounded-full animate-spin-slow">
        {/* Ball 1 (Top) */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${ballSize} bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-[0_0_20px_rgba(251,146,60,1)]`}></div>
        {/* Ball 2 (Bottom - 180 degrees opposite) */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 ${ballSize} bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-[0_0_20px_rgba(251,146,60,1)]`}></div>
      </div>
      
      {/* Secondary Inner Orbit (Anti-clockwise) */}
      <div className="absolute inset-4 border border-indigo-500/20 rounded-full animate-[spin_12s_linear_infinite_reverse]">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
      </div>

      {/* Center Glow Layer */}
      <div className="absolute inset-4 bg-orange-600/15 rounded-full blur-3xl animate-pulse-glow"></div>

      {/* Central Core Block */}
      <div className="relative z-10 w-3/4 h-3/4 bg-gradient-to-br from-orange-500 via-red-600 to-indigo-800 rounded-[22%] shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center justify-center border-2 border-white/20 transform rotate-12 animate-float">
        <span className={`${fontSize} font-black text-white font-display -rotate-12 tracking-tighter drop-shadow-lg select-none`}>PV</span>
      </div>
    </div>
  );
};
