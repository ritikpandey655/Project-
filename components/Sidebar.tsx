
import React from 'react';
import { User, UserStats } from '../types';
import { THEME_PALETTES, TRANSLATIONS } from '../constants';
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
  const t = TRANSLATIONS[language];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel - Now on the RIGHT */}
      <div 
        className={`fixed top-0 right-0 h-full w-[85%] sm:w-[350px] bg-white dark:bg-slate-900 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Profile Header (Restored on Right) */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden shrink-0">
           {/* Decorative Background */}
           <div className="absolute top-[-20%] left-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none"></div>

           <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full border-4 border-white/20 shadow-lg overflow-hidden mb-3 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                 {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                    <span className="text-3xl font-bold text-white">{user?.name?.[0]}</span>
                 )}
              </div>
              <h2 className="font-display font-bold text-xl tracking-tight leading-none">{user?.name}</h2>
              <p className="text-sm text-indigo-100 mt-1 opacity-90">{user?.email}</p>
              
              <button 
                onClick={() => { onNavigate('profile'); onClose(); }}
                className="mt-4 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md transition-colors border border-white/20"
              >
                Edit Profile
              </button>
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
           
           {/* Navigation */}
           <div className="space-y-1">
              <button onClick={() => { onNavigate('dashboard'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">🏠</span>
                 <span className="font-medium">{t.dashboard}</span>
              </button>
              <button onClick={() => { onNavigate('upload'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">📚</span>
                 <span className="font-medium">{t.myNotes}</span>
              </button>
              <button onClick={() => { onNavigate('downloads'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">📥</span>
                 <span className="font-medium">{t.downloads}</span>
              </button>
              {user?.isAdmin && (
                <button onClick={() => { onNavigate('admin'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 transition-colors mt-2">
                   <span className="text-xl">🛡️</span>
                   <span className="font-bold">{t.adminPanel}</span>
                </button>
              )}
           </div>

           <hr className="border-slate-200 dark:border-slate-700" />

           {/* Settings */}
           <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">{t.preferences}</h3>
              
              {/* Theme */}
              <div className="px-3 mb-4">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.colorTheme}</p>
                    <span className="text-xs text-slate-400">{currentTheme}</span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {Object.keys(THEME_PALETTES).map(theme => (
                      <button
                          key={theme}
                          onClick={() => onThemeChange(theme)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${currentTheme === theme ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 border-white shadow-md' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: THEME_PALETTES[theme][500] }}
                          title={theme}
                      />
                    ))}
                 </div>
              </div>

              {/* Toggles */}
              <div className="space-y-1">
                 <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                       <span className="text-lg">🌙</span>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.darkMode}</span>
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
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.language} (Hindi)</span>
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
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.timer}</span>
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
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.notifications}</span>
                    </div>
                    <span className="text-xs text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">ENABLE</span>
                 </button>
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/50">
           {canInstall && onInstall && (
             <Button onClick={onInstall} className="w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-none">
                {t.install}
             </Button>
           )}
           <button 
             onClick={onLogout}
             className="w-full py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center justify-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
             </svg>
             {t.signOut}
           </button>
        </div>

      </div>
    </>
  );
};
