
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Question, QuestionSource, NewsItem, User, Transaction, QuestionType, ExamType } from '../types';
import { 
  getGlobalStats, saveAdminQuestion, getAdminQuestions, 
  saveAdminNews, getAllUsers, removeUser, toggleUserPro, deleteGlobalQuestion,
  getTransactions, saveExamConfig, getExamConfig, updateAdminQuestionStatus
} from '../services/storageService';
import { parseSmartInput } from '../services/geminiService';
import { EXAM_SUBJECTS, NEWS_CATEGORIES } from '../constants';

interface AdminDashboardProps {
  onBack: () => void;
}

// Soft limit for Free Tier safety (Firestore writes/storage)
const STORAGE_QUOTA_LIMIT = 20000; 

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'exams' | 'upload' | 'questions' | 'payments' | 'settings'>('dashboard');
  
  // System Health States
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Connected' | 'Disconnected' | 'Error'>('Checking');
  const [serverType, setServerType] = useState<'Node/Python' | 'Client-Side'>('Client-Side');
  const [ping, setPing] = useState<number>(0);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [examConfig, setExamConfig] = useState<Record<string, string[]>>({});
  const [newExamName, setNewExamName] = useState('');
  const [newExamSubjects, setNewExamSubjects] = useState('');

  // Upload Tab State
  const [uploadType, setUploadType] = useState<'Question' | 'News'>('Question');
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState('History');
  
  // Question Form State
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  
  // News Form State
  const [nHeadline, setNHeadline] = useState('');
  const [nSummary, setNSummary] = useState('');
  const [nCategory, setNCategory] = useState('National');

  // Smart Import State
  const [smartInput, setSmartInput] = useState('');
  const [isProcessingSmart, setIsProcessingSmart] = useState(false);

  // Settings State
  const [groqKey, setGroqKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gemini');

  useEffect(() => {
    loadInitialData();
    // Load Settings
    setGroqKey(localStorage.getItem('groq_api_key') || '');
    setSelectedProvider(localStorage.getItem('selected_ai_provider') || 'gemini');

    // Real-time Health Check Loop (Every 5 seconds)
    checkHealth(); // Immediate check
    const healthInterval = setInterval(checkHealth, 5000);
    return () => clearInterval(healthInterval);
  }, []);

  const checkHealth = async () => {
    const start = Date.now();
    try {
        // Cache busting to ensure real network request
        const res = await fetch(`/api/health?t=${start}`);
        if (res.ok) {
            const latency = Date.now() - start;
            setBackendStatus('Connected');
            setServerType('Node/Python'); // If /api/health responds, backend is active
            setPing(latency);
        } else {
            setBackendStatus('Error');
            setServerType('Client-Side');
        }
    } catch(e) {
        setBackendStatus('Disconnected');
        setServerType('Client-Side');
    }
  };

  const loadInitialData = async () => {
    // Load Data
    const usersData = await getAllUsers();
    setUsers(usersData);
    setFilteredUsers(usersData);

    const questionsData = await getAdminQuestions();
    setQuestions(questionsData);
    setFilteredQuestions(questionsData);

    const txData = await getTransactions();
    setTransactions(txData);

    const exams = await getExamConfig();
    setExamConfig(exams || EXAM_SUBJECTS);
  };

  // --- Handlers ---

  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setUserSearch(term);
    setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
  };

  const handleQuestionSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setQuestionSearch(term);
    setFilteredQuestions(questions.filter(q => q.text.toLowerCase().includes(term)));
  };

  const handleManualUpload = async () => {
    if (!qText || qOptions.some(o => !o)) return alert("Please fill all fields");
    
    const newQ: Question = {
        id: `official-${Date.now()}`,
        text: qText,
        options: qOptions,
        correctIndex: qCorrect,
        explanation: qExplanation,
        source: QuestionSource.OFFICIAL,
        examType: uploadExam,
        subject: uploadSubject,
        createdAt: Date.now(),
        type: QuestionType.MCQ,
        moderationStatus: 'APPROVED'
    };

    await saveAdminQuestion(newQ);
    alert("Question Uploaded!");
    setQText('');
    setQOptions(['', '', '', '']);
    setQExplanation('');
    loadInitialData();
  };

  const handleNewsUpload = async () => {
    if (!nHeadline || !nSummary) return alert("Fill all fields");
    
    const news: NewsItem = {
        id: `news-${Date.now()}`,
        headline: nHeadline,
        summary: nSummary,
        category: nCategory,
        date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        tags: [],
        isOfficial: true
    };

    await saveAdminNews(news);
    alert("News Published!");
    setNHeadline('');
    setNSummary('');
  };

  const handleSmartImport = async () => {
    if(!smartInput) return;
    setIsProcessingSmart(true);
    try {
        const extracted = await parseSmartInput(smartInput, 'text', uploadExam);
        let count = 0;
        for (const q of extracted) {
            if(!q.text || !q.options) continue;
            const newQ: Question = {
                id: `admin-${Date.now()}-${Math.random()}`,
                text: q.text,
                options: q.options,
                correctIndex: q.correctIndex ?? 0,
                explanation: q.explanation || '',
                source: QuestionSource.OFFICIAL,
                examType: uploadExam,
                subject: uploadSubject,
                createdAt: Date.now(),
                type: QuestionType.MCQ,
                moderationStatus: 'APPROVED'
            };
            await saveAdminQuestion(newQ);
            count++;
        }
        alert(`Imported ${count} questions successfully!`);
        setSmartInput('');
        loadInitialData();
    } catch(e) {
        alert("Import failed. Check format.");
    } finally {
        setIsProcessingSmart(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
      if(confirm("Delete user?")) {
          await removeUser(id);
          setUsers(prev => prev.filter(u => u.id !== id));
          setFilteredUsers(prev => prev.filter(u => u.id !== id));
      }
  };

  const handleTogglePro = async (id: string, currentStatus: boolean) => {
      await toggleUserPro(id, currentStatus);
      const update = (list: User[]) => list.map(u => u.id === id ? { ...u, isPro: !u.isPro } : u);
      setUsers(update(users));
      setFilteredUsers(update(filteredUsers));
  };

  const handleAddExam = async () => {
      if(!newExamName || !newExamSubjects) return;
      const subjects = newExamSubjects.split(',').map(s => s.trim());
      const newConfig = { ...examConfig, [newExamName]: subjects };
      await saveExamConfig(newConfig);
      setExamConfig(newConfig);
      setNewExamName('');
      setNewExamSubjects('');
  };

  const saveSettings = () => {
      localStorage.setItem('groq_api_key', groqKey);
      localStorage.setItem('selected_ai_provider', selectedProvider);
      alert("AI Settings Saved!");
  };

  // Calculations for Storage
  const totalUploads = questions.length;
  const usagePercentage = Math.min((totalUploads / STORAGE_QUOTA_LIMIT) * 100, 100);
  const remainingUploads = Math.max(STORAGE_QUOTA_LIMIT - totalUploads, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
         <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:scale-110 transition-transform">
                ⬅️
            </button>
            <div>
                <h1 className="text-2xl font-bold font-display">Admin Console</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono mt-1">
                    {/* Connection Status */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                        backendStatus === 'Connected' 
                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' 
                        : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            backendStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        }`}></span>
                        <span className="font-bold">{backendStatus.toUpperCase()}</span>
                    </div>
                    
                    {/* Server Type */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        <span>🖥️</span>
                        <span className="font-bold">{serverType}</span>
                    </div>

                    {backendStatus === 'Connected' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <span>📡</span>
                            <span className="font-bold">{ping}ms</span>
                        </div>
                    )}
                </div>
            </div>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={() => loadInitialData()}>Refresh Data</Button>
         </div>
      </div>

      {/* Stats & Storage Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         {/* User Count */}
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
         </div>
         
         {/* Revenue */}
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Revenue</p>
            <p className="text-2xl font-bold text-green-600">₹{transactions.reduce((acc, t) => acc + (t.status === 'SUCCESS' ? t.amount : 0), 0)}</p>
         </div>

         {/* Question Bank Count */}
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Live Questions</p>
            <p className="text-2xl font-bold text-indigo-600">{questions.length}</p>
         </div>

         {/* STORAGE METER (New) */}
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="flex justify-between items-end mb-1">
                <p className="text-xs text-slate-500 uppercase font-bold">Storage Quota</p>
                <p className={`text-xs font-bold ${usagePercentage > 90 ? 'text-red-500' : 'text-green-500'}`}>
                    {remainingUploads} Left
                </p>
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {totalUploads} <span className="text-sm text-slate-400 font-normal">/ {STORAGE_QUOTA_LIMIT}</span>
            </p>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                        usagePercentage > 90 ? 'bg-red-500' : 
                        usagePercentage > 75 ? 'bg-orange-500' : 'bg-blue-500'
                    }`} 
                    style={{ width: `${usagePercentage}%` }}
                ></div>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-700 no-scrollbar">
         {['dashboard', 'users', 'questions', 'upload', 'exams', 'payments', 'settings'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-4 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap transition-colors ${
                   activeTab === tab 
                   ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                   : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
               }`}
             >
                {tab}
             </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[400px]">
         
         {activeTab === 'dashboard' && (
             <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div className="relative mb-4">
                    <span className="text-6xl">🚀</span>
                    <span className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-800">
                        ONLINE
                    </span>
                </div>
                <h2 className="text-2xl font-bold">Welcome, Admin!</h2>
                <p className="text-slate-500 mb-6">System is running on <strong>{serverType}</strong> mode.</p>
                <div className="flex gap-4">
                    <Button onClick={() => setActiveTab('upload')}>Add Content</Button>
                    <Button variant="secondary" onClick={() => setActiveTab('users')}>Manage Users</Button>
                </div>
             </div>
         )}

         {activeTab === 'users' && (
             <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={userSearch}
                  onChange={handleUserSearch}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                />
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3">User</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Plan</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <td className="p-3 font-bold">{user.name}</td>
                                    <td className="p-3 text-sm">{user.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.isPro ? 'bg-brand-purple text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {user.isPro ? 'PRO' : 'FREE'}
                                        </span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => handleTogglePro(user.id, !!user.isPro)} className="text-xs text-blue-500 hover:underline">
                                            {user.isPro ? 'Downgrade' : 'Upgrade'}
                                        </button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-xs text-red-500 hover:underline">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
         )}

         {activeTab === 'upload' && (
             <div className="max-w-2xl mx-auto space-y-6">
                 <div className="flex gap-4 mb-4">
                    <button onClick={() => setUploadType('Question')} className={`flex-1 p-3 rounded-xl font-bold border-2 ${uploadType === 'Question' ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>Add Question</button>
                    <button onClick={() => setUploadType('News')} className={`flex-1 p-3 rounded-xl font-bold border-2 ${uploadType === 'News' ? 'border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 dark:border-slate-700'}`}>Post News</button>
                 </div>

                 {uploadType === 'Question' ? (
                     <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <select value={uploadExam} onChange={e => setUploadExam(e.target.value)} className="p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                                {Object.keys(examConfig).map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <input type="text" placeholder="Subject" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
                        </div>

                        {/* Smart Paste */}
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                            <h3 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2">✨ Smart Import</h3>
                            <textarea 
                                value={smartInput}
                                onChange={e => setSmartInput(e.target.value)}
                                placeholder="Paste raw text from PDF/Website here. AI will extract multiple questions automatically."
                                className="w-full p-3 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 h-24 mb-2 text-sm"
                            />
                            <Button size="sm" onClick={handleSmartImport} isLoading={isProcessingSmart}>Extract & Save</Button>
                        </div>

                        <div className="relative flex items-center py-2"><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div><span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR MANUAL ENTRY</span><div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div></div>

                        <textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="Question Text" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
                        
                        <div className="grid grid-cols-2 gap-3">
                            {qOptions.map((opt, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="radio" name="correct" checked={qCorrect === i} onChange={() => setQCorrect(i)} />
                                    <input type="text" value={opt} onChange={e => { const n = [...qOptions]; n[i] = e.target.value; setQOptions(n); }} className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" placeholder={`Option ${i+1}`} />
                                </div>
                            ))}
                        </div>
                        
                        <textarea value={qExplanation} onChange={e => setQExplanation(e.target.value)} placeholder="Explanation" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
                        
                        <Button onClick={handleManualUpload} className="w-full">Save Question</Button>
                     </div>
                 ) : (
                     <div className="space-y-4 animate-fade-in">
                        <input type="text" placeholder="Headline" value={nHeadline} onChange={e => setNHeadline(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold" />
                        <select value={nCategory} onChange={e => setNCategory(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                            {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <textarea value={nSummary} onChange={e => setNSummary(e.target.value)} placeholder="Summary (supports Markdown)" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 h-32" />
                        <Button onClick={handleNewsUpload} className="w-full">Publish News</Button>
                     </div>
                 )}
             </div>
         )}

         {activeTab === 'exams' && (
             <div className="space-y-6">
                 <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold mb-3">Add New Exam</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input type="text" placeholder="Exam Name (e.g. CAT 2025)" value={newExamName} onChange={e => setNewExamName(e.target.value)} className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                        <input type="text" placeholder="Subjects (comma separated)" value={newExamSubjects} onChange={e => setNewExamSubjects(e.target.value)} className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                    </div>
                    <Button size="sm" onClick={handleAddExam}>Add to Configuration</Button>
                 </div>

                 <div className="space-y-2">
                    <h3 className="font-bold">Active Exams</h3>
                    {Object.entries(examConfig).map(([exam, subjects]) => (
                        <div key={exam} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="font-bold">{exam}</p>
                                <p className="text-xs text-slate-500">{(subjects as string[]).join(', ')}</p>
                            </div>
                            <button onClick={() => {
                                const newConf = { ...examConfig };
                                delete newConf[exam];
                                setExamConfig(newConf);
                                saveExamConfig(newConf);
                            }} className="text-red-500 text-xs hover:underline">Remove</button>
                        </div>
                    ))}
                 </div>
             </div>
         )}

         {activeTab === 'questions' && (
             <div className="space-y-4">
                 <input 
                  type="text" 
                  placeholder="Search questions..." 
                  value={questionSearch}
                  onChange={handleQuestionSearch}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                />
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredQuestions.map(q => (
                        <div key={q.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between gap-4">
                            <div>
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded">{q.examType}</span>
                                <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                            </div>
                            <button onClick={async () => {
                                await deleteGlobalQuestion(q.id);
                                setQuestions(prev => prev.filter(item => item.id !== q.id));
                                setFilteredQuestions(prev => prev.filter(item => item.id !== q.id));
                            }} className="text-red-500 text-xs whitespace-nowrap">Delete</button>
                        </div>
                    ))}
                </div>
             </div>
         )}

         {activeTab === 'payments' && (
             <div className="overflow-x-auto">
                 <table className="w-full text-left">
                     <thead>
                         <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="p-3">User</th><th className="p-3">Plan</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr>
                     </thead>
                     <tbody>
                         {transactions.map(t => (
                             <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                                 <td className="p-3 text-sm">{t.userName}</td>
                                 <td className="p-3 text-sm">{t.planId}</td>
                                 <td className="p-3 font-bold">₹{t.amount}</td>
                                 <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${t.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span></td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}

         {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                
                {/* AI Provider Section */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span>🧠</span> AI Model Configuration
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Active Provider</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {['gemini', 'deep-research', 'groq', 'local'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedProvider(p)}
                                        className={`p-3 rounded-xl border-2 capitalize font-bold text-sm transition-all relative ${
                                            selectedProvider === p 
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                                        }`}
                                    >
                                        {p === 'deep-research' && (
                                            <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">NEW</span>
                                        )}
                                        {p === 'local' ? 'Local' : p.replace('-', ' ')}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                {selectedProvider === 'gemini' && "Uses Google Gemini 2.5 Flash (Standard). Fast & Balanced."}
                                {selectedProvider === 'deep-research' && "Uses Gemini 3.0 Pro with Reasoning. Simulates Deep Research agent for complex tasks."}
                                {selectedProvider === 'groq' && "Uses Llama-3 via Groq (Ultra Fast). Requires API Key."}
                                {selectedProvider === 'local' && "Runs Gemma-2B in browser. Offline capable but heavy (1.5GB)."}
                            </p>
                        </div>

                        {selectedProvider === 'groq' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Groq API Key</label>
                                <input 
                                    type="password" 
                                    value={groqKey}
                                    onChange={(e) => setGroqKey(e.target.value)}
                                    placeholder="gsk_..."
                                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* System Actions */}
                <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-4">Danger Zone</h3>
                    <div className="flex gap-4">
                        <Button variant="danger" onClick={() => { localStorage.clear(); window.location.reload(); }}>
                            Reset App Cache
                        </Button>
                    </div>
                </div>

                <div className="fixed bottom-6 right-6">
                    <Button onClick={saveSettings} className="shadow-xl">Save Changes</Button>
                </div>
            </div>
         )}

      </div>
    </div>
  );
};
