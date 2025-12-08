
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Question, QuestionSource, NewsItem, User, Transaction } from '../types';
import { 
  getGlobalStats, saveAdminQuestion, getAdminQuestions, 
  saveAdminNews, getAllUsers, removeUser, toggleUserPro, deleteGlobalQuestion,
  getTransactions, saveExamConfig, getExamConfig
} from '../services/storageService';
import { parseSmartInput } from '../services/geminiService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'exams' | 'upload' | 'questions' | 'payments' | 'settings'>('dashboard');
  
  // System Health States
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Online' | 'Offline'>('Checking');
  const [ping, setPing] = useState<number>(0);
  const [isSecure, setIsSecure] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string>('-');

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
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  
  // Question Form State
  const [qText, setQText] = useState('');
  const [qTextHindi, setQTextHindi] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qOptionsHindi, setQOptionsHindi] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  
  // Smart Import State
  const [smartInput, setSmartInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartMode, setSmartMode] = useState<'Manual' | 'SmartPaste' | 'Image' | 'Syllabus'>('Syllabus');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Syllabus specific state
  const [syllabusFile, setSyllabusFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const syllabusInputRef = useRef<HTMLInputElement>(null);

  // Bulk Queue
  const [bulkQueue, setBulkQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  
  const [newsHeadline, setNewsHeadline] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsCategory, setNewsCategory] = useState('National');
  const [newsDate, setNewsDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Settings State - Auto-fill from env if not in local storage
  const [groqKey, setGroqKey] = useState(localStorage.getItem('groq_api_key') || process.env.GROQ_API_KEY || '');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq'>(
    (localStorage.getItem('selected_ai_provider') as 'gemini' | 'groq') || 'groq'
  );
  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [groqStatus, setGroqStatus] = useState<'none' | 'success' | 'error'>('none');
  const [groqErrorMsg, setGroqErrorMsg] = useState('');

  // Load Data
  useEffect(() => {
    loadAllData();
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async (retryCount = 0) => {
    setBackendStatus('Checking');
    const start = performance.now();
    try {
      // Add timestamp to prevent caching
      const response = await fetch(`/api/health?t=${Date.now()}`);
      const end = performance.now();
      const latency = Math.round(end - start);
      setPing(latency);
      
      if (response.ok) {
        const data = await response.json();
        setBackendStatus('Online');
        setIsSecure(!!data.secure);
      } else {
        throw new Error("Status not OK");
      }
    } catch (e) {
      console.warn(`Backend check failed (Attempt ${retryCount + 1})`);
      // Retry logic for Cold Starts (Vercel functions can take 2-3s to wake up)
      if (retryCount < 2) {
          setTimeout(() => checkSystemHealth(retryCount + 1), 1500);
      } else {
          setBackendStatus('Offline');
          setPing(0);
      }
    }
    setLastChecked(new Date().toLocaleTimeString());
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
        const [u, q, t, e] = await Promise.all([
            getAllUsers(),
            getAdminQuestions(),
            getTransactions(),
            getExamConfig()
        ]);

        setUsers(u);
        setFilteredUsers(u);
        setQuestions(q); setFilteredQuestions(q);
        setTransactions(t);
        setExamConfig(e);
        if (Object.keys(e).length > 0) setUploadExam(Object.keys(e)[0]);
    } catch (e) {
        console.error("Failed to load admin data", e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    const lower = userSearch.toLowerCase();
    setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower)));
  }, [userSearch, users]);

  useEffect(() => {
    const lower = questionSearch.toLowerCase();
    setFilteredQuestions(questions.filter(q => q.text.toLowerCase().includes(lower) || q.subject?.toLowerCase().includes(lower)));
  }, [questionSearch, questions]);

  const handleSaveGroqKey = async () => {
      setIsTestingGroq(true);
      setGroqStatus('none');
      setGroqErrorMsg('');

      try {
          // 1. Validate Format Basic
          if (!groqKey.trim().startsWith('gsk_')) {
              throw new Error("Invalid format. Key must start with 'gsk_'");
          }

          // 2. Perform Real Test Call via Proxy
          const response = await fetch('/api/ai/groq', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  model: 'llama3-70b-8192',
                  messages: [{ role: 'user', content: 'Say OK' }],
                  apiKey: groqKey // Explicitly send the new key to test
              })
          });

          const data = await response.json();

          if (!data.success) {
              if (response.status === 429) throw new Error("Quota Exceeded on this Key");
              throw new Error(data.error || "Connection Failed");
          }

          // 3. Success
          localStorage.setItem('groq_api_key', groqKey);
          setGroqStatus('success');
          alert("✅ Connected! Groq Key verified and saved.");
      } catch (e: any) {
          setGroqStatus('error');
          setGroqErrorMsg(e.message);
          console.error("Groq Test Failed:", e);
      } finally {
          setIsTestingGroq(false);
      }
  };

  const toggleAIProvider = (provider: 'gemini' | 'groq') => {
      // Prevent switching to Groq if no key is set
      if (provider === 'groq') {
          const key = localStorage.getItem('groq_api_key');
          if (!key && !process.env.GROQ_API_KEY) {
              alert("⚠️ Please configure and save a valid Groq API Key first.");
              return;
          }
      }
      setAiProvider(provider);
      localStorage.setItem('selected_ai_provider', provider);
  };

  const handleTogglePro = async (id: string, current: boolean) => {
    await toggleUserPro(id, current);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isPro: !u.isPro } : u));
  };

  const handleDeleteUser = async (id: string) => {
    if(confirm("Delete user?")) { await removeUser(id); setUsers(prev => prev.filter(u => u.id !== id)); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if(confirm("Delete question?")) { await deleteGlobalQuestion(id); setQuestions(prev => prev.filter(q => q.id !== id)); }
  };

  const handleAddExam = async () => {
    if (!newExamName || !newExamSubjects) return;
    const subjects = newExamSubjects.split(',').map(s => s.trim());
    const newConfig = { ...examConfig, [newExamName]: subjects };
    await saveExamConfig(newConfig);
    setExamConfig(newConfig);
    setNewExamName(''); setNewExamSubjects('');
    alert("Exam Added!");
  };

  const handleDeleteExam = async (exam: string) => {
    if(confirm(`Delete ${exam}?`)) {
      const newConfig = { ...examConfig };
      delete newConfig[exam];
      await saveExamConfig(newConfig);
      setExamConfig(newConfig);
    }
  };

  const populateFormWithData = (data: any) => {
    setQText(data.text || data.question || '');
    setQTextHindi(data.text_hi || '');
    if (Array.isArray(data.options)) setQOptions(data.options.slice(0, 4));
    if (Array.isArray(data.options_hi)) setQOptionsHindi(data.options_hi.slice(0, 4));
    setQCorrect(data.correct_index || data.correctIndex || 0);
    setQExplanation(data.explanation || '');
    if (data.subject) setUploadSubject(data.subject);
  };

  const handleSmartAnalyze = async (inputType: 'text' | 'image', data: string) => {
    setIsAnalyzing(true);
    try {
        const results = await parseSmartInput(data, inputType, uploadExam);
        if (results && results.length > 0) {
            setBulkQueue(results);
            setCurrentQueueIndex(0);
            populateFormWithData(results[0]);
            setIsReviewing(true); 
        } else {
            alert("Could not extract data. Try manually.");
        }
    } catch (e) { alert("Error analyzing."); }
    finally { setIsAnalyzing(false); }
  };

  const handleSyllabusGenerate = async () => {
      if (!syllabusFile) return alert("Please select a file first");
      setIsAnalyzing(true);
      
      try {
          const prompt = `
            ACT AS A STRICT EXAMINER for ${uploadExam}.
            SUBJECT: ${uploadSubject || 'General'}.
            
            TASK: Analyze the provided Syllabus/Content image/PDF carefully.
            GENERATE 10 High-Quality MCQs strictly based on the topics visible in this file.
            
            RULES:
            1. Questions must be factually correct and relevant to the syllabus.
            2. Provide 4 options and identify the correct one.
            3. Provide a short explanation.
            4. STRICTLY NO Hallucinations. If topic is unclear, focus on standard ${uploadSubject} topics.
            
            OUTPUT JSON ARRAY:
            [{ "text": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." }]
          `;
          
          const response = await fetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  model: 'gemini-2.5-flash',
                  contents: {
                      parts: [
                          { inlineData: { mimeType: syllabusFile.mimeType, data: syllabusFile.data } },
                          { text: prompt }
                      ]
                  },
                  config: { responseMimeType: "application/json" }
              })
          });
          
          const result = await response.json();
          if(result.success && result.data) {
              const cleaned = result.data.replace(/```json/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleaned);
              const items = Array.isArray(parsed) ? parsed : (parsed.questions || []);
              
              if(items.length > 0) {
                  setBulkQueue(items);
                  setCurrentQueueIndex(0);
                  populateFormWithData(items[0]);
                  setIsReviewing(true);
              } else {
                  alert("AI generated no questions. Try a clearer image.");
              }
          } else {
              throw new Error("Generation failed");
          }

      } catch(e) {
          console.error(e);
          alert("Error generating from syllabus.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'syllabus') => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) return alert("File too large (>10MB)");
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1];
            if (type === 'image') {
                setImagePreview(URL.createObjectURL(file));
                handleSmartAnalyze('image', base64);
            } else {
                setSyllabusFile({
                    name: file.name,
                    mimeType: file.type || 'image/jpeg',
                    data: base64
                });
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleResetForm = () => {
    setQText(''); setQTextHindi('');
    setQOptions(['', '', '', '']); setQOptionsHindi(['', '', '', '']);
    setQCorrect(0); setQExplanation('');
    setSmartInput('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setSyllabusFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (syllabusInputRef.current) syllabusInputRef.current.value = '';
    setIsReviewing(false);
    setBulkQueue([]);
    setCurrentQueueIndex(0);
  };

  const handleSkipQuestion = () => {
    const nextIdx = currentQueueIndex + 1;
    if (nextIdx < bulkQueue.length) {
        setCurrentQueueIndex(nextIdx);
        populateFormWithData(bulkQueue[nextIdx]);
    } else {
        alert("End of queue.");
        handleResetForm();
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (uploadType === 'Question') {
        const newQ: Question = {
            id: `official-${Date.now()}`,
            text: qText,
            textHindi: qTextHindi,
            options: qOptions,
            optionsHindi: qOptionsHindi,
            correctIndex: qCorrect,
            explanation: qExplanation,
            source: QuestionSource.OFFICIAL,
            examType: uploadExam,
            subject: uploadSubject || 'General',
            createdAt: Date.now(),
            pyqYear: uploadYear,
            moderationStatus: 'APPROVED'
        };
        await saveAdminQuestion(newQ);
        if (bulkQueue.length > 0) {
            const nextIdx = currentQueueIndex + 1;
            if (nextIdx < bulkQueue.length) {
                setCurrentQueueIndex(nextIdx);
                populateFormWithData(bulkQueue[nextIdx]);
            } else {
                alert("All questions in queue saved!");
                handleResetForm();
            }
        } else {
            alert("Question Uploaded Successfully!");
            handleResetForm();
        }
    } else {
        const newNews: NewsItem = {
            id: `admin-news-${Date.now()}`,
            headline: newsHeadline,
            headlineHindi: '',
            summary: newsSummary,
            summaryHindi: '',
            category: newsCategory,
            date: newsDate,
            tags: ['Official'],
            isOfficial: true
        };
        await saveAdminNews(newNews);
        alert("News Uploaded!");
        setNewsHeadline(''); setNewsSummary('');
    }
    setIsSubmitting(false);
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Backend Health Monitor Card */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-6 w-full sm:w-auto">
               <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Backend Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${backendStatus === 'Online' ? 'bg-green-500 animate-pulse' : backendStatus === 'Checking' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                    <p className={`font-bold text-lg ${backendStatus === 'Online' ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                        {backendStatus === 'Checking' ? 'Connecting...' : backendStatus}
                    </p>
                  </div>
               </div>
               
               <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

               <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Latency (Ping)</p>
                  <p className={`font-mono font-bold text-lg ${ping < 100 ? 'text-green-600' : ping < 300 ? 'text-yellow-600' : 'text-red-600'}`}>
                     {ping} ms
                  </p>
               </div>

               <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

               <div className="hidden sm:block">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Security</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1">
                     {isSecure ? '🔒 Secured' : '⚠️ Unsecured'}
                  </p>
               </div>
            </div>

            <div className="flex gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
                <Button size="sm" variant="outline" onClick={() => checkSystemHealth(0)} title="Refresh Ping">
                   ⚡ Refresh
                </Button>
                <Button size="sm" variant="secondary" onClick={loadAllData} isLoading={isLoading}>
                   🔄 Sync DB
                </Button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Total Users</h3>
                <p className="text-4xl font-extrabold text-slate-800 dark:text-white mt-2">
                    {isLoading ? <span className="text-2xl opacity-50">...</span> : users.length}
                </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Questions</h3>
                <p className="text-4xl font-extrabold text-brand-purple mt-2">
                    {isLoading ? <span className="text-2xl opacity-50">...</span> : questions.length}
                </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Transactions</h3>
                <p className="text-4xl font-extrabold text-green-600 dark:text-green-400 mt-2">
                    {isLoading ? <span className="text-2xl opacity-50">...</span> : transactions.length}
                </p>
            </div>
        </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-lg dark:text-white mb-4">User Management</h3>
        <input type="text" placeholder="Search..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full p-2 mb-4 border rounded dark:bg-slate-900 dark:text-white" />
        <div className="overflow-x-auto">
            {isLoading ? (
                <div className="p-8 text-center text-slate-500">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No users found.</div>
            ) : (
                <table className="w-full text-left text-sm">
                    <thead><tr className="text-slate-500 border-b"><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Action</th></tr></thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="border-b dark:border-slate-700 dark:text-slate-300">
                                <td className="p-2 font-bold">{u.name}</td>
                                <td className="p-2">{u.email}</td>
                                <td className="p-2 flex gap-2">
                                    <button onClick={() => handleTogglePro(u.id, !!u.isPro)} className="text-indigo-500 font-bold">{u.isPro ? 'Un-Pro' : 'Make Pro'}</button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-500">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );

  const renderExams = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-lg dark:text-white mb-4">Manage Exams</h3>
        <div className="flex gap-2 mb-4">
            <input value={newExamName} onChange={e => setNewExamName(e.target.value)} placeholder="Exam Name" className="flex-1 p-2 border rounded dark:bg-slate-900 dark:text-white" />
            <input value={newExamSubjects} onChange={e => setNewExamSubjects(e.target.value)} placeholder="Subjects (comma sep)" className="flex-1 p-2 border rounded dark:bg-slate-900 dark:text-white" />
            <Button onClick={handleAddExam}>Add</Button>
        </div>
        <div className="space-y-2">
            {Object.keys(examConfig).map(e => (
                <div key={e} className="flex justify-between p-2 border rounded dark:border-slate-700 dark:text-white">
                    <span>{e}</span>
                    <button onClick={() => handleDeleteExam(e)} className="text-red-500">🗑️</button>
                </div>
            ))}
        </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-lg dark:text-white mb-4">Global Question Bank</h3>
        <input type="text" placeholder="Search questions..." value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} className="w-full p-2 mb-4 border rounded dark:bg-slate-900 dark:text-white" />
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredQuestions.map(q => (
                <div key={q.id} className="p-3 border rounded dark:border-slate-700 dark:text-white flex justify-between">
                    <div><span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 rounded">{q.examType}</span> <p className="mt-1 font-medium">{q.text}</p></div>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 text-xs font-bold">DEL</button>
                </div>
            ))}
        </div>
    </div>
  );

  const renderPayments = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-lg dark:text-white mb-4">Transaction History</h3>
        <div className="space-y-2">
            {transactions.map(t => (
                <div key={t.id} className="flex justify-between p-3 border rounded dark:border-slate-700 dark:text-white">
                    <div><p className="font-bold">{t.userName}</p><p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="font-bold">₹{t.amount}</p><span className={`text-xs ${t.status==='SUCCESS'?'text-green-500':'text-red-500'}`}>{t.status}</span></div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-lg dark:text-white mb-6">System Settings</h3>
        
        {/* Groq Key Configuration */}
        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase mb-2">Groq AI Acceleration</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Enter your Groq API key for ultra-fast generation. 
                <br/>Get one from <a href="https://console.groq.com/keys" target="_blank" className="text-indigo-500 underline">console.groq.com</a>.
            </p>
            <div className="flex gap-2">
                <input 
                    type="password" 
                    value={groqKey} 
                    onChange={e => setGroqKey(e.target.value)} 
                    placeholder="gsk_..." 
                    className={`flex-1 p-3 border rounded-xl dark:bg-slate-900 dark:text-white font-mono text-sm outline-none transition-colors ${groqStatus === 'error' ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                />
                <Button onClick={handleSaveGroqKey} size="sm" isLoading={isTestingGroq}>
                   Test & Save
                </Button>
            </div>
            
            {groqStatus === 'success' && (
                <p className="text-green-600 dark:text-green-400 text-xs mt-2 font-bold flex items-center gap-1 animate-fade-in">
                   <span>✅</span> Connected Successfully!
                </p>
            )}
            
            {groqStatus === 'error' && (
                <p className="text-red-500 text-xs mt-2 font-bold animate-shake">
                   ❌ Connection Failed: {groqErrorMsg}
                </p>
            )}
        </div>

        {/* AI Provider Switch */}
        <div className="mb-6">
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase mb-3">Active AI Provider</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gemini Option */}
                <div 
                    onClick={() => toggleAIProvider('gemini')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        aiProvider === 'gemini' 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${aiProvider === 'gemini' ? 'border-indigo-600' : 'border-slate-400'}`}>
                            {aiProvider === 'gemini' && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                        </div>
                        <span className="font-bold dark:text-white">Google Gemini</span>
                    </div>
                    <p className="text-xs text-slate-500">Standard speed, high reliability. Good for images & search.</p>
                </div>

                {/* Groq Option */}
                <div 
                    onClick={() => toggleAIProvider('groq')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        aiProvider === 'groq' 
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${aiProvider === 'groq' ? 'border-orange-600' : 'border-slate-400'}`}>
                            {aiProvider === 'groq' && <div className="w-2 h-2 rounded-full bg-orange-600"></div>}
                        </div>
                        <span className="font-bold dark:text-white">Groq AI</span>
                    </div>
                    <p className="text-xs text-slate-500">Ultra-fast text generation. <strong>Requires verified API Key.</strong></p>
                </div>
            </div>
        </div>
    </div>
  );

  const renderUpload = () => (
      <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Upload Resource</h2>
                  <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                     <button type="button" onClick={() => setUploadType('Question')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${uploadType === 'Question' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}>Question</button>
                     <button type="button" onClick={() => setUploadType('News')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${uploadType === 'News' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}>News</button>
                  </div>
               </div>

               {uploadType === 'Question' && !isReviewing && (
                 <div className="space-y-6">
                    {/* SYLLABUS UPLOAD SECTION (NEW) */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-dashed border-indigo-300 dark:border-indigo-700 text-center relative overflow-hidden">
                        <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mb-2">📚 Bulk Generate from Syllabus</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                            Upload an official syllabus or textbook page (PDF/Image). AI will generate 10 official questions strictly based on it.
                        </p>
                        
                        {!syllabusFile ? (
                            <div 
                                onClick={() => syllabusInputRef.current?.click()}
                                className="cursor-pointer bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:shadow-md transition-shadow inline-flex items-center gap-3"
                            >
                                <span className="text-2xl">📤</span>
                                <div className="text-left">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm block">Upload Syllabus File</span>
                                    <span className="text-[10px] text-slate-400">PDF or Image (Max 10MB)</span>
                                </div>
                                <input 
                                    type="file" 
                                    ref={syllabusInputRef} 
                                    accept="image/*,application/pdf" 
                                    className="hidden" 
                                    onChange={(e) => handleFileSelect(e, 'syllabus')} 
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    <span className="text-xl">📄</span>
                                    <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 truncate max-w-[200px]">{syllabusFile.name}</span>
                                    <button onClick={() => { setSyllabusFile(null); if(syllabusInputRef.current) syllabusInputRef.current.value=''; }} className="text-red-500 hover:bg-red-50 rounded-full p-1">✕</button>
                                </div>
                                <Button onClick={handleSyllabusGenerate} isLoading={isAnalyzing} className="shadow-lg shadow-indigo-200 dark:shadow-none">
                                    Generate 10 Questions
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">OR MANUAL ENTRY</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                    </div>

                    {/* Quick Smart Import */}
                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex justify-center gap-4">
                        <button type="button" onClick={() => setSmartMode('SmartPaste')} className={`px-4 py-2 rounded-lg font-bold text-sm ${smartMode === 'SmartPaste' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Paste Text</button>
                        <button type="button" onClick={() => setSmartMode('Image')} className={`px-4 py-2 rounded-lg font-bold text-sm ${smartMode === 'Image' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>Scan Image</button>
                    </div>

                    {smartMode === 'SmartPaste' && (
                       <div className="space-y-4">
                          <textarea value={smartInput} onChange={(e) => setSmartInput(e.target.value)} placeholder="Paste raw questions here..." className="w-full h-32 p-4 rounded-xl border text-sm dark:bg-slate-900 dark:text-white dark:border-slate-700" />
                          <Button type="button" onClick={() => handleSmartAnalyze('text', smartInput)} isLoading={isAnalyzing} className="w-full">Analyze & Extract</Button>
                       </div>
                    )}

                    {smartMode === 'Image' && (
                        <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-8 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer text-center" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'image')} accept="image/*" className="hidden" />
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div><span className="text-indigo-600 font-bold">Scanning...</span></div>
                            ) : (
                                <><span className="text-3xl block mb-2">📷</span><span className="font-bold text-indigo-700 dark:text-indigo-300">Click to Scan Question Image</span></>
                            )}
                        </div>
                    )}
                    
                    <div className="text-center">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsReviewing(true)}>Skip to Manual Form</Button>
                    </div>
                 </div>
               )}

               {(isReviewing || uploadType === 'News') && (
                   <form onSubmit={handleUploadSubmit} className="space-y-6 animate-slide-up">
                     
                     {uploadType === 'Question' && bulkQueue.length > 0 && (
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 mb-4 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                            <div>
                                <h3 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm uppercase tracking-wide">
                                    Reviewing {currentQueueIndex + 1} of {bulkQueue.length}
                                </h3>
                                <div className="w-full bg-indigo-200 h-1 mt-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full transition-all" style={{ width: `${((currentQueueIndex + 1) / bulkQueue.length) * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="secondary" size="sm" onClick={handleSkipQuestion}>Skip</Button>
                                <Button type="button" variant="danger" size="sm" onClick={handleResetForm}>Cancel All</Button>
                            </div>
                        </div>
                     )}

                     {uploadType === 'Question' && bulkQueue.length === 0 && (
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800 mb-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-green-800 dark:text-green-300">✅ Draft Ready</h3>
                                <p className="text-xs text-green-700 dark:text-green-400">Review details before saving.</p>
                            </div>
                            <Button type="button" variant="danger" size="sm" onClick={handleResetForm}>Discard</Button>
                        </div>
                     )}

                     {uploadType === 'Question' ? (
                       <>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select value={uploadExam} onChange={e => setUploadExam(e.target.value)} className="p-3 border rounded-xl dark:bg-slate-900 dark:text-white dark:border-slate-700">{Object.keys(examConfig).map(e => <option key={e} value={e}>{e}</option>)}</select>
                            <select value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="p-3 border rounded-xl dark:bg-slate-900 dark:text-white dark:border-slate-700"><option value="">Select Subject</option>{examConfig[uploadExam]?.map(s => <option key={s} value={s}>{s}</option>)}</select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Question</label>
                            <textarea value={qText} onChange={e => setQText(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:text-white dark:border-slate-700 h-24" required />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {qOptions.map((o, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input type="radio" name="correct" checked={qCorrect === i} onChange={() => setQCorrect(i)} className="w-5 h-5 text-indigo-600" />
                                    <input value={o} onChange={e => {const n = [...qOptions]; n[i] = e.target.value; setQOptions(n)}} placeholder={`Option ${i+1}`} className="flex-1 p-3 border rounded-xl dark:bg-slate-900 dark:text-white dark:border-slate-700" required />
                                </div>
                            ))}
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Explanation</label>
                            <textarea value={qExplanation} onChange={e => setQExplanation(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:text-white dark:border-slate-700 h-20" required />
                         </div>
                       </>
                     ) : (
                       <>
                         <input value={newsHeadline} onChange={e => setNewsHeadline(e.target.value)} placeholder="Headline" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:text-white" required />
                         <textarea value={newsSummary} onChange={e => setNewsSummary(e.target.value)} placeholder="Summary" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:text-white h-32" required />
                       </>
                     )}
                     
                     <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <Button type="submit" isLoading={isSubmitting} className="w-full text-lg font-bold shadow-xl">
                            {uploadType === 'Question' 
                                ? (bulkQueue.length > 0 ? 'Save & Next Question →' : 'Confirm & Upload Question') 
                                : 'Publish News'}
                        </Button>
                     </div>
                   </form>
               )}
             </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold">A</div>
          <h1 className="font-bold text-lg">Admin Control</h1>
        </div>
        <div className="flex gap-2 text-sm overflow-x-auto">
          {['dashboard', 'users', 'exams', 'questions', 'upload', 'payments', 'settings'].map((tab) => (
             <button type="button" key={tab} onClick={() => setActiveTab(tab as any)} className={`px-3 py-1 rounded-lg capitalize ${activeTab === tab ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>{tab}</button>
          ))}
          <div className="w-px bg-white/20 mx-2"></div>
          <button type="button" onClick={onBack} className="text-slate-400 hover:text-white">Exit</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'exams' && renderExams()}
        {activeTab === 'questions' && renderQuestions()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'upload' && renderUpload()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
};
