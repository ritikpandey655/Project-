
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
  const [smartMode, setSmartMode] = useState<'Manual' | 'SmartPaste' | 'Image'>('Manual');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk Upload Queue
  const [bulkQueue, setBulkQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  
  const [newsHeadline, setNewsHeadline] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsCategory, setNewsCategory] = useState('National');
  const [newsDate, setNewsDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load Data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
        // Fetch users first
        const u = await getAllUsers();
        // Fallback for visual testing if API returns empty due to permissions
        const displayUsers = u.length > 0 ? u : []; 
        
        setUsers(displayUsers); 
        setFilteredUsers(displayUsers);
        
        // Fetch stats
        const s = await getGlobalStats();
        setStats(s);
        
        const q = await getAdminQuestions();
        setQuestions(q); setFilteredQuestions(q);
        
        const t = await getTransactions();
        setTransactions(t);
        
        const e = await getExamConfig();
        setExamConfig(e);
        if (Object.keys(e).length > 0) setUploadExam(Object.keys(e)[0]);
    } catch (e) {
        console.error("Failed to load admin data", e);
    } finally {
        setIsLoading(false);
    }
  };

  // Filter Effects
  useEffect(() => {
    const lower = userSearch.toLowerCase();
    setFilteredUsers(users.filter(u => 
      (u.name || '').toLowerCase().includes(lower) || 
      (u.email || '').toLowerCase().includes(lower)
    ));
  }, [userSearch, users]);

  useEffect(() => {
    const lower = questionSearch.toLowerCase();
    setFilteredQuestions(questions.filter(q => q.text.toLowerCase().includes(lower) || q.subject?.toLowerCase().includes(lower)));
  }, [questionSearch, questions]);

  // Actions
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

  // --- SMART IMPORT LOGIC ---

  const populateFormWithData = (data: any) => {
    setQText(data.text || '');
    setQTextHindi(data.text_hi || '');
    if (Array.isArray(data.options)) setQOptions(data.options.slice(0, 4));
    if (Array.isArray(data.options_hi)) setQOptionsHindi(data.options_hi.slice(0, 4));
    setQCorrect(data.correct_index || 0);
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

  const handleResetForm = () => {
    setQText(''); setQTextHindi('');
    setQOptions(['', '', '', '']); setQOptionsHindi(['', '', '', '']);
    setQCorrect(0); setQExplanation('');
    setSmartInput('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        
        // Handle Bulk Queue
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

  // --- RENDER SECTIONS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={loadAllData} isLoading={isLoading}>
               {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Total Users</h3>
                <p className="text-4xl font-extrabold text-slate-800 dark:text-white mt-2">{users.length}</p>
                <p className="text-xs text-slate-400 mt-1">Registered Accounts</p>
            </div>
            {/* Active Users Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Active Today</h3>
                <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{stats?.activeUsers || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Online Recently</p>
                <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Questions</h3>
                <p className="text-4xl font-extrabold text-brand-purple mt-2">{questions.length}</p>
                <p className="text-xs text-slate-400 mt-1">Global Bank</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 text-sm font-bold uppercase">Transactions</h3>
                <p className="text-4xl font-extrabold text-green-600 dark:text-green-400 mt-2">{transactions.length}</p>
                <p className="text-xs text-slate-400 mt-1">Total Orders</p>
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
                 <div className="mb-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/50 text-center">
                    <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mb-4">✨ AI Smart Import</h3>
                    <div className="flex justify-center gap-4 mb-4">
                        <button type="button" onClick={() => setSmartMode('SmartPaste')} className={`px-4 py-2 rounded-lg font-bold ${smartMode === 'SmartPaste' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>Paste Text</button>
                        <button type="button" onClick={() => setSmartMode('Image')} className={`px-4 py-2 rounded-lg font-bold ${smartMode === 'Image' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>Upload Image</button>
                    </div>

                    {smartMode === 'SmartPaste' && (
                       <div className="space-y-4">
                          <textarea value={smartInput} onChange={(e) => setSmartInput(e.target.value)} placeholder="Paste raw questions here..." className="w-full h-32 p-4 rounded-xl border text-sm dark:bg-slate-900 dark:text-white" />
                          <Button type="button" onClick={() => handleSmartAnalyze('text', smartInput)} isLoading={isAnalyzing} className="w-full">Analyze & Extract</Button>
                       </div>
                    )}

                    {smartMode === 'Image' && (
                        <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl p-8 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div><span className="text-indigo-600 font-bold">Scanning...</span></div>
                            ) : (
                                <><span className="text-3xl block mb-2">📷</span><span className="font-bold text-indigo-700 dark:text-indigo-300">Click to Upload Image</span></>
                            )}
                        </div>
                    )}
                    <div className="mt-4 text-xs text-slate-400">Or skip this and fill the form manually below ↓</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsReviewing(true)} className="mt-2">Skip to Manual Entry</Button>
                 </div>
               )}

               {/* REVIEW & EDIT FORM */}
               {(isReviewing || uploadType === 'News') && (
                   <form onSubmit={handleUploadSubmit} className="space-y-6 animate-slide-up">
                     
                     {/* BULK QUEUE NAVIGATION UI */}
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

  const renderUsers = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-slide-up">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">User Management</h3>
        <input type="text" placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full p-2 mb-4 border rounded dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {isLoading ? (
                       <tr>
                          <td colSpan={3} className="p-8 text-center">
                             <div className="flex justify-center items-center gap-2 text-slate-500">
                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                Loading users...
                             </div>
                          </td>
                       </tr>
                    ) : filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                <span className="text-2xl block mb-2">🔍</span>
                                {users.length === 0 ? "No users found in database." : "No matches found."}
                            </td>
                        </tr>
                    ) : (
                        filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="p-3 font-bold text-slate-800 dark:text-white">{u.name || 'User'}</td>
                                <td className="p-3 text-slate-600 dark:text-slate-300">{u.email || 'No Email'}</td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => handleTogglePro(u.id, !!u.isPro)} className={`text-xs font-bold px-3 py-1 rounded-full ${u.isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                       {u.isPro ? 'Pro User' : 'Free User'}
                                    </button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">🗑️</button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold">A</div>
          <h1 className="font-bold text-lg">Admin Control</h1>
        </div>
        <div className="flex gap-2 text-sm overflow-x-auto">
          {['dashboard', 'users', 'exams', 'questions', 'upload', 'payments'].map((tab) => (
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
      </div>
    </div>
  );
};
