import React, { useEffect, useState } from 'react';
import { User, UserStats } from '../types';
import { THEME_PALETTES, TRANSLATIONS } from '../constants';

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
  onEnableNotifications: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onClose,
  user,
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
  onEnableNotifications
}) => {
  const t = TRANSLATIONS[language];
  const [notifState, setNotifState] = useState('default');

  useEffect(() => {
     if ('Notification' in window) {
        setNotifState(Notification.permission);
     }
  }, [isOpen]);

  const handleNotifClick = () => {
    onEnableNotifications();
    setTimeout(() => {
        if ('Notification' in window) setNotifState(Notification.permission);
    }, 1000);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div 
        className={`fixed top-0 right-0 h-full w-[85%] sm:w-[350px] bg-white dark:bg-slate-900 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 pt-safe bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden shrink-0">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
           <div className="space-y-1">
              <button onClick={() => { onNavigate('dashboard'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">🏠</span>
                 <span className="font-medium">{t.dashboard}</span>
              </button>
              <button onClick={() => { onNavigate('upload'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">📚</span>
                 <span className="font-medium">{t.myNotes}</span>
              </button>
              
              <button onClick={() => { onNavigate('privacy'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">🔒</span>
                 <span className="font-medium">Privacy Policy</span>
              </button>

              <a href="mailto:support@pyqverse.in" onClick={onClose} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors">
                 <span className="text-xl">📧</span>
                 <span className="font-medium">Contact Support</span>
              </a>

              {user?.isAdmin && (
                <button onClick={() => { onNavigate('admin'); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 transition-colors mt-2">
                   <span className="text-xl">🛡️</span>
                   <span className="font-bold">{t.adminPanel}</span>
                </button>
              )}
           </div>

           <hr className="border-slate-200 dark:border-slate-700" />

           <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">{t.preferences}</h3>
              
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
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.language}</span>
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
              </div>
           </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/50 pb-safe">
           <button 
             onClick={onLogout}
             className="w-full py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center justify-center gap-2"
           >
             {t.signOut}
           </button>
        </div>

      </div>
    </>
  );
});