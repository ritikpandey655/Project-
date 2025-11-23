
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { ExamType, Question, QuestionSource } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { getGlobalStats, saveAdminQuestion, getAdminQuestions, updateAdminQuestionStatus } from '../services/storageService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'moderation'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [moderationQueue, setModerationQueue] = useState<Question[]>([]);
  
  // Upload State
  const [uploadExam, setUploadExam] = useState<ExamType>(ExamType.UPSC);
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load Stats
    setStats(getGlobalStats());
    // Load Moderation Queue (Mocking fetching AI questions)
    // In a real app, this would fetch from DB. Here we fetch from our local 'Admin Question Bank' 
    // AND mock some pending AI questions if empty for demo purposes.
    const stored = getAdminQuestions();
    let pending = stored.filter(q => q.moderationStatus === 'PENDING');
    
    if (pending.length === 0) {
      // Create some fake pending AI questions for the demo
      const mockPending: Question[] = [
        {
          id: 'ai-mod-1',
          text: 'Which AI model was released by Google in 2024?',
          options: ['Gemini 1.5', 'GPT-4', 'Llama 3', 'Claude 3'],
          correctIndex: 0,
          explanation: 'Gemini 1.5 was released by Google featuring a 1M token context window.',
          source: QuestionSource.PYQ_AI,
          examType: ExamType.UPSC,
          subject: 'Science & Tech',
          createdAt: Date.now(),
          moderationStatus: 'PENDING'
        },
        {
          id: 'ai-mod-2',
          text: 'What is the capital of France?',
          options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
          correctIndex: 2,
          explanation: 'Paris is the capital.',
          source: QuestionSource.PYQ_AI,
          examType: ExamType.SSC_CGL,
          subject: 'General Knowledge',
          createdAt: Date.now(),
          moderationStatus: 'PENDING'
        }
      ];
      // Save them so we can interact
      mockPending.forEach(q => saveAdminQuestion(q));
      pending = mockPending;
    }
    setModerationQueue(pending);
  }, []);

  useEffect(() => {
    setUploadSubject(EXAM_SUBJECTS[uploadExam][0]);
  }, [uploadExam]);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
      pyqYear: uploadYear,
      moderationStatus: 'APPROVED'
    };

    setTimeout(() => {
      saveAdminQuestion(newQ);
      setIsSubmitting(false);
      alert("Question Uploaded Successfully!");
      // Reset
      setQText('');
      setQOptions(['', '', '', '']);
      setQExplanation('');
    }, 800);
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
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-3 py-1 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button 
             onClick={() => setActiveTab('upload')} 
             className={`px-3 py-1 rounded-lg transition-colors ${activeTab === 'upload' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Upload PYQ
          </button>
          <button 
             onClick={() => setActiveTab('moderation')} 
             className={`px-3 py-1 rounded-lg transition-colors ${activeTab === 'moderation' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            AI Control {moderationQueue.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{moderationQueue.length}</span>}
          </button>
          <div className="w-px bg-white/20 mx-2"></div>
          <button onClick={onBack} className="text-slate-400 hover:text-white">Exit</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && stats && (
          <div className="animate-fade-in space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 text-xs font-bold uppercase">Total Users</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.totalUsers.toLocaleString()}</h3>
                <span className="text-green-500 text-xs font-bold">↑ 12% this week</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 text-xs font-bold uppercase">Active Exams</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.activeExams}</h3>
                <span className="text-indigo-500 text-xs font-bold">All Categories Live</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 text-xs font-bold uppercase">Question Bank</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.totalQuestions.toLocaleString()}</h3>
                <span className="text-slate-400 text-xs">AI + Manual</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 text-xs font-bold uppercase">Total Revenue</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">₹{(stats.revenue / 1000).toFixed(1)}k</h3>
                <span className="text-green-500 text-xs font-bold">↑ 8% vs last month</span>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Traffic Overview (Weekly)</h3>
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={stats.trafficData}>
                       <defs>
                         <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                           <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                       <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                       <Area type="monotone" dataKey="visits" stroke="#8884d8" fillOpacity={1} fill="url(#colorVisits)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
               </div>

               <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Revenue Growth (Monthly)</h3>
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={stats.revenueData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                       <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                       <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
           <div className="max-w-3xl mx-auto animate-fade-in">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Upload Official PYQ</h2>
               <form onSubmit={handleUploadSubmit} className="space-y-6">
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exam</label>
                      <select 
                        value={uploadExam}
                        onChange={e => setUploadExam(e.target.value as ExamType)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white"
                      >
                        {Object.values(ExamType).map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                      <select 
                        value={uploadSubject}
                        onChange={e => setUploadSubject(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white"
                      >
                        {EXAM_SUBJECTS[uploadExam].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Year</label>
                      <input 
                        type="number"
                        value={uploadYear}
                        onChange={e => setUploadYear(parseInt(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Question Text</label>
                    <textarea 
                      value={qText}
                      onChange={e => setQText(e.target.value)}
                      required
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white h-24"
                    />
                 </div>

                 <div className="space-y-3">
                   <label className="block text-xs font-bold text-slate-500 uppercase">Options (Select Correct)</label>
                   {qOptions.map((opt, idx) => (
                     <div key={idx} className="flex gap-3 items-center">
                        <input 
                          type="radio" 
                          name="correct" 
                          checked={qCorrect === idx} 
                          onChange={() => setQCorrect(idx)}
                          className="w-5 h-5 text-indigo-600"
                        />
                        <input 
                          type="text" 
                          value={opt}
                          onChange={e => {
                             const newOpts = [...qOptions];
                             newOpts[idx] = e.target.value;
                             setQOptions(newOpts);
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white"
                          required
                        />
                     </div>
                   ))}
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Explanation</label>
                    <textarea 
                      value={qExplanation}
                      onChange={e => setQExplanation(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white h-20"
                    />
                 </div>

                 <Button type="submit" isLoading={isSubmitting} className="w-full">Upload to Global Bank</Button>

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

             {moderationQueue.length === 0 ? (
               <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                 <p className="text-slate-500">All caught up! No questions pending approval.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {moderationQueue.map(q => (
                   <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex gap-2">
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase">{q.examType}</span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase">{q.subject}</span>
                         </div>
                         <span className="text-xs text-slate-400">AI Generated</span>
                      </div>
                      
                      <p className="font-bold text-slate-800 dark:text-white text-lg mb-4">{q.text}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {q.options.map((opt, idx) => (
                          <div key={idx} className={`p-2 rounded border text-sm ${idx === q.correctIndex ? 'bg-green-50 border-green-300 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 mb-4 text-sm text-slate-600 dark:text-slate-400">
                         <strong>Explanation:</strong> {q.explanation}
                      </div>

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
