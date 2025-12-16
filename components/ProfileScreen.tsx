
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

  const examsList = availableExams.length > 0 ? availableExams : Object.values(ExamType);

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7