
import React, { useState } from 'react';
import { User, UserStats, ExamType } from '../types';
import { Button } from './Button';
import { removeUser } from '../services/storageService';
import { auth } from '../src/firebaseConfig';

interface ProfileScreenProps {
  user: User;
  stats: UserStats;
  selectedExam: ExamType;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  user, 
  stats, 
  onUpdateUser, 
  onBack, 
  onLogout
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile || '');
  const [currentClass, setCurrentClass] = useState(user.currentClass || '');
  const [address, setAddress] = useState(user.address || '');
  const [userState, setUserState] = useState(user.state || '');
  const [pincode, setPincode] = useState(user.pincode || '');

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      onUpdateUser({ ...user, name, mobile, currentClass, address, state: userState, pincode });
      setIsEditing(false);
      setIsLoading(false);
    }, 800);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setName(user.name); setMobile(user.mobile || ''); setCurrentClass(user.currentClass || ''); setAddress(user.address || ''); setUserState(user.state || ''); setPincode(user.pincode || '');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("⚠️ Are you sure? This is permanent.")) return;
    const confirmation = window.prompt("Type 'DELETE' to confirm:");
    if (confirmation !== 'DELETE') return;
    setIsLoading(true);
    try {
        await removeUser(user.id);
        if (auth.currentUser) await auth.currentUser.delete();
    } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') alert("Please Re-Login before deleting.");
        else alert("Failed: " + error.message);
        setIsLoading(false);
    }
  };

  const accuracy = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-slate-500 flex items-center gap-1 font-medium transition-colors">← Back</button>
        <div className="flex gap-2">
            {!isEditing ? (<button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-brand-50 text-brand-600 rounded-lg text-sm font-bold">Edit Profile</button>) : (
                <><button onClick={handleCancel} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Cancel</button><Button onClick={handleSave} isLoading={isLoading} size="sm">Save</Button></>
            )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="mb-4 relative"><div className="w-28 h-28 rounded-full bg-brand-100 flex items-center justify-center text-4xl font-bold text-brand-600">{name.charAt(0).toUpperCase()}</div></div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{user.name}</h2>
                <div className="w-full grid grid-cols-2 gap-2 text-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                    <div><span className="block text-lg font-bold text-brand-purple">{stats.streakCurrent}</span><span className="text-[10px] text-slate-500 uppercase">Streak</span></div>
                    <div><span className="block text-lg font-bold text-brand-green">{accuracy}%</span><span className="text-[10px] text-slate-500 uppercase">Accuracy</span></div>
                </div>
            </div>
        </div>
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Personal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input disabled={!isEditing} value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white" placeholder="Name" />
                    <input disabled={!isEditing} value={mobile} onChange={e => setMobile(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white" placeholder="Mobile" />
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="space-y-3">
                    <button onClick={onLogout} className="w-full flex justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-white font-medium"><span>Sign Out</span></button>
                    <button onClick={handleDeleteAccount} className="w-full flex justify-between p-4 rounded-xl bg-red-50 text-red-600 font-medium border border-red-100"><span>Delete Account</span></button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
