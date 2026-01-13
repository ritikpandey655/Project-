
import React, { useState, useEffect } from 'react';
import { User, SystemLog, ExamType, Question, QuestionSource } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { 
  getAllUsers, removeUser, toggleUserPro,
  getSystemLogs, clearSystemLogs, saveSystemConfig, getSystemConfig,
  saveApiKeys, getApiKeys, saveGlobalQuestion, saveGlobalQuestionsBulk
} from '../services/storageService';
import { checkAIConnectivity, generateWithAI, analyzeImageForQuestion, extractQuestionsFromPaper } from '../services/geminiService';
import { Button } from './Button';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'upload' | 'keys' | 'users' | 'logs'>('status');
  const [diagnostics, setDiagnostics] = useState<any>({ status: 'Connecting...', latency: 0, secure: false });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<{ aiProvider: 'gemini' | 'groq', modelName?: string }>({ aiProvider: 'gemini' });
  const [apiKeys, setApiKeys] = useState({ gemini: '', groq: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // Upload State
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState<string>('General');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedQuestion, setExtractedQuestion] = useState<Partial<Question> | null>(null);
  
  // Bulk Upload State
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [bulkQuestions, setBulkQuestions] = useState<Partial<Question>[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
    const storedKeys = getApiKeys();
    setApiKeys(storedKeys);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [u, l, c, d] = await Promise.all([
        getAllUsers(), 
        getSystemLogs(), 
        getSystemConfig(),
        checkAIConnectivity()
    ]);
    setUsers(u);
    setLogs(l);
    if(c.aiProvider) setConfig(c);
    setDiagnostics(d);
    setIsLoading(false);
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    await saveSystemConfig(config);
    saveApiKeys(apiKeys);
    alert(`System Updated: Provider set to ${config.aiProvider.toUpperCase()}`);
    setIsLoading(false);
    loadData(); 
  };

  const runLatencyTest = async () => {
    setTestResult('Running test...');
    const start = Date.now();
    try {
        await generateWithAI("Test OK", false, 0.7); 
        const duration = Date.now() - start;
        setTestResult(`✅ Response received in ${duration}ms via ${config.aiProvider}`);
        loadData(); 
    } catch (e: any) {
        setTestResult(`❌ Failed: ${e.message}`);
    }
  };

  // --- UPLOAD LOGIC ---
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      
      // Reset logic
      setExtractedQuestion(null);
      setBulkQuestions([]);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile || !previewUrl) return;
    setIsProcessing(true);
    try {
        // Strip prefix for API
        const base64 = previewUrl.split(',')[1];
        const mimeType = selectedFile.type;
        
        if (uploadMode === 'single') {
            const result = await analyzeImageForQuestion(base64, mimeType, uploadExam, uploadSubject);
            if (result) {
                setExtractedQuestion({
                    text: result.text,
                    options: result.options,
                    correctIndex: result.correctIndex,
                    explanation: result.explanation,
                    examType: uploadExam,
                    subject: uploadSubject
                });
            }
        } else {
            // Bulk / Full Paper Mode
            // Get valid subjects for this exam to pass to AI for classification
            const validSubjects = EXAM_SUBJECTS[uploadExam as ExamType] || [];
            
            const results = await extractQuestionsFromPaper(base64, mimeType, uploadExam, validSubjects);
            if (results && results.length > 0) {
                const mappedQs = results.map((q: any) => ({
                    text: q.text,
                    options: q.options,
                    correctIndex: q.correctIndex,
                    explanation: q.explanation,
                    examType: uploadExam,
                    subject: q.subject || 'General', // AI auto-classified subject
                    source: QuestionSource.MANUAL,
                    isHandwritten: true
                }));
                setBulkQuestions(mappedQs);
            } else {
                alert("AI couldn't find distinct questions. Try 'Single Question' mode.");
            }
        }
        
    } catch (e: any) {
        alert("Extraction Failed: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveQuestion = async () => {
    setIsProcessing(true);
    try {
        if (uploadMode === 'single' && extractedQuestion) {
            const finalQuestion: Question = {
                id: `manual-${Date.now()}`,
                text: extractedQuestion.text || '',
                options: extractedQuestion.options || [],
                correctIndex: extractedQuestion.correctIndex || 0,
                explanation: extractedQuestion.explanation || '',
                examType: uploadExam,
                subject: uploadSubject,
                source: QuestionSource.MANUAL,
                isHandwritten: true,
                createdAt: Date.now(),
                moderationStatus: 'APPROVED'
            };
            await saveGlobalQuestion(finalQuestion);
            alert("Question Saved!");
        } else if (uploadMode === 'bulk' && bulkQuestions.length > 0) {
            const finalQuestions: Question[] = bulkQuestions.map((q, idx) => ({
                id: `manual-bulk-${Date.now()}-${idx}`,
                text: q.text || '',
                options: q.options || [],
                correctIndex: q.correctIndex || 0,
                explanation: q.explanation || '',
                examType: uploadExam,
                subject: q.subject || 'General', // Use the specific subject
                source: QuestionSource.MANUAL,
                isHandwritten: true,
                createdAt: Date.now(),
                moderationStatus: 'APPROVED'
            }));
            await saveGlobalQuestionsBulk(finalQuestions);
            alert(`${finalQuestions.length} Questions Saved Successfully!`);
        }
        
        // Reset
        setSelectedFile(null);
        setPreviewUrl(null);
        setExtractedQuestion(null);
        setBulkQuestions([]);
        
    } catch (e) {
        alert("Save Failed");
    } finally {
        setIsProcessing(false);
    }
  };

  // Helper colors
  const getLatencyColor = (ms: number) => {
      if (ms === 0) return 'text-slate-500';
      if (ms < 800) return 'text-brand-green'; 
      if (ms < 2000) return 'text-yellow-400';
      return 'text-red-400';
  };

  const isSecureServer = diagnostics.secure;
  const isServerReachable = diagnostics.status !== 'Disconnected';
  const hasClientKeys = !!(apiKeys.gemini || apiKeys.groq);
  
  let statusColor = 'text-red-400';
  let statusText = 'Disconnected';
  let statusDesc = 'Run: npm run server';
  let cardBorder = 'bg-red-500/10 border-red-500/30';

  if (isSecureServer) {
      statusColor = 'text-green-400';
      statusText = 'Online (Server)';
      statusDesc = 'Backend Active & Secured';
      cardBorder = 'bg-green-500/10 border-green-500/30';
  } else if (isServerReachable && !isSecureServer) {
      statusColor = 'text-orange-400';
      statusText = 'Server No Keys';
      statusDesc = 'Backend connected but keys missing in .env';
      cardBorder = 'bg-orange-500/10 border-orange-500/30';
  } else if (hasClientKeys) {
      statusColor = 'text-yellow-400';
      statusText = 'Online (Client)';
      statusDesc = 'Using Manual Browser Keys (Fallback)';
      cardBorder = 'bg-yellow-500/10 border-yellow-500/30';
  }

  const availableSubjects = EXAM_SUBJECTS[uploadExam as ExamType] || [];

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0814] text-white font-sans overflow-hidden flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-[#121026] border-b border-white/5 p-4 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-black shadow-[0_0_15px_var(--brand-primary)]">A</div>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight leading-none">PYQverse <span className="text-brand-400">ADMIN</span></h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest mt-0.5">System Control Center</p>
          </div>
        </div>
        <div className="flex gap-3">
            <button onClick={loadData} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5" title="Refresh">🔄</button>
            <button onClick={onBack} className="px-6 py-2 bg-red-600 hover:bg-red-700 font-black rounded-xl text-xs transition-colors">EXIT</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#121026]/50 border-b border-white/5 p-1 gap-1">
        {[
            {id: 'status', label: 'Dashboard'},
            {id: 'upload', label: 'Upload Manual'},
            {id: 'keys', label: 'Keys & Security'}, 
            {id: 'users', label: 'User Base'}, 
            {id: 'logs', label: 'Event Logs'}
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {activeTab === 'status' && (
          <div className="max-w-5xl mx-auto space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Connectivity Card */}
                 <div className={`p-8 rounded-[32px] border-2 transition-all ${cardBorder}`}>
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Connectivity</h3>
                    <p className={`text-3xl font-black ${statusColor}`}>
                        {statusText}
                    </p>
                    <p className="text-[10px] mt-2 text-slate-500 font-medium">
                        {statusDesc}
                    </p>
                 </div>
                 
                 <div className="p-8 rounded-[32px] bg-slate-800/30 border border-white/10">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Active Provider</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-brand-400">
                            {config.aiProvider === 'groq' ? 'GROQ CLOUD' : 'GOOGLE GEMINI'}
                        </span>
                    </div>
                    <p className="text-[10px] mt-2 text-slate-500 font-medium">Model: {config.modelName || 'Default'}</p>
                 </div>

                 <div className="p-8 rounded-[32px] bg-slate-800/30 border border-white/10 relative overflow-hidden">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Latency Check</h3>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-4xl font-black ${getLatencyColor(diagnostics.latency)}`}>
                            {diagnostics.latency}
                        </p>
                        <span className="text-sm font-bold text-slate-500">ms</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={runLatencyTest} className="text-[10px] font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/5">
                            PING SERVER
                        </button>
                    </div>
                    <div className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${diagnostics.latency > 0 && diagnostics.latency < 500 ? 'w-full bg-green-500' : diagnostics.latency > 2000 ? 'w-full bg-red-500' : 'w-1/2 bg-yellow-500'}`}></div>
                 </div>
             </div>

             {testResult && (
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center font-mono text-xs text-brand-300">
                     {testResult}
                 </div>
             )}
          </div>
        )}

        {/* Upload Tab - UPDATED */}
        {activeTab === 'upload' && (
            <div className="max-w-3xl mx-auto">
                <div className="bg-[#121026] p-8 rounded-[32px] border border-white/5 shadow-2xl space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black mb-1">Digitize Handwritten Questions</h2>
                            <p className="text-sm text-slate-500">Upload handwritten notes, PDFs or paper images.</p>
                        </div>
                        
                        {/* Mode Toggle */}
                        <div className="flex bg-white/5 rounded-xl p-1">
                            <button 
                                onClick={() => setUploadMode('single')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'single' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Single Question
                            </button>
                            <button 
                                onClick={() => setUploadMode('bulk')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'bulk' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Full Paper (Bulk)
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exam</label>
                            <select 
                                value={uploadExam} 
                                onChange={e => setUploadExam(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none"
                            >
                                {Object.keys(EXAM_SUBJECTS).map(e => <option key={e} value={e} className="text-black">{e}</option>)}
                            </select>
                        </div>
                        {/* Hide Subject selection in Bulk Mode as it is auto-detected */}
                        {uploadMode === 'single' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                                <select 
                                    value={uploadSubject} 
                                    onChange={e => setUploadSubject(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none"
                                >
                                    {availableSubjects.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                                </select>
                            </div>
                        )}
                        {uploadMode === 'bulk' && (
                            <div className="flex flex-col justify-center">
                                <p className="text-xs text-brand-400 font-bold bg-brand-500/10 p-2 rounded-lg border border-brand-500/20">
                                    ✨ Auto-Subject Classification Active
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-brand-500/50 transition-colors">
                        <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            onChange={handleFileSelect}
                            className="hidden" 
                            id="fileUpload"
                        />
                        <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center">
                            <span className="text-4xl mb-2">📸</span>
                            <span className="font-bold text-brand-400">Click to Upload Image / PDF</span>
                            <span className="text-xs text-slate-500 mt-2">Max 50MB (Automatically deleted after processing)</span>
                        </label>
                    </div>

                    {previewUrl && (
                        <div className="animate-fade-in space-y-6">
                            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                                <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                            </div>
                            
                            <Button onClick={handleExtract} isLoading={isProcessing} className="w-full">
                                {isProcessing ? 'AI Processing...' : `✨ Extract ${uploadMode === 'bulk' ? 'All Questions' : 'Question'}`}
                            </Button>
                        </div>
                    )}

                    {/* Single Question Editor */}
                    {uploadMode === 'single' && extractedQuestion && (
                        <div className="bg-white/5 p-6 rounded-2xl border border-brand-500/30 space-y-4 animate-slide-up">
                            <h3 className="font-black text-brand-400 uppercase tracking-widest text-xs">AI Extraction Result</h3>
                            
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Question Text</label>
                                <textarea 
                                    value={extractedQuestion.text} 
                                    onChange={e => setExtractedQuestion({...extractedQuestion, text: e.target.value})}
                                    className="w-full p-3 bg-black/20 rounded-xl text-sm border border-white/10 h-24"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {extractedQuestion.options?.map((opt, i) => (
                                    <input 
                                        key={i}
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...(extractedQuestion.options || [])];
                                            newOpts[i] = e.target.value;
                                            setExtractedQuestion({...extractedQuestion, options: newOpts});
                                        }}
                                        className={`w-full p-2 rounded-lg text-sm bg-black/20 border ${extractedQuestion.correctIndex === i ? 'border-green-500' : 'border-white/10'}`}
                                    />
                                ))}
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Explanation</label>
                                <textarea 
                                    value={extractedQuestion.explanation}
                                    onChange={e => setExtractedQuestion({...extractedQuestion, explanation: e.target.value})}
                                    className="w-full p-3 bg-black/20 rounded-xl text-sm border border-white/10 h-20"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="secondary" onClick={() => setExtractedQuestion(null)} className="flex-1">Discard</Button>
                                <Button onClick={handleSaveQuestion} isLoading={isProcessing} className="flex-1 bg-green-600 hover:bg-green-500">
                                    💾 Save to Database
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Bulk Questions Editor (Preview List) */}
                    {uploadMode === 'bulk' && bulkQuestions.length > 0 && (
                        <div className="bg-white/5 p-6 rounded-2xl border border-brand-500/30 space-y-4 animate-slide-up">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black text-brand-400 uppercase tracking-widest text-xs">
                                    Found {bulkQuestions.length} Questions
                                </h3>
                                <Button onClick={handleSaveQuestion} isLoading={isProcessing} size="sm" className="bg-green-600 hover:bg-green-500">
                                    💾 Save All ({bulkQuestions.length})
                                </Button>
                            </div>

                            <div className="max-h-96 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                                {bulkQuestions.map((q, idx) => (
                                    <div key={idx} className="p-4 bg-black/30 rounded-xl border border-white/5 hover:border-brand-500/30 transition-colors">
                                        {/* Subject Selector Header */}
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-500">Q{idx+1}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400">Subject:</span>
                                                <select 
                                                    value={q.subject || 'General'} 
                                                    onChange={(e) => {
                                                        const newBulk = [...bulkQuestions];
                                                        newBulk[idx].subject = e.target.value;
                                                        setBulkQuestions(newBulk);
                                                    }}
                                                    className="bg-white/10 border border-white/10 text-xs rounded-lg px-2 py-1 outline-none focus:border-brand-500 text-white"
                                                >
                                                    {availableSubjects.map(s => (
                                                        <option key={s} value={s} className="text-black">{s}</option>
                                                    ))}
                                                    <option value="General" className="text-black">General</option>
                                                </select>
                                                <button 
                                                    onClick={() => {
                                                        const newBulk = bulkQuestions.filter((_, i) => i !== idx);
                                                        setBulkQuestions(newBulk);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 ml-2"
                                                    title="Delete Question"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-sm font-bold mb-2 text-white/90">{q.text}</p>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            {q.options?.map((o, i) => (
                                                <div key={i} className={`text-xs px-2 py-1 rounded bg-white/5 ${i === q.correctIndex ? 'text-green-400 border border-green-500/30' : 'text-slate-400'}`}>
                                                    {o}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <Button variant="secondary" onClick={() => setBulkQuestions([])} className="w-full">Discard All</Button>
                        </div>
                    )}

                </div>
            </div>
        )}

        {/* Existing Tabs */}
        {activeTab === 'keys' && (
          <div className="max-w-2xl mx-auto space-y-8">
             <div className="bg-[#121026] p-8 rounded-[32px] border border-white/5 shadow-2xl">
                 <h2 className="text-2xl font-black mb-1">Provider Config</h2>
                 <p className="text-sm text-slate-500 mb-8">Switch between AI models instantly.</p>
                 <div className="space-y-6">
                    <div>
                       <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">Select Engine</label>
                       <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setConfig({ ...config, aiProvider: 'gemini' })}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${config.aiProvider === 'gemini' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}
                          >
                             <div className="font-black text-lg">Google Gemini</div>
                             <div className="text-[10px] text-slate-400 mt-1">Version 3.0 Flash Preview</div>
                          </button>
                          <button 
                            onClick={() => setConfig({ ...config, aiProvider: 'groq' })}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${config.aiProvider === 'groq' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}
                          >
                             <div className="font-black text-lg">Groq (Llama 3)</div>
                             <div className="text-[10px] text-slate-400 mt-1">High Speed Inference</div>
                          </button>
                       </div>
                    </div>
                    <hr className="border-white/5" />
                    <div className="space-y-4">
                        <div className={`p-4 border rounded-xl ${isSecureServer ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <p className={`text-xs ${isSecureServer ? 'text-green-200' : 'text-red-200'}`}>
                                {isSecureServer 
                                    ? "✅ Server Environment Keys are Active." 
                                    : "⚠️ Server Keys Missing. Please create a .env file."}
                            </p>
                        </div>
                        {config.aiProvider === 'gemini' && (
                            <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                                <p className="text-[10px] font-black uppercase text-brand-400 mb-1">Google Console Requirement</p>
                                <p className="text-xs text-slate-300 leading-relaxed">Ensure 'https://pyqverse.in/' is allowed in Google Cloud Console.</p>
                            </div>
                        )}
                        {!isSecureServer && (
                            <div className="opacity-50 pointer-events-none">
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2 ml-1 tracking-widest">Gemini API Key</label>
                                <input 
                                    type="text" 
                                    value={apiKeys.gemini} 
                                    onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white font-mono text-xs focus:border-brand-500 outline-none"
                                />
                            </div>
                        )}
                    </div>
                    <button 
                      onClick={handleSaveConfig} 
                      disabled={isLoading}
                      className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-black shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                    >
                       {isLoading ? 'SAVING...' : 'APPLY CONFIGURATION'}
                    </button>
                 </div>
             </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
            <div className="max-w-4xl mx-auto grid gap-3">
                {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                {u.name?.[0]}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-white">{u.name}</p>
                                <p className="text-[10px] text-slate-500">{u.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${u.isPro ? 'bg-brand-500/20 text-brand-400 border border-brand-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                {u.isPro ? 'PRO PLAN' : 'FREE TIER'}
                            </span>
                            <button onClick={() => toggleUserPro(u.id, !!u.isPro).then(loadData)} className="text-[10px] font-bold text-slate-400 hover:text-white underline px-2">
                                Toggle
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
            <div className="max-w-4xl mx-auto bg-black/40 rounded-3xl p-6 border border-white/5 h-[60vh] overflow-y-auto font-mono text-[10px] text-slate-400 space-y-2">
                {logs.length === 0 ? <div className="text-center py-10 opacity-50">No System Logs Found</div> : logs.map(l => (
                    <div key={l.id} className="border-b border-white/5 py-2 flex gap-3">
                        <span className="text-slate-600 shrink-0">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-bold ${l.type === 'ERROR' ? 'text-red-400' : 'text-green-400'}`}>{l.type}</span>
                        <span className="break-all">{l.message}</span>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};
