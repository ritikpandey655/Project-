
import React from 'react';
import { ViewState } from '../types';

interface MobileBottomNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onAction?: (action: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onNavigate, onAction }) => {
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'practice-action', icon: '⚡', label: 'Start', isAction: true },
    { id: 'upload', icon: '💡', label: 'Doubts' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-4 z-40 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center h-16">
        {navItems.map((item) => {
          if (item.isAction) {
             return (
               <div key={item.id} className="relative -top-6">
                 <button
                   onClick={() => onAction && onAction('practice')}
                   className="bg-brand-purple text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-xl shadow-brand-purple/40 border-4 border-white dark:border-slate-900 transform active:scale-95 transition-transform"
                 >
                   {item.icon}
                 </button>
               </div>
             )
          }
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewState)}
              className={`flex flex-col items-center gap-1 w-14 transition-colors ${
                isActive ? 'text-brand-purple' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
