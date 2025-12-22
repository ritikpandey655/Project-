
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Question, QuestionSource, NewsItem, User, Transaction, QuestionType, ExamType, SyllabusItem } from '../types';
import { 
  saveAdminQuestion, getAdminQuestions, 
  getAllUsers, removeUser, toggleUserPro,
  getTransactions, saveExamConfig, getExamConfig, getSystemLogs, SystemLog, clearSystemLogs,
  logSystemError, getSystemConfig, saveSystemConfig
} from '../services/storageService';
import { checkAIConnectivity, generateExamQuestions } from '../services/geminiService';
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
  const [seoStatus, setSeoStatus] = useState<{ 
      canonical: boolean, 
      canonicalUrl: string,
      desc: boolean, 
      robots: boolean,
      robotsContent: string
  }>({ 
      canonical: false, 
      canonicalUrl: '',
      desc: false, 
      robots: false,
      robotsContent: ''
  });
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  // Upload States
  const [uploadMode, setUploadMode] = useState<'manual' | 'bulk' | 'ai'>('manual');
  
  // Manual Upload State
  const [qText, setQText] = useState('');
  const [qTextHindi, setQTextHindi] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState('History');
  const [uploadTopic, setUploadTopic] = useState('');
  
  // Bulk Upload State
  const [bulkJson, setBulkJson] = useState('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // AI Upload State
  const [aiCount, setAiCount] = useState(5);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Config State
  const [configJson, setConfigJson] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq'>('gemini');

  useEffect(() => {
    loadInitialData();
    runDiagnostics();
  }, []);

  // Load config when tab changes to settings
  useEffect(() => {
    if (activeTab === 'settings') {
        const loadConfig = async () => {
            try {
                const conf = await getExamConfig();
                setConfigJson(JSON.stringify(conf, null, 2));
                const sysConf = await getSystemConfig();
                setAiProvider(sysConf.aiProvider || 'gemini');
            } catch (e) {
                setConfigJson(JSON.stringify(EXAM_SUBJECTS, null, 2));
            }
        };
        loadConfig();
    }
  }, [activeTab]);

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

    // 2. Check SEO Tags (Client Side Deep Check)
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = canonicalTag ? canonicalTag.getAttribute('href') || '' : '';
    
    const descTag = document.querySelector('meta[name="description"]');
    const robotsTag = document.querySelector('meta[name="robots"]');
    const robotsContent = robotsTag ? robotsTag.getAttribute('content') || '' : '';

    setSeoStatus({ 
        canonical: !!canonicalTag && canonicalUrl === 'https://pyqverse.in/', 
        canonicalUrl,
        desc: !!descTag, 
        robots: !!robotsTag && robotsContent.includes('index'),
        robotsContent
    });

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

  // --- UPLOAD HANDLERS ---

  const handleManualUpload = async () => {
    if (!qText || qOptions.some(o => !o)) return alert("Fill all fields");
    const newQ: Question = { 
        id: `off-${Date.now()}`, 
        text: qText,
        textHindi: qTextHindi || undefined,
        options: qOptions, 
        correctIndex: qCorrect, 
        explanation: qExplanation, 
        source: QuestionSource.OFFICIAL, 
        examType: uploadExam, 
        subject: uploadSubject, 
        tags: uploadTopic ? [uploadTopic] : [],
        createdAt: Date.now(), 
        type: QuestionType.MCQ, 
        moderationStatus: 'APPROVED' 
    };
    await saveAdminQuestion(newQ);
    alert("Question Uploaded Successfully!");
    // Reset partial
    setQText(''); setQTextHindi(''); setQOptions(['', '', '', '']); setQExplanation('');
  };

  const handleBulkUpload = async () => {
      try {
          setIsBulkUploading(true);
          const data = JSON.parse(bulkJson);
          if (!Array.isArray(data)) throw new Error("JSON must be an array of questions");
          
          let count = 0;
          for (const item of data) {
              const newQ: Question = {
                  id: `off-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  text: item.text || item.question,
                  options: item.options,
                  correctIndex: item.correctIndex ?? 0,
                  explanation: item.explanation,
                  source: QuestionSource.OFFICIAL,
                  examType: item.examType || uploadExam,
                  subject: item.subject || uploadSubject,
                  createdAt: Date.now(),
                  type: QuestionType.MCQ,
                  moderationStatus: 'APPROVED'
              };
              await saveAdminQuestion(newQ);
              count++;
          }
          alert(`Successfully uploaded ${count} questions!`);
          setBulkJson('');
      } catch (e: any) {
          alert("Bulk Upload Failed: " + e.message);
      } finally {
          setIsBulkUploading(false);
      }
  };

  const handleAiGenerateUpload = async () => {
      setIsAiGenerating(true);
      try {
          const questions = await generateExamQuestions(uploadExam, uploadSubject, aiCount, 'Hard', uploadTopic ? [uploadTopic] : []);
          
          let count = 0;
          for (const q of questions) {
              // Convert AI question to Official Question
              const officialQ: Question = {
                  ...q,
                  id: `off-ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  source: QuestionSource.OFFICIAL, // Override source
                  moderationStatus: 'APPROVED'
              };
              await saveAdminQuestion(officialQ);
              count++;
          }
          alert(`Generated & Saved ${count} Questions to Official Bank!`);
      } catch (e) {
          alert("AI Generation Failed");
      } finally {
          setIsAiGenerating(false);
      }
  };

  const handleSaveConfig = async () => {
    try {
        setIsSavingConfig(true);
        const parsed = JSON.parse(configJson);
        await saveExamConfig(parsed);
        // Save Provider
        await saveSystemConfig({ aiProvider });
        alert("Configuration Saved & Cached Successfully!");
    } catch(e: any) {
        alert("Invalid JSON format: " + e.message);
    } finally {
        setIsSavingConfig(false);
    }
  };

  const navItems = [
    { id: 'monitor', icon: '📡', label: 'Engine' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'upload', icon: '📤', label: 'Upload' },
    { id: 'settings', icon: '⚙️', label: 'Config' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-mono animate-fade-in fixed inset-0 z-[100] overflow-y-auto pb-safe">
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
            <button onClick={runDiagnostics} className={`hidden sm:block px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-bold uppercase ${isTestRunning ? 'animate-pulse' : ''}`}>
                {isTestRunning ? 'Scanning...' : 'Diagnostic'}
            </button>
            <button onClick={onBack} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-[10px] font-bold uppercase">Exit</button>
         </div>
      </div>

      <div className="flex h-[calc(100vh-64px)] pb-20 md:pb-0">
         <div className="w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col p-4 space-y-2">
            {navItems.map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-3 p-3 rounded text-sm font-bold text-left transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                    <span>{item.icon}</span> {item.label}
                </button>
            ))}
         </div>

         <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-900">
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

            {activeTab === 'settings' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-white">System Configuration</h3>
                                <p className="text-xs text-slate-400">Manage dynamic exam structures and core settings.</p>
                            </div>
                            <Button onClick={handleSaveConfig} isLoading={isSavingConfig} className="bg-green-600 hover:bg-green-700 text-xs">
                                Save Changes
                            </Button>
                        </div>

                        {/* AI Provider Switch */}
                        <div className="mb-6 p-4 bg-slate-900/50 border border-slate-600 rounded-xl">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-3">AI Engine Provider</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${aiProvider === 'gemini' ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
                                    <input type="radio" name="aiProvider" value="gemini" checked={aiProvider === 'gemini'} onChange={() => setAiProvider('gemini')} className="hidden" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                                            {aiProvider === 'gemini' && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                                        </div>
                                        <div>
                                            <span className="block font-bold text-white">Gemini 3.0 Flash</span>
                                            <span className="text-[10px] text-slate-400">Google • Fastest • Best for General</span>
                                        </div>
                                    </div>
                                </label>

                                <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${aiProvider === 'groq' ? 'border-orange-500 bg-orange-900/20' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
                                    <input type="radio" name="aiProvider" value="groq" checked={aiProvider === 'groq'} onChange={() => setAiProvider('groq')} className="hidden" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full border-2 border-orange-500 flex items-center justify-center">
                                            {aiProvider === 'groq' && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                                        </div>
                                        <div>
                                            <span className="block font-bold text-white">Llama 3 (Groq)</span>
                                            <span className="text-[10px] text-slate-400">Meta • Open Source • High Logic</span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        {/* Exam Config Editor */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Dynamic Exam Map (JSON)
                            </label>
                            <div className="relative">
                                <textarea
                                    className="w-full h-96 p-4 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-green-400 outline-none focus:border-indigo-500 leading-relaxed"
                                    value={configJson}
                                    onChange={(e) => setConfigJson(e.target.value)}
                                    spellCheck={false}
                                />
                                <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-[10px] text-slate-400 pointer-events-none">
                                    JSON Editor
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Warning: Modifying the keys (Exam Names) will affect existing user data. Only add new exams or modify subject arrays.
                            </p>
                        </div>
                        
                        <div className="border-t border-slate-700 pt-6">
                            <h4 className="font-bold text-sm text-white mb-3">Danger Zone</h4>
                            <div className="flex gap-4">
                                <button onClick={async () => {
                                    if(confirm("Clear all system logs?")) {
                                        await clearSystemLogs();
                                        refreshLogs();
                                        alert("Logs Cleared");
                                    }
                                }} className="px-4 py-2 bg-red-900/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-900/50 border border-red-900/50">
                                    Flush System Logs
                                </button>
                                <button onClick={() => {
                                    if(confirm("Reset configuration to default constants?")) {
                                        setConfigJson(JSON.stringify(EXAM_SUBJECTS, null, 2));
                                    }
                                }} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600">
                                    Reset to Defaults
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* Mobile Bottom Navigation for Admin */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 p-2 z-30 flex justify-around pb-safe">
          {navItems.map((item) => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === item.id ? 'text-indigo-400 bg-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  <span className="text-xl mb-1">{item.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
              </button>
          ))}
      </div>
    </div>
  );
};
