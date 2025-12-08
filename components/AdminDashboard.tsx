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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'exams' | 'upload' | 'questions' | 'payments' | 'settings'>('dashboard');
  
  // System Health States
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Online' | 'Offline'>('Checking');
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

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Check Health
    const start = Date.now();
    try {
        await fetch('/api/health');
        setBackendStatus('Online');
        setPing(Date.now() - start);
    } catch(e) {
        setBackendStatus('Offline');
    }

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
         <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:scale-105 transition-transform">
                ⬅️
            </button>
            <div>
                <h1 className="text-2xl font-bold font-display">Admin Console</h1>
                <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${backendStatus === 'Online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-slate-500 dark:text-slate-400">{backendStatus} ({ping}ms)</span>
                </div>
            </div>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={() => loadInitialData()}>Refresh Data</Button>
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
         </div>
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Pro Users</p>
            <p className="text-2xl font-bold text-brand-purple">{users.filter(u => u.isPro).length}</p>
         </div>
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Question Bank</p>
            <p className="text-2xl font-bold text-indigo-600">{questions.length}</p>
         </div>
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 uppercase font-bold">Revenue</p>
            <p className="text-2xl font-bold text-green-600">₹{transactions.reduce((acc, t) => acc + (t.status === 'SUCCESS' ? t.amount : 0), 0)}</p>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-700 no-scrollbar">
         {['dashboard', 'users', 'questions', 'upload', 'exams', 'payments'].map((tab) => (
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
                <span className="text-6xl mb-4">🚀</span>
                <h2 className="text-2xl font-bold">Welcome, Admin!</h2>
                <p className="text-slate-500 mb-6">Manage your entire exam universe from here.</p>
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

      </div>
    </div>
  );
};