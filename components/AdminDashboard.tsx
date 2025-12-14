
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Question, QuestionSource, NewsItem, User, Transaction, QuestionType, ExamType } from '../types';
import { 
  getGlobalStats, saveAdminQuestion, getAdminQuestions, 
  saveAdminNews, getAllUsers, removeUser, toggleUserPro, deleteGlobalQuestion,
  getTransactions, saveExamConfig, getExamConfig, getSystemLogs, SystemLog, clearSystemLogs
} from '../services/storageService';
import { parseSmartInput, generateSingleQuestion } from '../services/geminiService';
import { EXAM_SUBJECTS, NEWS_CATEGORIES } from '../constants';

interface AdminDashboardProps {
  onBack: () => void;
}

// Soft limit for Free Tier safety
const STORAGE_QUOTA_LIMIT = 20000; 

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'users' | 'exams' | 'upload' | 'questions' | 'payments' | 'settings'>('monitor');
  
  // System Health States
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Online' | 'Offline' | 'Error'>('Checking');
  const [aiStatus, setAiStatus] = useState<'Checking' | 'Operational' | 'Degraded' | 'Failed'>('Checking');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [examConfig, setExamConfig] = useState<Record<string, string[]>>({});
  
  // Upload States
  const [uploadType, setUploadType] = useState<'Question' | 'News'>('Question');
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState('History');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [nHeadline, setNHeadline] = useState('');
  const [nSummary, setNSummary] = useState('');
  const [nCategory, setNCategory] = useState('National');
  const [smartInput, setSmartInput] = useState('');
  const [isProcessingSmart, setIsProcessingSmart] = useState(false);

  // Settings State
  const [groqKey, setGroqKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gemini');

  // New Exam States
  const [newExamName, setNewExamName] = useState('');
  const [newExamSubjects, setNewExamSubjects] = useState('');

  useEffect(() => {
    loadInitialData();
    runDiagnostics();
    // Load Settings
    setGroqKey(localStorage.getItem('groq_api_key') || '');
    setSelectedProvider(localStorage.getItem('selected_ai_provider') || 'gemini');
  }, []);

  const runDiagnostics = async () => {
    setIsTestRunning(true);
    setBackendStatus('Checking');
    setAiStatus('Checking');

    // 1. Check Backend Health
    try {
        const res = await fetch(`/api/health?t=${Date.now()}`);
        if (res.ok) setBackendStatus('Online');
        else setBackendStatus('Offline');
    } catch(e) {
        setBackendStatus('Offline');
    }

    // 2. Test AI Generation
    try {
        const testQ = await generateSingleQuestion('UPSC', 'History', 'Test');
        if (testQ) setAiStatus('Operational');
        else setAiStatus('Degraded');
    } catch(e) {
        setAiStatus('Failed');
    }

    // 3. Fetch Logs
    const recentLogs = await getSystemLogs();
    setLogs(recentLogs);
    
    setIsTestRunning(false);
  };

  const loadInitialData = async () => {
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

  // Calculations
  const totalUploads = questions.length;
  const usagePercentage = Math.min((totalUploads / STORAGE_QUOTA_LIMIT) * 100, 100);

  // Handlers
  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setUserSearch(term);
    setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
  };

  const handleTogglePro = async (userId: string, currentStatus: boolean) => {
    await toggleUserPro(userId, currentStatus);
    const updatedUsers = users.map(u => u.id === userId ? { ...u, isPro: !currentStatus } : u);
    setUsers(updatedUsers);
    setFilteredUsers(prev => prev.map(u => u.id === userId ? { ...u, isPro: !currentStatus } : u));
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    await removeUser(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    setFilteredUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleNewsUpload = async () => {
    if (!nHeadline || !nSummary) return alert("Please fill headline and summary");
    
    const newItem: NewsItem = {
      id: `news-${Date.now()}`,
      headline: nHeadline,
      summary: nSummary,
      category: nCategory,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      tags: [],
      isOfficial: true
    };

    await saveAdminNews(newItem);
    alert("News Broadcasted!");
    setNHeadline('');
    setNSummary('');
  };

  const saveSettings = () => {
    localStorage.setItem('groq_api_key', groqKey);
    localStorage.setItem('selected_ai_provider', selectedProvider);
    alert("Settings Saved locally.");
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

  const handleAddExam = async () => {
      if(!newExamName || !newExamSubjects) return;
      const subjects = newExamSubjects.split(',').map(s => s.trim());
      const newConfig = { ...examConfig, [newExamName]: subjects };
      await saveExamConfig(newConfig);
      setExamConfig(newConfig);
      setNewExamName('');
      setNewExamSubjects('');
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

  // Nav Items Configuration
  const navItems = [
    { id: 'monitor', icon: '📡', label: 'Monitor' },
    { id: 'upload', icon: '📤', label: 'Upload' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'questions', icon: '📚', label: 'Bank' },
    { id: 'exams', icon: '⚙️', label: 'Exams' },
    { id: 'payments', icon: '💰', label: 'Pay' },
    { id: 'settings', icon: '🔧', label: 'Config' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-mono animate-fade-in fixed inset-0 z-[100] overflow-y-auto">
      
      {/* Top Bar (Separate PWA Feel) */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-20 flex justify-between items-center shadow-lg pt-safe">
         <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h1 className="text-lg sm:text-xl font-bold tracking-widest uppercase text-slate-200">PYQverse <span className="text-red-500">ADMIN</span></h1>
         </div>
         <div className="flex gap-2">
            <button onClick={runDiagnostics} className={`px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 text-[10px] font-bold uppercase ${isTestRunning ? 'animate-pulse' : ''}`}>
                {isTestRunning ? 'Test...' : 'Test'}
            </button>
            <button onClick={onBack} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-[10px] font-bold uppercase">
                Exit
            </button>
         </div>
      </div>

      {/* MOBILE NAVIGATION (Horizontal Scroll) */}
      <div className="md:hidden sticky top-[60px] z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 overflow-x-auto no-scrollbar">
         <div className="flex p-2 gap-2">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                        activeTab === item.id 
                        ? 'bg-red-500/20 text-red-400 border-red-500/50' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                >
                    <span>{item.icon}</span> {item.label}
                </button>
            ))}
         </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
         
         {/* DESKTOP SIDEBAR */}
         <div className="w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col p-4 space-y-2 h-full overflow-y-auto">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-3 p-3 rounded text-sm font-bold text-left transition-all ${
                        activeTab === item.id 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                    <span>{item.icon}</span> {item.label}
                </button>
            ))}
         </div>

         {/* Main Content Area */}
         <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-900 pb-20">
            
            {activeTab === 'monitor' && (
                <div className="space-y-6 max-w-5xl mx-auto">
                    {/* Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-6 rounded border ${backendStatus === 'Online' ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                            <p className="text-xs text-slate-400 uppercase mb-2">Backend Connection</p>
                            <h3 className={`text-2xl font-bold ${backendStatus === 'Online' ? 'text-green-400' : 'text-red-400'}`}>{backendStatus}</h3>
                        </div>
                        <div className={`p-6 rounded border ${aiStatus === 'Operational' ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                            <p className="text-xs text-slate-400 uppercase mb-2">AI Engine Status</p>
                            <h3 className={`text-2xl font-bold ${aiStatus === 'Operational' ? 'text-green-400' : 'text-red-400'}`}>{aiStatus}</h3>
                        </div>
                        <div className="p-6 rounded border bg-slate-800 border-slate-700">
                            <p className="text-xs text-slate-400 uppercase mb-2">Total Users</p>
                            <h3 className="text-2xl font-bold text-white">{users.length}</h3>
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-white">System Logs & Errors</h3>
                            <button onClick={clearSystemLogs} className="text-xs text-slate-400 hover:text-white underline">Clear Logs</button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900 text-slate-400 uppercase sticky top-0">
                                    <tr>
                                        <th className="p-3">Time</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Message</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {logs.length === 0 ? (
                                        <tr><td colSpan={3} className="p-4 text-center text-slate-500">No recent system logs.</td></tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-700/50">
                                                <td className="p-3 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded font-bold ${
                                                        log.type === 'API_FAIL' ? 'bg-orange-900/50 text-orange-400' :
                                                        log.type === 'ERROR' ? 'bg-red-900/50 text-red-400' : 
                                                        log.type === 'INFO' ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-700 text-slate-300'
                                                    }`}>
                                                        {log.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-medium text-white break-all">
                                                    {log.message}
                                                    {log.details && <div className="text-[10px] text-slate-500 mt-1 font-mono">{log.details}</div>}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Storage Visualizer */}
                    <div className="p-4 bg-slate-800 rounded border border-slate-700">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Database Storage Quota</p>
                            <p className="text-xs text-white">{totalUploads} / {STORAGE_QUOTA_LIMIT} Docs</p>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2">
                            <div 
                                className={`h-full rounded-full ${usagePercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                style={{ width: `${usagePercentage}%` }}
                            ></div>
                        </div>
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
                      className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white outline-none focus:border-red-500"
                    />
                    <div className="bg-slate-800 rounded border border-slate-700 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="p-3">User</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 text-sm">
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="p-3">
                                            <div className="font-bold">{user.name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </td>
                                        <td className="p-3">
                                            {user.isAdmin ? (
                                                <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded text-xs font-bold">ADMIN</span>
                                            ) : user.isPro ? (
                                                <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs font-bold">PRO</span>
                                            ) : (
                                                <span className="text-slate-500">FREE</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right space-x-2">
                                            <button onClick={() => handleTogglePro(user.id, !!user.isPro)} className="text-blue-400 hover:text-white text-xs underline">
                                                {user.isPro ? 'Revoke Pro' : 'Grant Pro'}
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-white text-xs underline">
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
                <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded border border-slate-700">
                    <div className="flex gap-4 mb-6 border-b border-slate-700 pb-4">
                        <button onClick={() => setUploadType('Question')} className={`text-sm font-bold uppercase ${uploadType === 'Question' ? 'text-red-500' : 'text-slate-500'}`}>Question Entry</button>
                        <button onClick={() => setUploadType('News')} className={`text-sm font-bold uppercase ${uploadType === 'News' ? 'text-red-500' : 'text-slate-500'}`}>News Broadcast</button>
                    </div>

                    {uploadType === 'Question' ? (
                        <div className="space-y-4">
                            <div className="bg-indigo-900/20 p-4 rounded border border-indigo-900/50 mb-4">
                                <h4 className="text-indigo-400 font-bold text-xs mb-2">SMART IMPORT (AI)</h4>
                                <textarea 
                                    value={smartInput}
                                    onChange={e => setSmartInput(e.target.value)}
                                    placeholder="Paste raw text here to extract multiple questions..."
                                    className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none h-20 text-xs mb-2"
                                />
                                <Button size="sm" onClick={handleSmartImport} isLoading={isProcessingSmart}>Extract & Save</Button>
                            </div>

                            <div className="flex gap-4">
                                <select value={uploadExam} onChange={e => setUploadExam(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none">
                                    {Object.keys(examConfig).map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                <input placeholder="Subject" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none" />
                            </div>
                            <textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="Question Text" className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none h-24" />
                            <div className="grid grid-cols-2 gap-2">
                                {qOptions.map((opt, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input type="radio" name="correct" checked={qCorrect === i} onChange={() => setQCorrect(i)} className="accent-red-500" />
                                        <input value={opt} onChange={e => {const n=[...qOptions];n[i]=e.target.value;setQOptions(n)}} className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none text-xs" placeholder={`Option ${i+1}`} />
                                    </div>
                                ))}
                            </div>
                            <textarea value={qExplanation} onChange={e => setQExplanation(e.target.value)} placeholder="Explanation" className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none h-16" />
                            <Button onClick={handleManualUpload} className="w-full bg-red-600 hover:bg-red-700 text-white border-0">INJECT INTO DATABASE</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <select value={nCategory} onChange={e => setNCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none">
                                {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input placeholder="Headline" value={nHeadline} onChange={e => setNHeadline(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none" />
                            <textarea value={nSummary} onChange={e => setNSummary(e.target.value)} placeholder="Summary" className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none h-32" />
                            <Button onClick={handleNewsUpload} className="w-full bg-red-600 hover:bg-red-700 border-0">BROADCAST</Button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'questions' && (
             <div className="space-y-4">
                 <input 
                  type="text" 
                  placeholder="Search questions..." 
                  value={questionSearch}
                  onChange={(e) => {
                      setQuestionSearch(e.target.value);
                      setFilteredQuestions(questions.filter(q => q.text.toLowerCase().includes(e.target.value.toLowerCase())));
                  }}
                  className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white outline-none"
                />
                <div className="space-y-2">
                    {filteredQuestions.slice(0, 50).map(q => (
                        <div key={q.id} className="p-3 rounded bg-slate-800 border border-slate-700 flex justify-between gap-4">
                            <div>
                                <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded mr-2">{q.examType}</span>
                                <span className="text-sm font-medium">{q.text}</span>
                            </div>
                            <button onClick={async () => {
                                if(confirm('Delete?')) {
                                    await deleteGlobalQuestion(q.id);
                                    setQuestions(prev => prev.filter(item => item.id !== q.id));
                                    setFilteredQuestions(prev => prev.filter(item => item.id !== q.id));
                                }
                            }} className="text-red-500 text-xs whitespace-nowrap">Delete</button>
                        </div>
                    ))}
                </div>
             </div>
            )}

            {activeTab === 'payments' && (
                <div className="overflow-x-auto bg-slate-800 rounded border border-slate-700">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="p-3">User</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 text-sm">
                            {transactions.map(t => (
                                <tr key={t.id}>
                                    <td className="p-3 text-slate-300">{t.userName} <br/><span className="text-[10px] text-slate-500">{t.planId}</span></td>
                                    <td className="p-3 font-bold text-white">₹{t.amount}</td>
                                    <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${t.status === 'SUCCESS' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>{t.status}</span></td>
                                </tr>
                            ))}
                            {transactions.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500">No transactions found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'exams' && (
             <div className="space-y-6">
                 <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <h3 className="font-bold mb-3 text-white">Add New Exam</h3>
                    <div className="grid grid-cols-1 gap-3 mb-3">
                        <input type="text" placeholder="Exam Name (e.g. CAT 2025)" value={newExamName} onChange={e => setNewExamName(e.target.value)} className="p-2 rounded bg-slate-900 border border-slate-600 text-white" />
                        <input type="text" placeholder="Subjects (comma separated)" value={newExamSubjects} onChange={e => setNewExamSubjects(e.target.value)} className="p-2 rounded bg-slate-900 border border-slate-600 text-white" />
                    </div>
                    <Button size="sm" onClick={handleAddExam}>Add to Configuration</Button>
                 </div>

                 <div className="space-y-2">
                    <h3 className="font-bold text-white">Active Exams</h3>
                    {Object.entries(examConfig).map(([exam, subjects]) => (
                        <div key={exam} className="p-3 rounded bg-slate-800 border border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-200">{exam}</p>
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

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-slate-800 p-6 rounded border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4">AI Configuration</h3>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {['gemini', 'deep-research', 'groq', 'local'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setSelectedProvider(p)}
                                    className={`p-2 rounded text-xs font-bold uppercase border ${
                                        selectedProvider === p ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-900 border-slate-600 text-slate-400'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        {selectedProvider === 'groq' && (
                            <input 
                                type="password" 
                                value={groqKey}
                                onChange={(e) => setGroqKey(e.target.value)}
                                placeholder="Groq API Key"
                                className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded outline-none"
                            />
                        )}
                        <Button onClick={saveSettings} className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white border-0">UPDATE CONFIG</Button>
                    </div>
                </div>
            )}

         </div>
      </div>
    </div>
  );
};
