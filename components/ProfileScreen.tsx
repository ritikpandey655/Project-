
import React, { useState, useEffect } from 'react';
import { User, UserStats, ExamType } from '../types';
import { Button } from './Button';
import { getUserQuestions, removeUser } from '../services/storageService';
import { auth } from '../src/firebaseConfig';

interface ProfileScreenProps {
  user: User;
  stats: UserStats;
  selectedExam: ExamType;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
  onLogout: () => void;
  onInstall?: () => void;
  canInstall?: boolean;
  onExamChange: (exam: ExamType) => void;
  availableExams?: string[];
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  user, 
  stats, 
  selectedExam, 
  onUpdateUser, 
  onBack, 
  onLogout,
  onInstall,
  canInstall,
  onExamChange,
  availableExams = []
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notesCount, setNotesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Editable Fields State
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile || '');
  const [currentClass, setCurrentClass] = useState(user.currentClass || '');
  const [address, setAddress] = useState(user.address || '');
  const [userState, setUserState] = useState(user.state || '');
  const [pincode, setPincode] = useState(user.pincode || '');

  useEffect(() => {
    // Calculate total questions uploaded by user
    const loadQuestions = async () => {
        const questions = await getUserQuestions(user.id);
        setNotesCount(questions.length);
    };
    loadQuestions();
  }, [user.id]);

  const handleSave = () => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      onUpdateUser({
        ...user,
        name,
        email,
        mobile,
        currentClass,
        address,
        state: userState,
        pincode
      });
      setIsEditing(false);
      setIsLoading(false);
    }, 800);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form
    setName(user.name);
    setEmail(user.email);
    setMobile(user.mobile || '');
    setCurrentClass(user.currentClass || '');
    setAddress(user.address || '');
    setUserState(user.state || '');
    setPincode(user.pincode || '');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("⚠️ Are you sure you want to delete your account? This action CANNOT be undone and you will lose all your progress.")) return;
    
    const confirmation = window.prompt("Type 'DELETE' to confirm account deletion:");
    if (confirmation !== 'DELETE') return;

    setIsLoading(true);
    try {
        // 1. Delete Firestore Data
        await removeUser(user.id);
        
        // 2. Delete Auth User
        if (auth.currentUser) {
            await auth.currentUser.delete();
        }
        // Redirect handled by onAuthStateChanged in App.tsx
    } catch (error: any) {
        console.error("Delete Account Error:", error);
        if (error.code === 'auth/requires-recent-login') {
            alert("Security Requirement: Please Sign Out and Log In again before deleting your account.");
        } else {
            alert("Failed to delete account: " + error.message);
        }
        setIsLoading(false);
    }
  };

  const accuracy = stats.totalAttempted > 0 
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) 
    : 0;

  // Initial Avatar Component
  const renderAvatar = () => {
    return (
      <div className={`w-28 h-28 rounded-full border-4 border-white dark:border-slate-800 shadow-md flex items-center justify-center text-4xl font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex gap-2">
            {!isEditing ? (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    Edit Profile
                </button>
            ) : (
                <>
                    <button 
                        onClick={handleCancel}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <Button onClick={handleSave} isLoading={isLoading} size="sm">Save Changes</Button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Basic Stats */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
                <div className="mb-4 relative">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-28 h-28 rounded-full border-4 border-white dark:border-slate-800 shadow-md object-cover" />
                    ) : renderAvatar()}
                    {user.isPro && (
                        <div className="absolute bottom-0 right-0 bg-brand-yellow text-slate-900 text-xs font-bold px-2 py-1 rounded-full border-2 border-white dark:border-slate-800">
                            PRO
                        </div>
                    )}
                </div>
                
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{user.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{user.email}</p>
                
                <div className="w-full grid grid-cols-2 gap-2 text-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                    <div>
                        <span className="block text-lg font-bold text-brand-purple">{stats.streakCurrent}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Day Streak</span>
                    </div>
                    <div>
                        <span className="block text-lg font-bold text-brand-green">{accuracy}%</span>
                        <span className="text-[10px] text-slate-500 uppercase">Accuracy</span>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-indigo-100 text-xs font-bold uppercase mb-1">Current Goal</p>
                    <h3 className="text-2xl font-bold font-display mb-4">{selectedExam}</h3>
                    <div className="flex items-center gap-2 text-sm bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <span>🎯</span>
                        <span>Target: 2025 Exam</span>
                    </div>
                </div>
                <div className="absolute -right-4 -bottom-4 text-9xl opacity-20">🎯</div>
            </div>
        </div>

        {/* Right Column: Details Form */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <span>📝</span> Personal Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Full Name</label>
                        <input 
                            disabled={!isEditing}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Mobile Number</label>
                        <input 
                            disabled={!isEditing}
                            value={mobile}
                            onChange={e => setMobile(e.target.value)}
                            placeholder="+91"
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Class / Education</label>
                        <input 
                            disabled={!isEditing}
                            value={currentClass}
                            onChange={e => setCurrentClass(e.target.value)}
                            placeholder="e.g. 12th Grade"
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">State</label>
                        <input 
                            disabled={!isEditing}
                            value={userState}
                            onChange={e => setUserState(e.target.value)}
                            placeholder="e.g. Uttar Pradesh"
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Address</label>
                        <textarea 
                            disabled={!isEditing}
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            rows={2}
                            placeholder="Full Address"
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <span>⚙️</span> Account Settings
                </h3>
                
                <div className="space-y-3">
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium transition-colors"
                    >
                        <span>Sign Out</span>
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                    
                    <button 
                        onClick={handleDeleteAccount}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium transition-colors border border-red-100 dark:border-red-900/30"
                    >
                        <span>Delete Account</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
