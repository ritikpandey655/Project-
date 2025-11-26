
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { ExamType, Question, QuestionSource, NewsItem } from '../types';
import { EXAM_SUBJECTS, NEWS_CATEGORIES, MONTHS } from '../constants';
import { getGlobalStats, saveAdminQuestion, getAdminQuestions, updateAdminQuestionStatus, saveAdminNews } from '../services/storageService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'moderation'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [moderationQueue, setModerationQueue] = useState<Question[]>([]);
  const [uploadType, setUploadType] = useState<'Question' | 'News'>('Question');
  
  // Question Upload State
  const [uploadExam, setUploadExam] = useState<ExamType>(ExamType.UPSC);
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [qText, setQText] = useState('');
  const [qTextHindi, setQTextHindi] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qOptionsHindi, setQOptionsHindi] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  
  // News Upload State
  const [newsHeadline, setNewsHeadline] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsHeadlineHi, setNewsHeadlineHi] = useState('');
  const [newsSummaryHi, setNewsSummaryHi] = useState('');
  const [newsCategory, setNewsCategory] = useState('National');
  const [newsDate, setNewsDate] = useState(new Date().toISOString().split('T')[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStats(getGlobalStats());
    const stored = getAdminQuestions();
    let pending = stored.filter(q => q.moderationStatus === 'PENDING');
    setModerationQueue(pending);
  }, []);

  useEffect(() => {
    setUploadSubject(EXAM_SUBJECTS[uploadExam][0]);
  }, [uploadExam]);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (uploadType === 'Question') {
      const newQ: Question = {
        id: `official-${Date.now()}`,
        text: qText,
        textHindi: qTextHindi || undefined,
        options: qOptions,
        optionsHindi: qOptionsHindi.some(o => o.trim()) ? qOptionsHindi : undefined,
        correctIndex: qCorrect,
        explanation: qExplanation,
        source: QuestionSource.OFFICIAL,
        examType: uploadExam,
        subject: uploadSubject,
        createdAt: Date.now(),
        pyqYear: uploadYear,
        moderationStatus: 'APPROVED'
      };
      saveAdminQuestion(newQ);
      alert("Official Question Uploaded! AI will now prioritize this resource.");
      // Reset Q Form
      setQText('');
      setQTextHindi('');
      setQOptions(['', '', '', '']);
      setQOptionsHindi(['', '', '', '']);
      setQExplanation('');
    } else {
      const newNews: NewsItem = {
        id: `admin-news-${Date.now()}`,
        headline: newsHeadline,
        headlineHindi: newsHeadlineHi || undefined,
        summary: newsSummary,
        summaryHindi: newsSummaryHi || undefined,
        category: newsCategory,
        date: newsDate, // YYYY-MM-DD
        tags: ['Official', 'Admin Update'],
        isOfficial: true
      };
      saveAdminNews(newNews);
      alert("Current Affairs Item Uploaded! Users will see this in daily news.");
      // Reset News Form
      setNewsHeadline('');
      setNewsSummary('');
      setNewsHeadlineHi('');
      setNewsSummaryHi('');
    }

    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
  };

  const handleModeration = (id: string, status: 'APPROVED' | 'REJECTED') => {
    updateAdminQuestionStatus(id, status);
    setModerationQueue(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold">A</div>
          <div>
            <h1 className="font-bold text-lg leading-none">Admin Panel</h1>
            <span className="text-xs text-slate-400">Control Center</span>
          </div>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('upload')} className={`px-3 py-1 rounded-lg transition-colors ${activeTab === 'upload' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>Upload Resource</button>
          <button onClick={() => setActiveTab('moderation')} className={`px-3 py-1 rounded-lg transition-colors ${activeTab === 'moderation' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>AI Control</button>
          <div className="w-px bg-white/20 mx-2"></div>
          <button onClick={onBack} className="text-slate-400 hover:text-white">Exit</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* DASHBOARD TAB - Keep existing stats */}
        {activeTab === 'dashboard' && stats && (
          <div className="animate-fade-in space-y-6">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
               <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Admin Resource Strategy</h3>
               <p className="text-slate-600 dark:text-slate-300 text-sm">
                 Use the <strong>Upload Resource</strong> tab to add official Previous Year Questions (PYQs) and Current Affairs.
                 <br/>
                 <strong>Hybrid AI System:</strong> When a student requests questions or news, the AI will first check your uploaded resources. 
                 If enough approved content exists, it will serve that immediately (0 latency). AI only generates content to fill the gaps.
               </p>
             </div>
             {/* ... existing stats visuals ... */}
          </div>
        )}

        {/* UPLOAD TAB - REFACTORED */}
        {activeTab === 'upload' && (
           <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Upload Official Resource</h2>
                  <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                     <button 
                       onClick={() => setUploadType('Question')}
                       className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${uploadType === 'Question' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
                     >
                       Question / PYQ
                     </button>
                     <button 
                       onClick={() => setUploadType('News')}
                       className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${uploadType === 'News' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}
                     >
                       Current Affairs
                     </button>
                  </div>
               </div>

               <form onSubmit={handleUploadSubmit} className="space-y-6">
                 
                 {uploadType === 'Question' ? (
                   <>
                     {/* Exam & Subject Selectors */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Exam</label>
                          <select 
                            value={uploadExam}
                            onChange={e => setUploadExam(e.target.value as ExamType)}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white"
                          >
                            {Object.values(ExamType).map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                          <select 
                            value={uploadSubject}
                            onChange={e => setUploadSubject(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white"
                          >
                            {EXAM_SUBJECTS[uploadExam].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PYQ Year</label>
                          <input 
                            type="number"
                            value={uploadYear}
                            onChange={e => setUploadYear(parseInt(e.target.value))}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Question Text (English)</label>
                          <textarea value={qText} onChange={e => setQText(e.target.value)} required className="w-full p-3 rounded-lg border h-24 dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Question Text (Hindi)</label>
                          <textarea value={qTextHindi} onChange={e => setQTextHindi(e.target.value)} placeholder="Optional" className="w-full p-3 rounded-lg border h-24 dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                     </div>

                     <div className="space-y-3">
                       <label className="block text-xs font-bold text-slate-500 uppercase">Options (Select Correct)</label>
                       {qOptions.map((opt, idx) => (
                         <div key={idx} className="flex gap-3 items-center">
                            <input type="radio" name="correct" checked={qCorrect === idx} onChange={() => setQCorrect(idx)} className="w-5 h-5 text-indigo-600" />
                            <input 
                              type="text" value={opt} onChange={e => { const newOpts = [...qOptions]; newOpts[idx] = e.target.value; setQOptions(newOpts); }}
                              placeholder={`Option ${idx + 1} (Eng)`}
                              className="flex-1 p-2 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white" required
                            />
                            <input 
                              type="text" value={qOptionsHindi[idx]} onChange={e => { const newOpts = [...qOptionsHindi]; newOpts[idx] = e.target.value; setQOptionsHindi(newOpts); }}
                              placeholder={`(Hindi)`}
                              className="flex-1 p-2 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                            />
                         </div>
                       ))}
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Explanation</label>
                        <textarea value={qExplanation} onChange={e => setQExplanation(e.target.value)} className="w-full p-3 rounded-lg border h-20 dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Explain why the answer is correct..." />
                     </div>
                   </>
                 ) : (
                   <>
                     {/* News / Current Affairs Form */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                           <select 
                             value={newsCategory} onChange={e => setNewsCategory(e.target.value)}
                             className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white"
                           >
                             {NEWS_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date of Event</label>
                           <input type="date" value={newsDate} onChange={e => setNewsDate(e.target.value)} className="w-full p-2.5 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Headline (English)</label>
                          <input type="text" value={newsHeadline} onChange={e => setNewsHeadline(e.target.value)} required className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Headline (Hindi)</label>
                          <input type="text" value={newsHeadlineHi} onChange={e => setNewsHeadlineHi(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Summary (English)</label>
                          <textarea value={newsSummary} onChange={e => setNewsSummary(e.target.value)} required className="w-full p-3 rounded-lg border h-32 dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Summary (Hindi)</label>
                          <textarea value={newsSummaryHi} onChange={e => setNewsSummaryHi(e.target.value)} className="w-full p-3 rounded-lg border h-32 dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                        </div>
                     </div>
                   </>
                 )}

                 <Button type="submit" isLoading={isSubmitting} className="w-full shadow-xl">
                    Upload to {uploadType === 'Question' ? 'Question' : 'News'} Bank
                 </Button>

               </form>
             </div>
           </div>
        )}

        {/* MODERATION TAB */}
        {activeTab === 'moderation' && (
           <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white">AI Content Moderation</h2>
               <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold">
                 {moderationQueue.length} Pending
               </div>
             </div>
             {/* ... existing moderation content ... */}
             {moderationQueue.length === 0 ? (
               <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                 <p className="text-slate-500">All caught up! No questions pending approval.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {moderationQueue.map(q => (
                   <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="font-bold text-slate-800 dark:text-white text-lg mb-4">{q.text}</p>
                      <div className="flex gap-3 justify-end">
                         <Button variant="danger" size="sm" onClick={() => handleModeration(q.id, 'REJECTED')}>Reject</Button>
                         <Button size="sm" onClick={() => handleModeration(q.id, 'APPROVED')}>Approve & Publish</Button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}

      </div>
    </div>
  );
};
