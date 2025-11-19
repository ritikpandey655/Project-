
import React, { useState, useRef, useEffect } from 'react';
import { User, UserStats, ExamType } from '../types';
import { Button } from './Button';
import { getUserQuestions } from '../services/storageService';

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
  selectedExam, 
  onUpdateUser, 
  onBack, 
  onLogout 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [notesCount, setNotesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Calculate total questions uploaded by user
    const questions = getUserQuestions(user.id);
    setNotesCount(questions.length);
  }, [user.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      onUpdateUser({
        ...user,
        name,
        photoURL: photoURL || undefined
      });
      setIsEditing(false);
      setIsLoading(false);
    }, 800);
  };

  const accuracy = stats.totalAttempted > 0 
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex gap-3">
           {isEditing ? (
             <>
                <Button variant="ghost" onClick={() => {
                  setIsEditing(false);
                  setName(user.name);
                  setPhotoURL(user.photoURL || '');
                }}>Cancel</Button>
                <Button onClick={handleSave} isLoading={isLoading}>Save Changes</Button>
             </>
           ) : (
             <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: User Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-indigo-50"></div>
            
            {/* Avatar */}
            <div className="relative z-10 mb-4 group">
               <div className={`w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-indigo-100 flex items-center justify-center ${isEditing ? 'cursor-pointer' : ''}`}
                 onClick={() => isEditing && fileInputRef.current?.click()}
               >
                 {photoURL ? (
                   <img src={photoURL} alt={name} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-4xl font-bold text-indigo-300">{name.charAt(0).toUpperCase()}</span>
                 )}
                 
                 {isEditing && (
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                   </div>
                 )}
               </div>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={!isEditing} />
            </div>

            {/* Info Fields */}
            <div className="w-full space-y-3 relative z-10 flex flex-col items-center">
              {isEditing ? (
                <>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-center font-bold text-xl text-slate-800 border-b-2 border-indigo-200 focus:border-indigo-500 outline-none bg-transparent pb-1"
                    placeholder="Your Name"
                  />
                  
                  <div className="w-full max-w-xs">
                    <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Photo URL</label>
                    <input 
                       type="text"
                       value={photoURL}
                       onChange={(e) => setPhotoURL(e.target.value)}
                       placeholder="https://example.com/image.png"
                       className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                    />
                  </div>
                </>
              ) : (
                <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
              )}
              
              {!isEditing && <p className="text-slate-500 text-sm">{user.email}</p>}
              
              <div className="pt-2 pb-2">
                 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    🎯 Target: {selectedExam}
                 </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button 
            onClick={onLogout}
            className="w-full p-3 rounded-xl border border-red-100 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* Right Column: Stats */}
        <div className="md:col-span-2 space-y-6">
           <h3 className="text-lg font-bold text-slate-800">Performance Overview</h3>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Stat Card 1: Notes Added */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
                    📝
                 </div>
                 <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Notes Added</p>
                    <p className="text-2xl font-bold text-slate-800">{notesCount}</p>
                 </div>
              </div>

              {/* Stat Card 2: Questions Solved */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
                    ✅
                 </div>
                 <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Questions Solved</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalAttempted}</p>
                 </div>
              </div>

              {/* Stat Card 3: Accuracy */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl">
                    🎯
                 </div>
                 <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Global Accuracy</p>
                    <p className="text-2xl font-bold text-slate-800">{accuracy}%</p>
                 </div>
              </div>

              {/* Stat Card 4: Streak */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl">
                    🔥
                 </div>
                 <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Current Streak</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.streakCurrent} Days</p>
                 </div>
              </div>
           </div>

           {/* Placeholder for Future "Sessions History" or detailed charts */}
           <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
              <h4 className="font-bold text-indigo-900 mb-2">Keep it up!</h4>
              <p className="text-sm text-indigo-700 opacity-90">
                 You have solved <strong>{stats.totalCorrect}</strong> questions correctly out of <strong>{stats.totalAttempted}</strong>. 
                 Uploading more personal notes helps the AI customize your revision plan better.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
