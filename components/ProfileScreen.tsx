import React, { useState, useEffect } from 'react';
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
  onInstall?: () => void;
  canInstall?: boolean;
  onExamChange: (exam: ExamType) => void;
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
  onExamChange
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
        <div className="flex gap-3">
           {isEditing ? (
             <>
                <Button variant="ghost" onClick={handleCancel} className="dark:text-slate-300 dark:hover:text-white">Cancel</Button>
                <Button onClick={handleSave} isLoading={isLoading}>Save Changes</Button>
             </>
           ) : (
             <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Identity & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center relative overflow-hidden transition-colors">
            <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            
            {/* Avatar Container */}
            <div className="relative z-10 mb-3 mt-4">
               {renderAvatar()}
            </div>

            <div className="w-full relative z-10 flex flex-col items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{name}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{email}</p>
              
              {/* Exam Selector / Badge */}
              {!user.isPro ? (
                 <div className="mt-3 relative">
                    <select 
                      value={selectedExam}
                      onChange={(e) => onExamChange(e.target.value as ExamType)}
                      className="appearance-none bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-4 py-1.5 rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-center pr-8"
                    >
                      {Object.values(ExamType).map(e => (
                         <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none text-[10px]">▼</span>
                 </div>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 mt-3">
                   Target: {selectedExam}
                </span>
              )}
              
              {user.isPro && (
                 <p className="text-[10px] text-amber-500 mt-2 font-bold flex items-center gap-1">
                   <span>🔒</span> Exam locked due to Pro Plan
                 </p>
              )}
            </div>
          </div>

          {canInstall && onInstall && (
            <button 
              onClick={onInstall}
              className="w-full p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-medium text-sm flex items-center justify-center gap-2 bg-white dark:bg-slate-800 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Install App
            </button>
          )}

          {/* Logout Button */}
          <button 
            onClick={onLogout}
            className="w-full p-3 rounded-xl border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm flex items-center justify-center gap-2 bg-white dark:bg-slate-800 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* Right Column: Details & Stats */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Personal Details Section */}
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
               <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
               Personal Details
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
               {/* Name */}
               <div>
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                 {isEditing ? (
                   <input 
                     type="text" 
                     value={name} 
                     onChange={(e) => setName(e.target.value)}
                     className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 ) : (
                   <p className="text-slate-800 dark:text-white font-medium border-b border-slate-100 dark:border-slate-700 pb-1">{name}</p>
                 )}
               </div>

               {/* Email */}
               <div>
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                 {isEditing ? (
                   <input 
                     type="email" 
                     value={email} 
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 ) : (
                   <p className="text-slate-800 dark:text-white font-medium border-b border-slate-100 dark:border-slate-700 pb-1">{email}</p>
                 )}
               </div>

               {/* Mobile */}
               <div>
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Mobile Number</label>
                 {isEditing ? (
                   <input 
                     type="tel" 
                     value={mobile} 
                     onChange={(e) => setMobile(e.target.value)}
                     placeholder="+91 XXXXX XXXXX"
                     className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 ) : (
                   <p className={`text-slate-800 dark:text-white font-medium border-b border-slate-100 dark:border-slate-700 pb-1 ${!mobile && 'text-slate-400 italic'}`}>
                     {mobile || 'Not added'}
                   </p>
                 )}
               </div>

               {/* Class */}
               <div>
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Class / Grade</label>
                 {isEditing ? (
                   <input 
                     type="text" 
                     value={currentClass} 
                     onChange={(e) => setCurrentClass(e.target.value)}
                     placeholder="e.g. 12th, Graduate"
                     className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 ) : (
                   <p className={`text-slate-800 dark:text-white font-medium border-b border-slate-100 dark:border-slate-700 pb-1 ${!currentClass && 'text-slate-400 italic'}`}>
                     {currentClass || 'Not added'}
                   </p>
                 )}
               </div>

               {/* Address */}
               <div className="md:col-span-2">
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Address</label>
                 {isEditing ? (
                   <input 
                     type="text" 
                     value={address} 
                     onChange={(e) => setAddress(e.target.value)}
                     placeholder="House No, Street, Locality"
                     className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 ) : (
                   <p className={`text-slate-800 dark:text-white font-medium border-b border-slate-100 dark:border-slate-700 pb-1 ${!address && 'text-slate-400 italic'}`}>
                     {address || 'Not added'}
                   </p>
                 )}
               </div>

               {/* State */}
               <div>
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">State</label>
                 {isEditing ? (
                   <input 
                     type="text" 
                     value={userState} 
                     onChange={(e) => setUserState(e.target.value)}
                     placeholder="e.g. Maharashtra"
                     className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 ) : (
                   <p className={`text-slate-800 dark:text-white font-medium border-b border-slate-100 dark:border-slate-700 pb-1 ${!userState && 'text-slate-400 italic'}`}>
                     {userState || 'Not added'}
                   </p>
                 )}
               </div>

               {/* Pin Code */}
               <div>
                 <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Pin Code</label>
                 {isEditing ? (
                   <input 
                     type="text" 
                     value={pincode} 
                     onChange={(e) => setPincode(e.target.value)}
                     placeholder="XXXXXX"
                     className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                 ) : (
                   <p className={`text-slate-800 dark:text-white font-medium border-b border-slate-100 dark:border-slate-700 pb-1 ${!pincode && 'text-slate-400 italic'}`}>
                     {pincode || 'Not added'}
                   </p>
                 )}
               </div>

             </div>
           </div>

           {/* Stats Section */}
           <div>
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Activity Summary</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Card 1 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
                   <div className="text-2xl mb-1">📝</div>
                   <div className="text-xl font-bold text-slate-800 dark:text-white">{notesCount}</div>
                   <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Notes</div>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
                   <div className="text-2xl mb-1">✅</div>
                   <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.totalAttempted}</div>
                   <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Solved</div>
                </div>

                {/* Card 3 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
                   <div className="text-2xl mb-1">🎯</div>
                   <div className="text-xl font-bold text-slate-800 dark:text-white">{accuracy}%</div>
                   <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Accuracy</div>
                </div>

                {/* Card 4 */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
                   <div className="text-2xl mb-1">🔥</div>
                   <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.streakCurrent}</div>
                   <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Streak</div>
                </div>
             </div>
           </div>

        </div>
      </div>
    </div>
  );
};