
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { ExamType, Question, QuestionSource, NewsItem, User, Transaction } from '../types';
import { EXAM_SUBJECTS, NEWS_CATEGORIES, MONTHS } from '../constants';
import { 
  getGlobalStats, saveAdminQuestion, getAdminQuestions, updateAdminQuestionStatus, 
  saveAdminNews, getAllUsers, removeUser, toggleUserPro, deleteGlobalQuestion,
  getTransactions, saveExamConfig, getExamConfig
} from '../services/storageService';
import { parseSmartInput } from '../services/geminiService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'exams' | 'upload' | 'questions' | 'payments'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  
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

  // Upload Tab State (Preserved)
  const [uploadType, setUploadType] = useState<'Question' | 'News'>('Question');
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [qText, setQText] = useState('');
  const [qTextHindi, setQTextHindi] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qOptionsHindi, setQOptionsHindi] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  
  const [smartInput, setSmartInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartMode, setSmartMode] = useState<'Manual' | 'SmartPaste' | 'Image'>('Manual');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newsHeadline, setNewsHeadline] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsCategory, setNewsCategory] = useState('National');
  const [newsDate, setNewsDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const s = await getGlobalStats();
    setStats(s);
    
    const u = await getAllUsers();
    setUsers(u);
    setFilteredUsers(u);
    
    const q = await getAdminQuestions();
    setQuestions(q);
    setFilteredQuestions(q);
    
    const t = await getTransactions();
    setTransactions(t);
    
    const e = await getExamConfig();
    setExamConfig(e);
    if (Object.keys(e).length > 0) setUploadExam(Object.keys(e)[0]);
  };

  // User Filter
  useEffect(() => {
    const lower = userSearch.toLowerCase();
    setFilteredUsers(users.filter(u => 
      u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower)
    ));
  }, [userSearch, users]);

  // Question Filter
  useEffect(() => {
    const lower = questionSearch.toLowerCase();
    setFilteredQuestions(questions.filter(q => 
      q.text.toLowerCase().includes(lower) || q.subject?.toLowerCase().includes(lower)
    ));
  }, [questionSearch, questions]);

  // Handlers for Users
  const handleTogglePro = async (id: string, current: boolean) => {
    await toggleUserPro(id, current);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isPro: !u.isPro } : u));
  };

  const handleDeleteUser = async (id: string) => {
    if(confirm("Are you sure? This will delete the user permanently.")) {
      await removeUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  // Handlers for Questions
  const handleDeleteQuestion = async (id: string) => {
    if(confirm("Delete this question?")) {
      await deleteGlobalQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  // Handlers for Exams
  const handleAddExam = async () => {
    if (!newExamName || !newExamSubjects) return;
    const subjects = newExamSubjects.split(',').map(s => s.trim());
    const newConfig = { ...examConfig, [newExamName]: subjects };
    await saveExamConfig(newConfig);
    setExamConfig(newConfig);
    setNewExamName('');
    setNewExamSubjects('');
    alert("Exam Added! Restart app to see changes in dropdowns.");
  };

  const handleDeleteExam = async (exam: string) => {
    if(confirm(`Delete ${exam}?`)) {
      const newConfig = { ...examConfig };
      delete newConfig[exam];
      await saveExamConfig(newConfig);
      setExamConfig(newConfig);
    }
  };

  // Smart Import Handlers (Preserved)
  const handleSmartAnalyze = async (inputType: 'text' | 'image', data: string) => {
    setIsAnalyzing(true);
    try {
        const result = await parseSmartInput(data, inputType, uploadExam);
        if (result) {
            setQText(result.text || '');
            setQTextHindi(result.text_hi || '');
            if (Array.isArray(result.options)) setQOptions(result.options.slice(0, 4));
            if (Array.isArray(result.options_hi)) setQOptionsHindi(result.options_hi.slice(0, 4));
            setQCorrect(result.correct_index || 0);
            setQExplanation(result.explanation || '');
            if (result.subject) setUploadSubject(result.subject);
            alert("Analysis Complete!");
        }
    } catch (e) { alert("Error analyzing."); }
    finally { setIsAnalyzing(false); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setImagePreview(URL.createObjectURL(file));
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1];
            handleSmartAnalyze('image', base64);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Logic similar to previous implementation...
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
    alert("Uploaded!");
    setQText(''); setIsSubmitting(false); handleRemoveImage();
  };

  // --- RENDER HELPERS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Total Users</h3>
                <p className="text-4xl font-extrabold text-slate-800 dark:text-white mt-2">{stats?.totalUsers || 0}</p>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-3/4"></div></div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Revenue (Mock)</h3>
                <p className="text-4xl font-extrabold text-green-600 dark:text-green-400 mt-2">₹{transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}</p>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-1/2"></div></div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Questions Bank</h3>
                <p className="text-4xl font-extrabold text-brand-purple mt-2">{questions.length}</p>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-brand-purple w-2/3"></div></div>
            </div>
        </div>

        {/* Traffic Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-80">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Traffic Overview</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                    { name: 'Mon', uv: 4000 }, { name: 'Tue', uv: 3000 }, { name: 'Wed', uv: 2000 },
                    { name: 'Thu', uv: 2780 }, { name: 'Fri', uv: 1890 }, { name: 'Sat', uv: 2390 }, { name: 'Sun', uv: 3490 }
                ]}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
  );

  const renderUsers = () => (
    <div className="animate-fade-in bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-lg dark:text-white">User Management</h3>
            <input 
                type="text" placeholder="Search users..." 
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white text-sm"
            />
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-bold text-slate-500">
                    <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-4 font-bold">{u.name}</td>
                            <td className="p-4">{u.email}</td>
                            <td className="p-4">
                                {u.isAdmin ? <span className="text-red-500 font-bold">Admin</span> : 
                                 u.isPro ? <span className="text-green-500 font-bold">Pro</span> : 'Free'}
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => handleTogglePro(u.id, !!u.isPro)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-200">
                                    {u.isPro ? 'Demote' : 'Make Pro'}
                                </button>
                                <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderExams = () => (
    <div className="animate-fade-in space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg dark:text-white mb-4">Add New Exam Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Exam Name (e.g. CAT)" value={newExamName} onChange={e => setNewExamName(e.target.value)} className="p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                <input type="text" placeholder="Subjects (comma separated)" value={newExamSubjects} onChange={e => setNewExamSubjects(e.target.value)} className="p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <Button onClick={handleAddExam} className="mt-4">Add Exam</Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 font-bold dark:text-white">Active Exams</div>
            <div className="p-4 space-y-2">
                {Object.keys(examConfig).map(exam => (
                    <div key={exam} className="flex justify-between items-center p-3 border rounded-lg dark:border-slate-700">
                        <div>
                            <span className="font-bold text-slate-800 dark:text-white block">{exam}</span>
                            <span className="text-xs text-slate-500">{examConfig[exam].join(', ')}</span>
                        </div>
                        <button onClick={() => handleDeleteExam(exam)} className="text-red-500 hover:text-red-700">🗑️</button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderPayments = () => (
    <div className="animate-fade-in bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg dark:text-white">Recent Transactions</h3>
        </div>
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-bold text-slate-500">
                <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 dark:text-slate-300">
                {transactions.map(t => (
                    <tr key={t.id}>
                        <td className="p-4 font-bold">{t.userName}</td>
                        <td className="p-4 uppercase">{t.planId}</td>
                        <td className="p-4">₹{t.amount}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span></td>
                        <td className="p-4">{new Date(t.date).toLocaleDateString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const renderQuestions = () => (
      <div className="animate-fade-in bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-lg dark:text-white">Question Bank ({questions.length})</h3>
            <input type="text" placeholder="Search..." value={questionSearch} onChange={e => setQuestionSearch(e.target.value)} className="p-2 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white text-sm" />
        </div>
        <div className="overflow-y-auto max-h-[600px]">
            {filteredQuestions.map(q => (
                <div key={q.id} className="p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex justify-between">
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{q.examType}</span>
                        <div className="space-x-2">
                            <span className="text-xs text-slate-400">{q.subject}</span>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">DELETE</button>
                        </div>
                    </div>
                    <p className="mt-2 font-medium text-slate-800 dark:text-white">{q.text}</p>
                    <p className="mt-1 text-xs text-green-600">Ans: {q.options[q.correctIndex]}</p>
                </div>
            ))}
        </div>
      </div>
  );

  const renderUpload = () => (
      <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Upload Resource</h2>
                  <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                     <button onClick={() => setUploadType('Question')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${uploadType === 'Question' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}>Question</button>
                     <button onClick={() => setUploadType('News')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${uploadType === 'News' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}>News</button>
                  </div>
               </div>

               {uploadType === 'Question' && (
                 <div className="mb-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center justify-between mb-3">
                       <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 uppercase flex items-center gap-2">✨ AI Smart Import</h3>
                       <div className="flex gap-2">
                          <button onClick={() => setSmartMode('SmartPaste')} className="text-xs px-3 py-1 bg-white rounded shadow-sm">Paste Text</button>
                          <button onClick={() => setSmartMode('Image')} className="text-xs px-3 py-1 bg-white rounded shadow-sm">Image</button>
                       </div>
                    </div>
                    {smartMode === 'SmartPaste' && (
                       <div className="space-y-2">
                          <textarea value={smartInput} onChange={(e) => setSmartInput(e.target.value)} placeholder="Paste raw question here..." className="w-full h-24 p-3 rounded-lg border text-sm" />
                          <Button size="sm" onClick={() => handleSmartAnalyze('text', smartInput)} isLoading={isAnalyzing} className="w-full">Analyze</Button>
                       </div>
                    )}
                    {smartMode === 'Image' && (
                        <div className="text-center">
                            {imagePreview ? (
                                <div className="relative"><img src={imagePreview} className="max-h-40 mx-auto" /><button onClick={handleRemoveImage} className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded">Remove</button></div>
                            ) : (
                                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" />
                            )}
                        </div>
                    )}
                 </div>
               )}

               <form onSubmit={handleUploadSubmit} className="space-y-4">
                 {uploadType === 'Question' ? (
                   <>
                     <div className="grid grid-cols-2 gap-4">
                        <select value={uploadExam} onChange={e => setUploadExam(e.target.value)} className="p-2 border rounded">{Object.keys(examConfig).map(e => <option key={e} value={e}>{e}</option>)}</select>
                        <select value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="p-2 border rounded"><option value="">Select Subject</option>{examConfig[uploadExam]?.map(s => <option key={s} value={s}>{s}</option>)}</select>
                     </div>
                     <textarea value={qText} onChange={e => setQText(e.target.value)} placeholder="Question Text" className="w-full p-2 border rounded h-20" required />
                     <div className="grid grid-cols-2 gap-2">{qOptions.map((o, i) => <input key={i} value={o} onChange={e => {const n = [...qOptions]; n[i] = e.target.value; setQOptions(n)}} placeholder={`Option ${i+1}`} className="p-2 border rounded" />)}</div>
                     <select value={qCorrect} onChange={e => setQCorrect(Number(e.target.value))} className="p-2 border rounded">{[0,1,2,3].map(i => <option key={i} value={i}>Correct: Option {i+1}</option>)}</select>
                   </>
                 ) : (
                   <>
                     <input value={newsHeadline} onChange={e => setNewsHeadline(e.target.value)} placeholder="Headline" className="w-full p-2 border rounded" required />
                     <textarea value={newsSummary} onChange={e => setNewsSummary(e.target.value)} placeholder="Summary" className="w-full p-2 border rounded h-24" required />
                   </>
                 )}
                 <Button type="submit" isLoading={isSubmitting} className="w-full">Upload</Button>
               </form>
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
          {['dashboard', 'users', 'exams', 'questions', 'upload', 'payments'].map((tab) => (
             <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`px-3 py-1 rounded-lg capitalize ${activeTab === tab ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
             >
                {tab}
             </button>
          ))}
          <div className="w-px bg-white/20 mx-2"></div>
          <button onClick={onBack} className="text-slate-400 hover:text-white">Exit</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'exams' && renderExams()}
        {activeTab === 'questions' && renderQuestions()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'upload' && renderUpload()}
      </div>
    </div>
  );
};
