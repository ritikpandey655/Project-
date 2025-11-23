
import React from 'react';
import { User, UserStats } from '../types';
import { THEME_PALETTES } from '../constants';
import { Button } from './Button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  stats: UserStats;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  showTimer: boolean;
  onToggleTimer: () => void;
  language: 'en' | 'hi';
  onToggleLanguage: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onNavigate: (view: any) => void;
  onLogout: () => void;
  onInstall?: () => void;
  canInstall?: boolean;
  onEnableNotifications: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  user,
  stats,
  darkMode,
  onToggleDarkMode,
  showTimer,
  onToggleTimer,
  language,
  onToggleLanguage,
  currentTheme,
  onThemeChange,
  onNavigate,
  onLogout,
  onInstall,
  canInstall,
  onEnableNotifications
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-[80%] sm:w-[320px] bg-white dark:bg-slate-900 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding Header (Replaces User Profile) */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden shrink-0 flex items-center gap-4">
           {/* Decorative Background */}
           <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none"></div>

           <div className="relative z-10 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10">
              <span className="font-display font-bold text-xl text-white">PV</span>
           </div>
           <div className="relative z-10">
              <h2 className="font-display font-bold text-2xl tracking-tight leading-none">PYQverse</h2>
              <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-medium mt-1">Exam Universe</p>
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
           
           {/* Navigation */}
           <div className="space-y-1">
              <button onClick={() => { onNavigate('dashboard'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">🏠</span>
                 <span className="font-medium">Dashboard</span>
              </button>
              {/* Profile Link Removed */}
              <button onClick={() => { onNavigate('upload'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">📚</span>
                 <span className="font-medium">My Notes</span>
              </button>
           </div>

           <hr className="border-slate-200 dark:border-slate-700" />

           {/* Settings */}
           <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Preferences</h3>
              
              {/* Theme */}
              <div className="px-3 mb-4">
                 <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">App Theme</p>
                 <div className="flex flex-wrap gap-2">
                    {Object.keys(THEME_PALETTES).map(theme => (
                      <button
                          key={theme}
                          onClick={() => onThemeChange(theme)}
                          className={`w-6 h-6 rounded-full border-2 ${currentTheme === theme ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: THEME_PALETTES[theme][500] }}
                      />
                    ))}
                 </div>
              </div>

              {/* Toggles */}
              <div className="space-y-1">
                 <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                       <span className="text-lg">🌙</span>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Dark Mode</span>
                    </div>
                    <button 
                      onClick={onToggleDarkMode}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                 </div>

                 <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                       <span className="text-lg">🗣️</span>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Language (Hindi)</span>
                    </div>
                    <button 
                      onClick={onToggleLanguage}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${language === 'hi' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${language === 'hi' ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                 </div>

                 <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                       <span className="text-lg">⏱️</span>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Practice Timer</span>
                    </div>
                    <button 
                      onClick={onToggleTimer}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showTimer ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showTimer ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                 </div>

                 <button 
                    onClick={onEnableNotifications}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left"
                 >
                    <div className="flex items-center gap-3">
                       <span className="text-lg">🔔</span>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Notifications</span>
                    </div>
                    <span className="text-xs text-indigo-500 font-bold">ENABLE</span>
                 </button>
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/50">
           {canInstall && onInstall && (
             <Button onClick={onInstall} className="w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-none">
                Install App
             </Button>
           )}
           <button 
             onClick={onLogout}
             className="w-full py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
           >
             Sign Out
           </button>
           <div className="text-center">
             <p className="text-[10px] text-slate-400">PYQverse v1.0.0</p>
           </div>
        </div>

      </div>
    </>
  );
};
