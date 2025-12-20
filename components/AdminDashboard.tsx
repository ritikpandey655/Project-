import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Question, QuestionSource, NewsItem, User, Transaction, QuestionType, ExamType, SyllabusItem } from '../types';
import { 
  getGlobalStats, saveAdminQuestion, getAdminQuestions, 
  saveAdminNews, getAllUsers, removeUser, toggleUserPro, deleteGlobalQuestion,
  getTransactions, saveExamConfig, getExamConfig, getSystemLogs, SystemLog, clearSystemLogs,
  saveSyllabus, logSystemError
} from '../services/storageService';
import { parseSmartInput, generateSingleQuestion, extractSyllabusFromImage, resetAIQuota, checkAIConnectivity } from '../services/geminiService';
import { EXAM_SUBJECTS, NEWS_CATEGORIES } from '../constants';

interface AdminDashboardProps {
  onBack: () => void;
}

// Soft limit for Free Tier safety
const STORAGE_QUOTA_LIMIT = 20000; 

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'users' | 'exams' | 'upload' | 'syllabus' | 'questions' | 'payments' | 'settings'>('monitor');
  
  // System Health States
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Online' | 'Offline' | 'Error'>('Checking');
  const [aiStatus, setAiStatus] = useState<'Checking' | 'Operational' | 'Degraded' | 'Rate Limited' | 'Failed'>('Checking');
  const [latency, setLatency] = useState<number>(0);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [examConfig, setExamConfig] = useState<Record<string, string[]>>({});
  
  // Upload States
  const [uploadType, setUploadType] = useState<'Question' | 'News'>('Question');
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState('');
  const [entryMode, setEntryMode] = useState<'smart' | 'manual'>('smart');
  
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [nHeadline, setNHeadline] = useState('');
  const [nSummary, setNSummary] = useState('');
  const [nCategory, setNCategory] = useState('National');
  const [smartInput, setSmartInput] = useState('');
  const [isProcessingSmart, setIsProcessingSmart] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Syllabus States
  const [syllabusExam, setSyllabusExam] = useState<string>('UPSC');
  const [syllabusSubject, setSyllabusSubject] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [isSyllabusReviewMode, setIsSyllabusReviewMode] = useState(false);
  const [isProcessingSyllabus, setIsProcessingSyllabus] = useState(false);
  const syllabusFileRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [groqKey, setGroqKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gemini-2.5');

  // New Exam States
  const [newExamName, setNewExamName] = useState('');
  const [newExamSubjects, setNewExamSubjects] = useState('');

  useEffect(() => {
    loadInitialData();
    runDiagnostics();
    setGroqKey(localStorage.getItem('groq_api_key') || '');
    setSelectedProvider(localStorage.getItem('selected_ai_provider') || 'gemini-2.5');
  }, []);

  useEffect(() => {
      const subjects = examConfig[uploadExam] || EXAM_SUBJECTS[uploadExam as ExamType] || [];
      if (subjects.length > 0 && !subjects.includes(uploadSubject)) {
          setUploadSubject(subjects[0]);
      } else if (subjects.length === 0 && !uploadSubject) {
          setUploadSubject('General');
      }
  }, [uploadExam, examConfig]);

  useEffect(() => {
      const subjects = examConfig[syllabusExam] || EXAM_SUBJECTS[syllabusExam as ExamType] || [];
      if (subjects.length > 0 && !subjects.includes(syllabusSubject)) {
          setSyllabusSubject(subjects[0]);
      } else if (subjects.length === 0 && !syllabusSubject) {
          setSyllabusSubject('General');
      }
  }, [syllabusExam, examConfig]);

  const runDiagnostics = async () => {
    setIsTestRunning(true);
    setBackendStatus('Checking');
    setAiStatus('Checking');

    const start = performance.now();

    // 1. Check Python Backend Health
    try {
        const res = await fetch(`/api/health?t=${Date.now()}`); 
        if (res.ok) {
            setBackendStatus('Online');
            const end = performance.now();
            setLatency(Math.round(end - start));
        } else {
            setBackendStatus('Offline');
            setLatency(0);
        }
    } catch(e) {
        setBackendStatus('Offline');
        setLatency(0);
    }

    // 2. Test AI via Backend
    try {
        const status = await checkAIConnectivity();
        setAiStatus(status);
        if (status === 'Failed') await logSystemError('API_FAIL', 'Diagnostic: AI Check Failed');
    } catch(e: any) {
        setAiStatus('Failed');
        await logSystemError('ERROR', 'Diagnostic Test Failed', { error: e.message });
    }

    setTimeout(async () => {
        const recentLogs = await getSystemLogs();
        setLogs(recentLogs);
        setIsTestRunning(false);
    }, 2000); 
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
    
    refreshLogs();
  };

  const refreshLogs = async () => {
      const recent = await getSystemLogs();
      setLogs(recent);
  };

  const handleResetAI = () => {
      resetAIQuota();
      alert("AI Quota Lock has been reset. You can try generating again.");
      runDiagnostics();
  };

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
    const newItem: NewsItem = { id: `news-${Date.now()}`, headline: nHeadline, summary: nSummary, category: nCategory, date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), tags: [], isOfficial: true };
    await saveAdminNews(newItem); alert("News Broadcasted!"); setNHeadline(''); setNSummary('');
  };
  const handleManualUpload = async () => {
    if (!qText || qOptions.some(o => !o)) return alert("Please fill all fields");
    const newQ: Question = { id: `official-${Date.now()}`, text: qText, options: qOptions, correctIndex: qCorrect, explanation: qExplanation, source: QuestionSource.OFFICIAL, examType: uploadExam, subject: uploadSubject, createdAt: Date.now(), type: QuestionType.MCQ, moderationStatus: 'APPROVED' };
    await saveAdminQuestion(newQ); alert("Question Uploaded!"); setQText(''); setQOptions(['', '', '', '']); setQExplanation(''); loadInitialData();
  };
  const handleAddExam = async () => { if(!newExamName || !newExamSubjects) return; const subjects = newExamSubjects.split(',').map(s => s.trim()); const newConfig = { ...examConfig, [newExamName]: subjects }; await saveExamConfig(newConfig); setExamConfig(newConfig); setNewExamName(''); setNewExamSubjects(''); };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 25 * 1024 * 1024) { alert("File too large. Please upload < 25MB."); return; } const reader = new FileReader(); reader.onload = async (ev) => { const base64 = (ev.target?.result as string).split(',')[1]; setIsProcessingSmart(true); if(fileInputRef.current) fileInputRef.current.value = ''; try { 
    // Fix: Corrected parseSmartInput call to match its 3-argument signature
    const extracted = await parseSmartInput(base64, 'image', uploadExam); 
    saveBatchQuestions(extracted); 
  } catch(e) { alert("Failed to process file."); setIsProcessingSmart(false); } }; reader.readAsDataURL(file); };
  const handleSmartImport = async () => { if(!smartInput) return; setIsProcessingSmart(true); try { const extracted = await parseSmartInput(smartInput, 'text', uploadExam); saveBatchQuestions(extracted); } catch(e) { alert("Import failed. Check format."); setIsProcessingSmart(false); } };
  const saveBatchQuestions = async (extracted: any[]) => { let count = 0; for (const q of extracted) { if(!q.text || !q.options) continue; const newQ: Question = { id: `admin-${Date.now()}-${Math.random()}`, text: q.text, options: q.options, correctIndex: q.correctIndex ?? 0, explanation: q.explanation || '', source: QuestionSource.OFFICIAL, examType: uploadExam, subject: uploadSubject, createdAt: Date.now(), type: QuestionType.MCQ, moderationStatus: 'APPROVED' }; await saveAdminQuestion(newQ); count++; } alert(`Imported ${count} questions successfully for ${uploadExam} (${uploadSubject})!`); setSmartInput(''); setIsProcessingSmart(false); loadInitialData(); };
  const handleSyllabusFile = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 25 * 1024 * 1024) { alert("File too large. Please upload < 25MB."); return; } const reader = new FileReader(); reader.onload = async (ev) => { const base64 = (ev.target?.result as string).split(',')[1]; setIsProcessingSyllabus(true); if (syllabusFileRef.current) syllabusFileRef.current.value = ''; try { const extractedText = await extractSyllabusFromImage(base64, file.type); setSyllabusText(extractedText); setIsSyllabusReviewMode(true); } catch(e) { alert("Failed to extract syllabus."); } finally { setIsProcessingSyllabus(false); } }; reader.readAsDataURL(file); };
  const handleSaveSyllabus = async () => { if (!syllabusText.trim()) return alert("Syllabus content is empty."); try { const item: SyllabusItem = { id: `syl-${Date.now()}`, examType: syllabusExam, subject: syllabusSubject, content: syllabusText, updatedAt: Date.now() }; await saveSyllabus(item); alert(`Syllabus saved for ${syllabusExam} - ${syllabusSubject}!`); setIsSyllabusReviewMode(false); setSyllabusText(''); } catch(e) { alert("Failed to save syllabus."); } };

  const providerLabel = selectedProvider === 'groq' ? 'Groq' : 'Gemini';

  const navItems = [
    { id: 'monitor', icon: '📡', label: 'Monitor' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'upload', icon: '📤', label: 'Upload' },
    { id: 'syllabus', icon: '📚', label: 'Syllabus' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-mono animate-fade-in fixed inset-0 z-[100] overflow-y-auto">
      
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-20 flex justify-between items-center shadow-lg pt-safe">
         <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${backendStatus === 'Online' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <h1 className="text-lg sm:text-xl font-bold tracking-widest uppercase text-slate-200">
                PYQverse <span className="text-red-500">ADMIN</span>
            </h1>
            {latency > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${latency < 200 ? 'bg-green-900/50 text-green-400' : 'bg-orange-900/50 text-orange-400'}`}>
                    {latency}ms
                </span>
            )}
         </div>
         <div className="flex gap-2">
            <button onClick={loadInitialData} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 text-[10px] font-bold uppercase flex items-center gap-1 active:scale-95 transition-transform"><span>🔄</span> Refresh Data</button>
            <button onClick={runDiagnostics} className={`px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 text-[10px] font-bold uppercase ${isTestRunning ? 'animate-pulse cursor-wait' : 'active:scale-95 transition-transform'}`} disabled={isTestRunning}>{isTestRunning ? 'Testing...' : 'Test AI'}</button>
            <button onClick={onBack} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-[10px] font-bold uppercase active:scale-95 transition-transform">Exit</button>
         </div>
      </div>

      <div className="md:hidden sticky top-[60px] z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 overflow-x-auto no-scrollbar"><div className="flex p-2 gap-2">{navItems.map((item) => (<button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${activeTab === item.id ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><span>{item.icon}</span> {item.label}</button>))}</div></div>

      <div className="flex h-[calc(100vh-64px)]">
         <div className="w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col p-4 space-y-2 h-full overflow-y-auto">{navItems.map((item) => (<button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-3 p-3 rounded text-sm font-bold text-left transition-all ${activeTab === item.id ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}><span>{item.icon}</span> {item.label}</button>))}</div>

         <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-900 pb-20">
            {activeTab === 'monitor' && (
                <div className="space-y-6 max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-6 rounded border ${backendStatus === 'Online' ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                            <div className="flex justify-between items-start">
                                <p className="text-xs text-slate-400 uppercase mb-2">Python Backend</p>
                                <span className={`text-[10px] px-2 py-1 rounded text-white font-mono ${latency > 0 ? 'bg-black/30' : 'hidden'}`}>{latency}ms</span>
                            </div>
                            <h3 className={`text-2xl font-bold ${backendStatus === 'Online' ? 'text-green-400' : 'text-red-400'}`}>{backendStatus}</h3>
                        </div>
                        <div className={`p-6 rounded border ${aiStatus === 'Operational' ? 'bg-green-900/20 border-green-500/50' : aiStatus === 'Rate Limited' ? 'bg-orange-900/20 border-orange-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                            <div className="flex justify-between items-start">
                                <p className="text-xs text-slate-400 uppercase mb-2">AI Status ({providerLabel})</p>
                                <button onClick={handleResetAI} className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Reset Quota</button>
                            </div>
                            <h3 className={`text-2xl font-bold ${aiStatus === 'Operational' ? 'text-green-400' : aiStatus === 'Rate Limited' ? 'text-orange-400' : 'text-red-400'}`}>{aiStatus}</h3>
                        </div>
                        <div className="p-6 rounded border bg-slate-800 border-slate-700"><p className="text-xs text-slate-400 uppercase mb-2">Total Users</p><h3 className="text-2xl font-bold text-white">{users.length}</h3></div>
                    </div>
                    {/* Logs Table */}
                    <div className="bg-slate-800 border border-slate-700 rounded overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-2"><h3 className="font-bold text-white">System Logs</h3><button onClick={refreshLogs} className="text-xs bg-slate-700 border border-slate-600 px-3 py-1.5 rounded text-slate-300 hover:text-white">↻ Refresh</button></div>
                            <button onClick={clearSystemLogs} className="text-xs text-slate-400 hover:text-white underline">Clear Logs</button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-900 text-slate-400 uppercase sticky top-0"><tr><th className="p-3">Time</th><th className="p-3">Type</th><th className="p-3">Message</th></tr></thead><tbody className="divide-y divide-slate-700">{logs.length === 0 ? (<tr><td colSpan={3} className="p-4 text-center text-slate-500">No logs.</td></tr>) : (logs.map((log) => (<tr key={log.id} className="hover:bg-slate-700/50"><td className="p-3 text-slate-400 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td><td className="p-3"><span className={`px-2 py-1 rounded font-bold ${log.type === 'API_FAIL' ? 'bg-orange-900/50 text-orange-400' : log.type === 'ERROR' ? 'bg-red-900/50 text-red-400' : 'bg-slate-700 text-slate-300'}`}>{log.type}</span></td><td className="p-3 font-medium text-white break-all">{log.message}{log.details && <div className="text-[10px] text-slate-500 mt-1 font-mono">{log.details}</div>}</td></tr>)))}</tbody></table></div>
                    </div>
                </div>
            )}
            
            {activeTab === 'users' && (<div className="space-y-4"><div className="flex gap-2"><input type="text" placeholder="Search users..." value={userSearch} onChange={handleUserSearch} className="flex-1 p-3 rounded bg-slate-800 border border-slate-700 text-white outline-none focus:border-red-500" /><Button onClick={loadInitialData} className="bg-slate-700 hover:bg-slate-600 border-0">Refresh</Button></div><div className="bg-slate-800 rounded border border-slate-700 overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-900 text-slate-400 text-xs uppercase"><tr><th className="p-3">User</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-700 text-sm">{filteredUsers.map(user => (<tr key={user.id}><td className="p-3"><div className="font-bold">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></td><td className="p-3">{user.isAdmin ? <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded text-xs font-bold">ADMIN</span> : user.isPro ? <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs font-bold">PRO</span> : <span className="text-slate-500">FREE</span>}</td><td className="p-3 text-right space-x-2"><button onClick={() => handleTogglePro(user.id, !!user.isPro)} className="text-blue-400 hover:text-white text-xs underline">{user.isPro ? 'Revoke Pro' : 'Grant Pro'}</button><button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-white text-xs underline">Delete</button></td></tr>))}</tbody></table></div></div>)}
            {activeTab === 'upload' && (<div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded border border-slate-700"><div className="flex gap-4 mb-6 border-b border-slate-700 pb-4"><button onClick={() => setUploadType('Question')} className={`text-sm font-bold uppercase ${uploadType === 'Question' ? 'text-red-500 border-b-2 border-red-500' : 'text-slate-500'}`}>Question Entry</button><button onClick={() => setUploadType('News')} className={`text-sm font-bold uppercase ${uploadType === 'News' ? 'text-red-500 border-b-2 border-red-500' : 'text-slate-500'}`}>News Broadcast</button></div>{uploadType === 'Question' ? (<div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">1. Select Exam</label><select value={uploadExam} onChange={e => setUploadExam(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white outline-none">{Object.keys(examConfig).map(e => <option key={e} value={e}>{e}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">2. Select Subject</label><select value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white outline-none">{(examConfig[uploadExam] || EXAM_SUBJECTS[uploadExam as ExamType] || []).map(s => <option key={s} value={s}>{s}</option>)}</select></div></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">3. Entry Method</label><div className="bg-slate-900 p-1 rounded-lg flex border border-slate-700"><button onClick={() => setEntryMode('smart')} className={`flex-1 py-2 text-sm font-bold rounded-md ${entryMode === 'smart' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>✨ Smart Import</button><button onClick={() => setEntryMode('manual')} className={`flex-1 py-2 text-sm font-bold rounded-md ${entryMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>✍️ Manual</button></div></div>{entryMode === 'smart' ? (<div className="bg-indigo-900/10 p-6 rounded-xl border border-indigo-500/30 border-dashed"><textarea value={smartInput} onChange={e => setSmartInput(e.target.value)} placeholder="Paste raw text here or upload a file..." className="w-full bg-slate-900 border border-slate-700 p-3 text-white rounded-lg outline-none h-32 text-sm mb-4" /><div className="flex gap-3"><input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} /><button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg border border-slate-600" disabled={isProcessingSmart}>Upload File</button><Button onClick={handleSmartImport} isLoading={isProcessingSmart} className="flex-1 bg-indigo-600 border-0">Extract</Button></div></div>) : (<div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700"><textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="Question Text" className="w-full bg-slate-900 border border-slate-600 p-3 text-white rounded-lg outline-none h-24" /><div className="grid grid-cols-2 gap-3">{qOptions.map((opt, i) => (<div key={i} className="flex gap-2 items-center"><input type="radio" name="correct" checked={qCorrect === i} onChange={() => setQCorrect(i)} className="accent-red-500 w-4 h-4" /><input value={opt} onChange={e => {const n=[...qOptions];n[i]=e.target.value;setQOptions(n)}} className="w-full bg-slate-900 border border-slate-600 p-2 text-white rounded-lg outline-none text-xs" placeholder={`Option ${i+1}`} /></div>))}</div><textarea value={qExplanation} onChange={e => setQExplanation(e.target.value)} placeholder="Explanation" className="w-full bg-slate-900 border border-slate-600 p-3 text-white rounded-lg outline-none h-20" /><Button onClick={handleManualUpload} className="w-full bg-red-600 hover:bg-red-700 text-white border-0 py-3">SAVE QUESTION</Button></div>)}</div>) : (<div className="space-y-4"><select value={nCategory} onChange={e => setNCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-3 text-white rounded-lg outline-none">{NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select><input placeholder="Headline" value={nHeadline} onChange={e => setNHeadline(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-3 text-white rounded-lg outline-none" /><textarea value={nSummary} onChange={e => setNSummary(e.target.value)} placeholder="Summary" className="w-full bg-slate-900 border border-slate-600 p-3 text-white rounded-lg outline-none h-32" /><Button onClick={handleNewsUpload} className="w-full bg-red-600 hover:bg-red-700 border-0">BROADCAST</Button></div>)}</div>)}
            {activeTab === 'syllabus' && (<div className="max-w-4xl mx-auto space-y-6"><div className="bg-slate-800 p-6 rounded border border-slate-700 space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><select value={syllabusExam} onChange={e => setSyllabusExam(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white outline-none">{Object.keys(examConfig).map(e => <option key={e} value={e}>{e}</option>)}</select><input placeholder="Subject" value={syllabusSubject} onChange={e => setSyllabusSubject(e.target.value)} className="w-full bg-slate-900 border border-slate-600 p-3 rounded-lg text-white outline-none" /></div><div className="bg-indigo-900/10 p-6 rounded-xl border border-indigo-500/30 border-dashed"><textarea value={syllabusText} onChange={e => setSyllabusText(e.target.value)} placeholder="Syllabus text..." className="w-full bg-slate-900 border border-slate-700 p-3 text-white rounded-lg outline-none h-40 text-sm mb-4" /><div className="flex gap-3"><input type="file" ref={syllabusFileRef} className="hidden" onChange={handleSyllabusFile} /><button onClick={() => syllabusFileRef.current?.click()} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg border border-slate-600" disabled={isProcessingSyllabus}>Extract from File</button><Button onClick={handleSaveSyllabus} disabled={!syllabusText} className="flex-1 bg-indigo-600 border-0">Save Syllabus</Button></div></div></div></div>)}
            {activeTab === 'settings' && (<div className="max-w-2xl mx-auto space-y-8 animate-fade-in"><div className="bg-slate-800 p-6 rounded border border-slate-700"><h3 className="text-xl font-bold text-white mb-4">AI Engine Configuration</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-400 uppercase mb-3">Select AI Provider</label><div className="grid grid-cols-1 gap-3">{[{ id: 'gemini-2.5', name: 'Gemini 2.5 Flash', desc: 'Newer, smarter model (Recommended).' }, { id: 'groq', name: 'Llama 3 on Groq', desc: 'Ultra-fast. Requires API Key.' },].map(provider => (<div key={provider.id} onClick={() => setSelectedProvider(provider.id)} className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${selectedProvider === provider.id ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}><div><div className={`font-bold ${selectedProvider === provider.id ? 'text-indigo-400' : 'text-white'}`}>{provider.name}</div><div className="text-xs text-slate-500">{provider.desc}</div></div>{selectedProvider === provider.id && <span className="text-indigo-500">●</span>}</div>))}</div></div>{selectedProvider === 'groq' && (<div className="animate-slide-up"><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Groq API Key</label><input type="password" value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="gsk_..." className="w-full bg-slate-900 border border-slate-600 p-3 rounded text-white outline-none focus:border-indigo-500 font-mono text-sm" /><p className="text-[10px] text-slate-500 mt-1">Key is stored locally in your browser.</p></div>)}<div className="pt-4"><Button onClick={() => { localStorage.setItem('selected_ai_provider', selectedProvider); localStorage.setItem('groq_api_key', groqKey); alert('AI Settings Saved!'); }} className="w-full bg-indigo-600 hover:bg-indigo-700 border-0">Save Configuration</Button></div></div></div><div className="bg-slate-800 p-6 rounded border border-slate-700"><h3 className="text-lg font-bold text-white mb-2">System Maintenance</h3><div className="flex gap-4"><button onClick={async () => { if(confirm("Clear all cached exam configs?")) { localStorage.removeItem('cached_exam_config'); window.location.reload(); } }} className="text-orange-400 border border-orange-900/50 bg-orange-900/10 px-4 py-2 rounded text-sm hover:bg-orange-900/30 transition-colors">Clear Caches</button></div></div></div>)}
         </div>
      </div>
    </div>
  );
};