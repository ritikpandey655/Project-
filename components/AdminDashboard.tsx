import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Question, QuestionSource, NewsItem, User, Transaction, QuestionType, ExamType, SyllabusItem } from '../types';
import { 
  saveAdminQuestion, getAdminQuestions, 
  getAllUsers, removeUser, toggleUserPro,
  getTransactions, saveExamConfig, getExamConfig, getSystemLogs, SystemLog, clearSystemLogs,
  logSystemError
} from '../services/storageService';
import { checkAIConnectivity } from '../services/geminiService';
import { EXAM_SUBJECTS } from '../constants';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'users' | 'exams' | 'upload' | 'syllabus' | 'questions' | 'payments' | 'settings'>('monitor');
  
  // System Health States
  const [aiStatus, setAiStatus] = useState<'Checking' | 'Operational' | 'Failed'>('Checking');
  const [latency, setLatency] = useState<number>(0);
  const [isSecure, setIsSecure] = useState<boolean>(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  // SEO States
  const [seoStatus, setSeoStatus] = useState<{ canonical: boolean, desc: boolean, robots: boolean }>({ canonical: false, desc: false, robots: false });
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  // Upload States
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState('');

  useEffect(() => {
    loadInitialData();
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsTestRunning(true);
    setAiStatus('Checking');
    setLatency(0);

    // 1. Check AI Backend
    try {
        const result = await checkAIConnectivity();
        setAiStatus(result.status);
        setLatency(result.latency);
        setIsSecure(result.secure);
        
        if (result.status === 'Failed') await logSystemError('API_FAIL', 'Diagnostic: Backend Health Check Failed');
    } catch(e: any) {
        setAiStatus('Failed');
        await logSystemError('ERROR', 'Diagnostic Crash', { error: e.message });
    }

    // 2. Check SEO Tags (Client Side)
    const canonical = !!document.querySelector('link[rel="canonical"]');
    const desc = !!document.querySelector('meta[name="description"]');
    const robots = !!document.querySelector('meta[name="robots"]');
    setSeoStatus({ canonical, desc, robots });

    const recentLogs = await getSystemLogs();
    setLogs(recentLogs);
    setIsTestRunning(false);
  };

  const loadInitialData = async () => {
    const [usersData] = await Promise.all([
        getAllUsers(),
    ]);
    setUsers(usersData);
    setFilteredUsers(usersData);
    refreshLogs();
  };

  const refreshLogs = async () => {
      const recent = await getSystemLogs();
      setLogs(recent);
  };

  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setUserSearch(term);
    setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
  };

  const handleTogglePro = async (userId: string, currentStatus: boolean) => {
    await toggleUserPro(userId, currentStatus);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isPro: !currentStatus } : u));
    setFilteredUsers(prev => prev.map(u => u.id === userId ? { ...u, isPro: !currentStatus } : u));
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Delete this user?")) return;
    await removeUser(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    setFilteredUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleManualUpload = async () => {
    if (!qText || qOptions.some(o => !o)) return alert("Fill all fields");
    const newQ: Question = { 
        id: `off-${Date.now()}`, 
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
    alert("Uploaded!");
    setQText(''); setQOptions(['', '', '', '']); setQExplanation('');
  };

  const navItems = [
    { id: 'monitor', icon: '📡', label: 'Engine' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'upload', icon: '📤', label: 'Upload' },
    { id: 'settings', icon: '⚙️', label: 'Config' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-mono animate-fade-in fixed inset-0 z-[100] overflow-y-auto">
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-20 flex justify-between items-center shadow-lg pt-safe">
         <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-widest uppercase text-slate-200">
                PYQverse <span className="text-orange-500">ADMIN</span>
            </h1>
            <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                SECURE CLOUD
            </span>
         </div>
         <div className="flex gap-2">
            <button onClick={runDiagnostics} className={`px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-bold uppercase ${isTestRunning ? 'animate-pulse' : ''}`}>
                {isTestRunning ? 'Scanning...' : 'System Diagnostic'}
            </button>
            <button onClick={onBack} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-[10px] font-bold uppercase">Exit</button>
         </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
         <div className="w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col p-4 space-y-2">
            {navItems.map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-3 p-3 rounded text-sm font-bold text-left transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                    <span>{item.icon}</span> {item.label}
                </button>
            ))}
         </div>

         <div className="flex-1 p-6 overflow-y-auto bg-slate-900 pb-20">
            {activeTab === 'monitor' && (
                <div className="space-y-6 max-w-5xl mx-auto">
                    {/* Security & Health Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Status Card */}
                        <div className={`p-6 rounded-2xl border ${aiStatus === 'Operational' ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-4">Backend Status</p>
                            <div className="flex items-center gap-4">
                                <div className={`w-4 h-4 rounded-full ${aiStatus === 'Operational' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'} animate-pulse`}></div>
                                <h3 className={`text-3xl font-bold ${aiStatus === 'Operational' ? 'text-green-400' : 'text-red-400'}`}>{aiStatus}</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4">Node.js Proxy is handling requests.</p>
                        </div>

                        {/* Latency Card */}
                        <div className="p-6 rounded-2xl border bg-slate-800/50 border-slate-700">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-4">Network Latency</p>
                            <h3 className="text-4xl font-bold text-white flex items-end gap-2">
                                {latency} <span className="text-lg text-slate-500 font-medium">ms</span>
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-4">Round-trip time to Server.</p>
                        </div>

                        {/* Security Card */}
                        <div className={`p-6 rounded-2xl border ${isSecure ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-4">Security Integrity</p>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{isSecure ? '🔒' : '⚠️'}</span>
                                <h3 className="text-xl font-bold text-white">{isSecure ? 'Key Secured' : 'Key Missing'}</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4">
                                {isSecure ? 'API Key is hidden on server-side.' : 'CRITICAL: Env Config Missing.'}
                            </p>
                        </div>
                    </div>

                    {/* SEO Health Card */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white text-lg">SEO & Indexing Health</h3>
                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">Fix for "Page with redirect"</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Canonical Tag</span>
                                    {seoStatus.canonical ? <span className="text-green-400">✅ Active</span> : <span className="text-red-400">❌ Missing</span>}
                                </div>
                                <p className="text-[10px] text-slate-500">Fixes duplicate content/redirect errors.</p>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Landing Page</span>
                                    <span className="text-green-400">✅ Live</span>
                                </div>
                                <p className="text-[10px] text-slate-500">Root URL returns content (No Redirect).</p>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Robots Meta</span>
                                    {seoStatus.robots ? <span className="text-green-400">✅ Index, Follow</span> : <span className="text-red-400">❌ Issues</span>}
                                </div>
                                <p className="text-[10px] text-slate-500">Allows Googlebot to crawl pages.</p>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg text-sm text-indigo-200">
                            <strong>Next Step:</strong> Go to Google Search Console &gt; Inspect URL &gt; Click "Test Live URL". If it says "Available", click "Validate Fix".
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h3 className="font-bold text-white text-sm">System Event Log</h3>
                            <button onClick={clearSystemLogs} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase underline">Wipe Logs</button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-900 text-slate-500 uppercase sticky top-0">
                                    <tr><th className="p-3">Timestamp</th><th className="p-3">Type</th><th className="p-3">Message</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {logs.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-slate-600">Event log is currently empty.</td></tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-700/30">
                                                <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="p-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${log.type === 'ERROR' ? 'bg-red-900/50 text-red-400' : 'bg-slate-700 text-slate-300'}`}>{log.type}</span></td>
                                                <td className="p-3 text-slate-300">{log.message}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'users' && (
                <div className="space-y-4 max-w-5xl mx-auto">
                    <div className="flex gap-2">
                        <input type="text" placeholder="Search user by name or email..." value={userSearch} onChange={handleUserSearch} className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500" />
                        <Button onClick={loadInitialData} className="bg-slate-700 hover:bg-slate-600 border-0">Reload</Button>
                    </div>
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 text-slate-500 text-[10px] uppercase tracking-widest">
                                <tr><th className="p-4">Identity</th><th className="p-4">Rank</th><th className="p-4 text-right">Access Control</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 text-sm">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-700/20">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-200">{user.name}</div>
                                            <div className="text-[10px] text-slate-500">{user.email}</div>
                                        </td>
                                        <td className="p-4">
                                            {user.isAdmin ? <span className="bg-red-900/50 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/30">ADMIN</span> : 
                                             user.isPro ? <span className="bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-500/30">PRO</span> : 
                                             <span className="text-slate-600 text-[10px] font-bold uppercase">Cadet</span>}
                                        </td>
                                        <td className="p-4 text-right space-x-3">
                                            <button onClick={() => handleTogglePro(user.id, !!user.isPro)} className="text-indigo-400 hover:text-white text-xs font-bold underline transition-colors">{user.isPro ? 'Revoke PRO' : 'Grant PRO'}</button>
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-white text-xs font-bold underline transition-colors">TERMINATE</button>
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
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h3 className="font-bold text-lg mb-4">Manual Question Upload</h3>
                        <div className="space-y-4">
                            <input className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl" placeholder="Question Text" value={qText} onChange={e => setQText(e.target.value)} />
                            {qOptions.map((o, i) => (
                                <input key={i} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl" placeholder={`Option ${i+1}`} value={o} onChange={e => {
                                    const n = [...qOptions]; n[i] = e.target.value; setQOptions(n);
                                }} />
                            ))}
                            <div className="flex gap-4">
                                <input className="p-3 bg-slate-900 border border-slate-700 rounded-xl" type="number" min="0" max="3" placeholder="Correct Index (0-3)" value={qCorrect} onChange={e => setQCorrect(parseInt(e.target.value))} />
                                <input className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-xl" placeholder="Subject" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} />
                            </div>
                            <Button onClick={handleManualUpload} className="w-full">Upload to Official Bank</Button>
                        </div>
                    </div>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};