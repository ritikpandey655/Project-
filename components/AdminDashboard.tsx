
import React, { useState, useEffect, useRef } from 'react';
import { User, SystemLog, ExamType, Question, QuestionSource, BannerConfig } from '../types';
import { EXAM_SUBJECTS, EXAM_CATEGORIES } from '../constants';
import { 
  getAllUsers, removeUser, toggleUserPro,
  getSystemLogs, clearSystemLogs, saveSystemConfig, getSystemConfig,
  saveApiKeys, getApiKeys, saveGlobalQuestion, saveGlobalQuestionsBulk, getGlobalStats,
  getAllGlobalQuestions, deleteGlobalQuestion, updateGlobalQuestion,
  saveBannerConfig, getBannerConfig
} from '../services/storageService';
import { checkAIConnectivity, generateWithAI, analyzeImageForQuestion, extractQuestionsFromPaper, generateBannerImage } from '../services/geminiService';
import { Button } from './Button';

interface AdminDashboardProps {
  onBack: () => void;
}

// ... existing imports and utils ...
const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 1500;
                if (width > height && width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                } else if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const CSV_HEADER = "Question,Option A,Option B,Option C,Option D,Correct Answer (A/B/C/D),Explanation,Exam,Subject,Language (en/hi)";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'upload' | 'ads' | 'keys' | 'users' | 'logs' | 'database'>('status');
  // ... existing state ...
  const [diagnostics, setDiagnostics] = useState<any>({ status: 'Connecting...', latency: 0, secure: false });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<{ aiProvider: 'gemini' | 'groq', modelName?: string }>({ aiProvider: 'gemini' });
  const [apiKeys, setApiKeys] = useState({ gemini: '', groq: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  
  // Banner State
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>({ id: 'main', imageUrl: '', isActive: false, targetUrl: '', title: '' });
  const [bannerPrompt, setBannerPrompt] = useState('Futuristic educational banner with 3D elements and golden text');
  
  // Global Stats
  const [globalStats, setGlobalStats] = useState<{ totalQuestions: number }>({ totalQuestions: 0 });

  // Database Tab
  const [globalQuestions, setGlobalQuestions] = useState<Question[]>([]);
  const [lastQuestionDoc, setLastQuestionDoc] = useState<any>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Upload State
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState<string>('General');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedQuestion, setExtractedQuestion] = useState<Partial<Question> | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  
  const [inputType, setInputType] = useState<'file' | 'text' | 'csv'>('file');
  const [uploadLanguage, setUploadLanguage] = useState<'en' | 'hi' | 'both'>('en');

  const [manualEntry, setManualEntry] = useState<Partial<Question>>({
      text: '',
      textHindi: '',
      options: ['', '', '', ''],
      optionsHindi: ['', '', '', ''],
      correctIndex: 0,
      explanation: '',
      explanationHindi: '',
      examType: '',
      subject: ''
  });
  
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [bulkQuestions, setBulkQuestions] = useState<Partial<Question>[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Cropper State
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropArea, setCropArea] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropStartRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    loadData();
    const storedKeys = getApiKeys();
    setApiKeys(storedKeys);
  }, []);

  useEffect(() => {
    if (activeTab === 'database') {
        loadGlobalQuestions(true);
    }
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    const [u, l, c, d, g, b] = await Promise.all([
        getAllUsers(), 
        getSystemLogs(), 
        getSystemConfig(),
        checkAIConnectivity(),
        getGlobalStats(),
        getBannerConfig()
    ]);
    setUsers(u);
    setLogs(l);
    if(c.aiProvider) setConfig(c);
    if(b) setBannerConfig(b);
    setDiagnostics(d);
    setGlobalStats(g);
    setIsLoading(false);
  };

  const loadGlobalQuestions = async (reset = true) => {
    setIsLoadingQuestions(true);
    try {
        const { questions, lastDoc } = await getAllGlobalQuestions(20, reset ? undefined : lastQuestionDoc);
        if (reset) {
            setGlobalQuestions(questions);
        } else {
            setGlobalQuestions(prev => [...prev, ...questions]);
        }
        setLastQuestionDoc(lastDoc);
    } catch (e) {
        alert("Failed to load questions");
    } finally {
        setIsLoadingQuestions(false);
    }
  };

  const handleDeleteGlobalQuestion = async (id: string) => {
    if(!confirm("Delete question?")) return;
    try {
        await deleteGlobalQuestion(id);
        setGlobalQuestions(prev => prev.filter(q => q.id !== id));
        getGlobalStats().then(setGlobalStats);
    } catch(e) { alert("Failed"); }
  };

  const handleEditGlobalQuestion = (q: Question) => {
      setEditingQuestion(q);
      setManualEntry({
          text: q.text,
          textHindi: q.textHindi || '',
          options: q.options || ['', '', '', ''],
          optionsHindi: q.optionsHindi || ['', '', '', ''],
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          explanationHindi: q.explanationHindi || '',
          examType: q.examType,
          subject: q.subject
      });
  };

  const handleSaveEditedQuestion = async () => {
      if (!editingQuestion) return;
      setIsProcessing(true);
      try {
          const updatedQ: Question = {
              ...editingQuestion,
              text: manualEntry.text || '',
              textHindi: manualEntry.textHindi,
              options: manualEntry.options || [],
              optionsHindi: manualEntry.optionsHindi,
              correctIndex: manualEntry.correctIndex || 0,
              explanation: manualEntry.explanation || '',
              explanationHindi: manualEntry.explanationHindi,
              examType: manualEntry.examType || editingQuestion.examType, 
              subject: manualEntry.subject || editingQuestion.subject,
          };
          await updateGlobalQuestion(updatedQ);
          setGlobalQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
          setEditingQuestion(null);
          alert("Question Updated!");
      } catch (e) {
          alert("Update Failed");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    await saveSystemConfig(config);
    saveApiKeys(apiKeys);
    alert("System Config Saved.");
    setIsLoading(false);
    loadData(); 
  };

  const handleSaveBanner = async () => {
      setIsProcessing(true);
      try {
          await saveBannerConfig(bannerConfig);
          alert("Banner Updated!");
      } catch (e) {
          alert("Failed to save banner");
      } finally {
          setIsProcessing(false);
      }
  };
  
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const base64 = await compressImage(e.target.files[0]);
              setBannerConfig({ ...bannerConfig, imageUrl: base64 });
          } catch(e) {
              alert("Image processing failed");
          }
      }
  };

  const handleGenerateBanner = async () => {
      if (!bannerPrompt) return;
      setIsProcessing(true);
      try {
          const base64 = await generateBannerImage(bannerPrompt);
          setBannerConfig({ ...bannerConfig, imageUrl: base64 });
      } catch (e: any) {
          alert("Banner Generation Failed: " + e.message);
      } finally {
          setIsProcessing(false);
      }
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (inputType === 'csv' && file.name.endsWith('.csv')) {
          const reader = new FileReader();
          reader.onload = (e) => { processCSV(e.target?.result as string); };
          reader.readAsText(file);
          return;
      }
      setSelectedFile(file);
      setExtractedQuestion(null);
      setBulkQuestions([]);
      setFileSizeWarning(null);
      const isLarge = file.size > 4 * 1024 * 1024; 
      if (file.type.startsWith('image/')) {
          try {
              const compressedUrl = await compressImage(file);
              setPreviewUrl(compressedUrl);
              const sizeInBytes = 4 * Math.ceil((compressedUrl.length / 3)) * 0.5624896334383491;
              if (sizeInBytes > 4 * 1024 * 1024 && !apiKeys.gemini) {
                  setFileSizeWarning("Large Image detected. Use Client Key.");
              }
          } catch (err) {
              const reader = new FileReader();
              reader.onloadend = () => setPreviewUrl(reader.result as string);
              reader.readAsDataURL(file);
          }
      } else {
          if (isLarge && !apiKeys.gemini) setFileSizeWarning("Large PDF detected. Use Client Key.");
          const reader = new FileReader();
          reader.onloadend = () => setPreviewUrl(reader.result as string);
          reader.readAsDataURL(file);
      }
    }
  };

  const processCSV = (text: string) => {
      const lines = text.split('\n');
      const questions: Partial<Question>[] = [];
      for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (parts && parts.length >= 6) {
              const clean = (s: string) => s?.replace(/^"|"$/g, '').trim();
              const qText = clean(parts[0]);
              const opts = [clean(parts[1]), clean(parts[2]), clean(parts[3]), clean(parts[4])];
              const ansChar = clean(parts[5]).toUpperCase(); 
              const correctIdx = ansChar.charCodeAt(0) - 65;
              const expl = parts[6] ? clean(parts[6]) : '';
              const csvExam = parts[7] ? clean(parts[7]) : '';
              const subj = parts[8] ? clean(parts[8]) : 'General';
              const lang = parts[9] ? clean(parts[9]) : 'en';
              const qObj: Partial<Question> = {
                  text: lang === 'en' ? qText : undefined,
                  textHindi: lang === 'hi' ? qText : undefined,
                  options: lang === 'en' ? opts : undefined,
                  optionsHindi: lang === 'hi' ? opts : undefined,
                  correctIndex: (correctIdx >= 0 && correctIdx <= 3) ? correctIdx : 0,
                  explanation: lang === 'en' ? expl : undefined,
                  explanationHindi: lang === 'hi' ? expl : undefined,
                  subject: subj,
                  examType: csvExam || uploadExam 
              };
              questions.push(qObj);
          }
      }
      if (questions.length > 0) {
          setBulkQuestions(questions);
          setUploadMode('bulk');
          alert(`Parsed ${questions.length} questions!`);
      } else {
          alert("Failed to parse CSV.");
      }
  };

  const downloadCSVTemplate = () => {
      const blob = new Blob([CSV_HEADER], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pyqverse_upload_template.csv';
      a.click();
  };

  const handleCropStart = (e: React.MouseEvent) => {
      const rect = imgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cropStartRef.current = { x, y };
      setCropArea({ x, y, w: 0, h: 0 });
  };
  const handleCropMove = (e: React.MouseEvent) => {
      if (!cropStartRef.current || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      setCropArea({
          x: Math.min(currentX, cropStartRef.current.x),
          y: Math.min(currentY, cropStartRef.current.y),
          w: Math.abs(currentX - cropStartRef.current.x),
          h: Math.abs(currentY - cropStartRef.current.y)
      });
  };
  const handleCropEnd = () => { cropStartRef.current = null; };
  const performCrop = () => {
      if (!imgRef.current || !cropArea || cropArea.w < 10 || cropArea.h < 10) return;
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = cropArea.w * scaleX;
      canvas.height = cropArea.h * scaleY;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(imgRef.current, cropArea.x * scaleX, cropArea.y * scaleY, cropArea.w * scaleX, cropArea.h * scaleY, 0, 0, canvas.width, canvas.height);
          setPreviewUrl(canvas.toDataURL('image/jpeg'));
          setShowCropModal(false);
          setCropArea(null);
      }
  };

  const handleExtract = async () => {
    if (!selectedFile || !previewUrl) return;
    if (apiKeys.gemini) saveApiKeys(apiKeys);
    else if (fileSizeWarning) { alert("Need Client Key for large file."); return; }
    
    // Safety check for invalid previewUrl
    if (!previewUrl.startsWith('data:')) {
        alert("Invalid image data. Please re-upload.");
        return;
    }

    const parts = previewUrl.split(',');
    if (parts.length < 2) {
        alert("Image data is corrupted. Please try a different file.");
        return;
    }
    const base64 = parts[1];
    if (!base64) {
        alert("Empty image buffer detected. Please re-upload.");
        return;
    }

    setIsProcessing(true);
    setFileSizeWarning(null);
    try {
        const mimeType = selectedFile.type;
        if (uploadMode === 'single') {
            const result = await analyzeImageForQuestion(base64, mimeType, uploadExam, uploadSubject, uploadLanguage);
            if (result) setExtractedQuestion({ ...result, examType: uploadExam, subject: uploadSubject });
        } else {
            const validSubjects = EXAM_SUBJECTS[uploadExam as ExamType] || [];
            const results = await extractQuestionsFromPaper(base64, mimeType, uploadExam, validSubjects, uploadLanguage);
            if (results && results.length > 0) {
                const mappedQs = results.map((q: any) => ({ ...q, examType: uploadExam, subject: q.subject || 'General', source: QuestionSource.MANUAL, isHandwritten: true }));
                setBulkQuestions(mappedQs);
            } else alert("No questions found.");
        }
    } catch (e: any) {
        console.error(e);
        alert("Extraction Failed: " + (e.message || "Unknown error"));
    } finally { setIsProcessing(false); }
  };

  const handleSaveQuestion = async () => {
    setIsProcessing(true);
    try {
        if (inputType === 'text') {
            if((uploadLanguage === 'en' && !manualEntry.text) || (uploadLanguage === 'hi' && !manualEntry.textHindi)) { alert("Enter text"); setIsProcessing(false); return; }
            const finalQuestion: Question = {
                id: `manual-text-${Date.now()}`,
                text: manualEntry.text || manualEntry.textHindi || '',
                textHindi: manualEntry.textHindi,
                options: manualEntry.options || [],
                optionsHindi: manualEntry.optionsHindi,
                correctIndex: manualEntry.correctIndex || 0,
                explanation: manualEntry.explanation || '',
                explanationHindi: manualEntry.explanationHindi,
                examType: uploadExam,
                subject: uploadSubject,
                source: QuestionSource.MANUAL,
                isHandwritten: true,
                createdAt: Date.now(),
                moderationStatus: 'APPROVED'
            };
            await saveGlobalQuestion(finalQuestion);
            setManualEntry({ text: '', textHindi: '', options: ['', '', '', ''], optionsHindi: ['', '', '', ''], correctIndex: 0, explanation: '', explanationHindi: '' });
            alert("Saved!");
        } else if (uploadMode === 'single' && extractedQuestion) {
            const finalQuestion: Question = {
                id: `manual-${Date.now()}`,
                text: extractedQuestion.text || extractedQuestion.textHindi || '',
                textHindi: extractedQuestion.textHindi,
                options: extractedQuestion.options || [],
                optionsHindi: extractedQuestion.optionsHindi,
                correctIndex: extractedQuestion.correctIndex || 0,
                explanation: extractedQuestion.explanation || '',
                explanationHindi: extractedQuestion.explanationHindi,
                examType: uploadExam,
                subject: uploadSubject,
                source: QuestionSource.MANUAL,
                isHandwritten: true,
                createdAt: Date.now(),
                moderationStatus: 'APPROVED'
            };
            await saveGlobalQuestion(finalQuestion);
            alert("Saved!");
            setSelectedFile(null); setPreviewUrl(null); setExtractedQuestion(null);
        } else if (uploadMode === 'bulk' && bulkQuestions.length > 0) {
            const finalQuestions: Question[] = bulkQuestions.map((q, idx) => ({
                id: `manual-bulk-${Date.now()}-${idx}`,
                text: q.text || q.textHindi || '',
                textHindi: q.textHindi,
                options: q.options || [],
                optionsHindi: q.optionsHindi,
                correctIndex: q.correctIndex || 0,
                explanation: q.explanation || '',
                explanationHindi: q.explanationHindi,
                examType: q.examType || uploadExam,
                subject: q.subject || 'General', 
                source: QuestionSource.MANUAL,
                isHandwritten: true,
                createdAt: Date.now(),
                moderationStatus: 'APPROVED'
            }));
            await saveGlobalQuestionsBulk(finalQuestions);
            alert("Bulk Saved!");
            setSelectedFile(null); setPreviewUrl(null); setBulkQuestions([]);
        }
        getGlobalStats().then(setGlobalStats);
    } catch (e) { console.error(e); alert("Save Failed"); } finally { setIsProcessing(false); }
  };

  const getLatencyColor = (ms: number) => { if (ms === 0) return 'text-slate-500'; if (ms < 800) return 'text-brand-green'; if (ms < 2000) return 'text-yellow-400'; return 'text-red-400'; };
  const getSourceBorder = (q: Question) => { if (q.source === QuestionSource.MANUAL || q.isHandwritten) return 'border-indigo-500'; if (q.aiProvider === 'groq') return 'border-orange-500'; return 'border-blue-500'; };
  
  const isSecureServer = diagnostics.secure;
  const isServerReachable = diagnostics.status !== 'Disconnected';
  const hasClientKeys = !!(apiKeys.gemini || apiKeys.groq);
  
  let statusColor = isSecureServer ? 'text-green-400' : isServerReachable ? 'text-orange-400' : hasClientKeys ? 'text-yellow-400' : 'text-red-400';
  let statusText = isSecureServer ? 'Online (Server)' : isServerReachable ? 'Server No Keys' : hasClientKeys ? 'Online (Client)' : 'Disconnected';
  let statusDesc = isSecureServer ? 'Backend Active & Secured' : isServerReachable ? 'Backend connected but keys missing' : hasClientKeys ? 'Using Manual Keys' : 'Run: npm run server';
  let cardBorder = isSecureServer ? 'bg-green-500/10 border-green-500/30' : isServerReachable ? 'bg-orange-500/10 border-orange-500/30' : hasClientKeys ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';

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
        {[{id: 'status', label: 'Dashboard'}, {id: 'upload', label: 'Upload Data'}, {id: 'ads', label: 'Ads & Banners'}, {id: 'database', label: 'Global DB'}, {id: 'keys', label: 'Keys & Security'}, {id: 'users', label: 'User Base'}, {id: 'logs', label: 'Event Logs'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {activeTab === 'status' && (
          <div className="max-w-5xl mx-auto space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className={`p-8 rounded-[32px] border-2 transition-all ${cardBorder}`}>
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Connectivity</h3>
                    <p className={`text-3xl font-black ${statusColor}`}>{statusText}</p>
                    <p className="text-[10px] mt-2 text-slate-500 font-medium">{statusDesc}</p>
                 </div>
                 <div className="p-8 rounded-[32px] bg-slate-800/30 border border-white/10">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Live Questions</h3>
                    <div className="flex items-center gap-3"><span className="text-4xl font-black text-brand-400">{globalStats.totalQuestions}</span></div>
                    <p className="text-[10px] mt-2 text-slate-500 font-medium">Synced on Cloud</p>
                 </div>
                 <div className="p-8 rounded-[32px] bg-slate-800/30 border border-white/10 relative overflow-hidden group">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Latency Check</h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-black ${getLatencyColor(diagnostics.latency)}`}>{diagnostics.latency}</span>
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
             </div>
             {testResult && <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center font-mono text-xs text-brand-300">{testResult}</div>}
          </div>
        )}

        {/* ... (Ads, Database, Upload, Keys, Users, Logs - kept same structure) ... */}
        {activeTab === 'ads' && (
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-[#121026] p-8 rounded-[32px] border border-white/5 shadow-2xl">
                    <h2 className="text-2xl font-black mb-1">Banner Ad Manager</h2>
                    <p className="text-sm text-slate-500 mb-8">Set the main sponsorship/advertisement banner for user dashboards.</p>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <span className="font-bold text-sm">Banner Active Status</span>
                            <button onClick={() => setBannerConfig({...bannerConfig, isActive: !bannerConfig.isActive})} className={`w-12 h-6 rounded-full p-1 transition-colors ${bannerConfig.isActive ? 'bg-green-500' : 'bg-slate-700'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${bannerConfig.isActive ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ad Title (Internal/Alt Text)</label>
                            <input type="text" value={bannerConfig.title || ''} onChange={e => setBannerConfig({...bannerConfig, title: e.target.value})} className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-white outline-none" placeholder="E.g., Diwali Offer" />
                        </div>

                        {/* AI Generator Section */}
                        <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl">
                            <h3 className="text-xs font-black uppercase text-brand-400 mb-2 tracking-widest flex items-center gap-2">
                                <span>✨</span> AI Banner Creator
                            </h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={bannerPrompt}
                                    onChange={e => setBannerPrompt(e.target.value)}
                                    className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10 text-white text-xs outline-none focus:border-brand-500"
                                    placeholder="Describe your banner (e.g. 'Golden UPSC Exam Prep')..."
                                />
                                <Button onClick={handleGenerateBanner} isLoading={isProcessing} size="sm" className="whitespace-nowrap">
                                    Generate
                                </Button>
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Banner Image</label>
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-brand-500/50 transition-colors relative">
                                <input type="file" accept="image/*" onChange={handleBannerImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                {bannerConfig.imageUrl ? (
                                    <img src={bannerConfig.imageUrl} alt="Banner Preview" className="max-h-40 mx-auto rounded-lg" />
                                ) : (
                                    <div className="py-4"><span className="text-2xl block mb-2">🖼️</span><span className="text-xs text-slate-400">Upload or Generate Image</span></div>
                                )}
                            </div>
                        </div>

                        {/* Target URL */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Link (On Click)</label>
                            <input type="text" value={bannerConfig.targetUrl || ''} onChange={e => setBannerConfig({...bannerConfig, targetUrl: e.target.value})} className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-white outline-none" placeholder="https://..." />
                        </div>

                        <Button onClick={handleSaveBanner} isLoading={isProcessing} className="w-full">Save Banner Settings</Button>
                    </div>
                </div>
            </div>
        )}

        {/* ... (Global Database Tab: unchanged) ... */}
        {activeTab === 'database' && (
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div><h2 className="text-2xl font-black">Global Question Bank</h2><p className="text-sm text-slate-500">Manage all uploaded questions.</p></div>
                    <Button onClick={() => loadGlobalQuestions(true)} size="sm">Refresh</Button>
                </div>
                <div className="grid gap-4">
                    {globalQuestions.length === 0 && !isLoadingQuestions && <div className="text-center py-10 text-slate-500">No questions found.</div>}
                    {globalQuestions.map(q => (
                        <div key={q.id} className={`bg-white/5 border border-white/5 p-4 rounded-xl flex gap-4 hover:bg-white/10 transition-colors group border-l-4 ${getSourceBorder(q)}`}>
                            <div className="flex-1">
                                <div className="flex gap-2 mb-2 items-center">
                                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded uppercase font-bold">{q.examType}</span>
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded uppercase font-bold">{q.subject || 'General'}</span>
                                    {q.text && <span className="text-[9px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">EN</span>}
                                    {q.textHindi && <span className="text-[9px] bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded border border-orange-800">HI</span>}
                                    <span className="text-[10px] text-slate-500 ml-auto">{new Date(q.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm font-bold text-white/90 line-clamp-2 mb-2">{q.text || q.textHindi}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => handleEditGlobalQuestion(q)} className="text-brand-400 p-2 bg-brand-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                                <button onClick={() => handleDeleteGlobalQuestion(q.id)} className="text-red-400 p-2 bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
                {(lastQuestionDoc || isLoadingQuestions) && (
                    <div className="text-center pt-4">
                        <Button onClick={() => loadGlobalQuestions(false)} variant="secondary" isLoading={isLoadingQuestions} disabled={!lastQuestionDoc}>
                            {isLoadingQuestions ? 'Loading...' : 'Load More'}
                        </Button>
                    </div>
                )}
            </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
            <div className="max-w-3xl mx-auto">
                <div className="bg-[#121026] p-8 rounded-[32px] border border-white/5 shadow-2xl space-y-6">
                    <div className="flex justify-between items-start">
                        <div><h2 className="text-2xl font-black mb-1">Add Question Data</h2><p className="text-sm text-slate-500">AI Extraction, CSV Bulk, or Manual Entry.</p></div>
                    </div>
                    {/* Method Toggle */}
                    <div className="flex bg-black/20 p-1 rounded-xl mb-2">
                        <button onClick={() => setInputType('file')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${inputType === 'file' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>📸 Upload File (AI)</button>
                        <button onClick={() => setInputType('text')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${inputType === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>✍️ Manual (Text)</button>
                        <button onClick={() => setInputType('csv')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${inputType === 'csv' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>📄 CSV (Bulk)</button>
                    </div>
                    {/* Dropdowns */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exam</label>
                            <select value={uploadExam} onChange={e => setUploadExam(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none">
                                {Object.entries(EXAM_CATEGORIES).map(([category, exams]) => (
                                    <optgroup key={category} label={category} className="bg-slate-900 text-slate-400">
                                        {exams.map(e => <option key={e} value={e} className="text-white">{e}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        {(inputType === 'text' || uploadMode === 'single') && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                                <select value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none">
                                    {availableSubjects.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    {/* Lang */}
                    {inputType !== 'csv' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Language</label>
                            <div className="flex bg-white/5 rounded-xl p-1">
                                <button onClick={() => setUploadLanguage('en')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${uploadLanguage === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>English</button>
                                <button onClick={() => setUploadLanguage('hi')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${uploadLanguage === 'hi' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}>Hindi</button>
                                <button onClick={() => setUploadLanguage('both')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${uploadLanguage === 'both' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>Both</button>
                            </div>
                        </div>
                    )}
                    {/* Manual Mode */}
                    {inputType === 'text' && (
                        <div className="space-y-6 animate-fade-in bg-white/5 p-6 rounded-2xl border border-indigo-500/30">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest">Manual Question Editor</h3>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">No AI</span>
                            </div>
                            {(uploadLanguage === 'en' || uploadLanguage === 'both') && (
                                <div className="space-y-4 border-l-2 border-blue-500/50 pl-4">
                                    <h4 className="text-[10px] font-bold text-blue-400 uppercase">English</h4>
                                    <textarea value={manualEntry.text} onChange={e => setManualEntry({...manualEntry, text: e.target.value})} placeholder="Question..." className="w-full p-3 bg-black/20 rounded-xl text-sm border border-white/10 h-20 outline-none" />
                                    <div className="grid grid-cols-1 gap-2">
                                        {manualEntry.options?.map((opt, i) => (
                                            <input key={i} value={opt} onChange={e => { const newOpts = [...(manualEntry.options || [])]; newOpts[i] = e.target.value; setManualEntry({...manualEntry, options: newOpts}); }} placeholder={`Option ${String.fromCharCode(65+i)}`} className="flex-1 p-2 rounded-lg text-sm bg-black/20 border border-white/10 outline-none" />
                                        ))}
                                    </div>
                                    <textarea value={manualEntry.explanation} onChange={e => setManualEntry({...manualEntry, explanation: e.target.value})} placeholder="Explanation..." className="w-full p-2 bg-black/20 rounded-lg text-sm border border-white/10 h-16 outline-none" />
                                </div>
                            )}
                            {(uploadLanguage === 'hi' || uploadLanguage === 'both') && (
                                <div className="space-y-4 border-l-2 border-orange-500/50 pl-4">
                                    <h4 className="text-[10px] font-bold text-orange-400 uppercase">Hindi</h4>
                                    <textarea value={manualEntry.textHindi} onChange={e => setManualEntry({...manualEntry, textHindi: e.target.value})} placeholder="प्रश्न..." className="w-full p-3 bg-black/20 rounded-xl text-sm border border-white/10 h-20 outline-none" />
                                    <div className="grid grid-cols-1 gap-2">
                                        {manualEntry.optionsHindi?.map((opt, i) => (
                                            <input key={i} value={opt} onChange={e => { const newOpts = [...(manualEntry.optionsHindi || [])]; newOpts[i] = e.target.value; setManualEntry({...manualEntry, optionsHindi: newOpts}); }} placeholder={`विकल्प ${String.fromCharCode(65+i)}`} className="flex-1 p-2 rounded-lg text-sm bg-black/20 border border-white/10 outline-none" />
                                        ))}
                                    </div>
                                    <textarea value={manualEntry.explanationHindi} onChange={e => setManualEntry({...manualEntry, explanationHindi: e.target.value})} placeholder="व्याख्या..." className="w-full p-2 bg-black/20 rounded-lg text-sm border border-white/10 h-16 outline-none" />
                                </div>
                            )}
                            <div className="pt-2">
                                <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block">Correct Answer</label>
                                <div className="flex gap-4">
                                    {[0, 1, 2, 3].map(i => (
                                        <label key={i} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer ${manualEntry.correctIndex === i ? 'bg-green-500/20 border-green-500 text-green-300' : 'border-white/10 hover:bg-white/5'}`}>
                                            <input type="radio" name="manualCorrect" checked={manualEntry.correctIndex === i} onChange={() => setManualEntry({...manualEntry, correctIndex: i})} className="accent-green-500" />
                                            <span className="font-bold">{String.fromCharCode(65+i)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={handleSaveQuestion} isLoading={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-500">Save Manual Question</Button>
                        </div>
                    )}
                    {/* CSV Mode */}
                    {inputType === 'csv' && (
                        <div className="space-y-6 animate-fade-in bg-white/5 p-6 rounded-2xl border border-green-500/30">
                            <div className="flex justify-between items-center"><h3 className="text-xs font-black uppercase text-green-400 tracking-widest">CSV Bulk Uploader</h3><button onClick={downloadCSVTemplate} className="text-[10px] bg-green-500/20 text-green-300 px-3 py-1 rounded border border-green-500/50 hover:bg-green-500/30">Download Template</button></div>
                            <div className="border-2 border-dashed border-green-500/30 rounded-2xl p-8 text-center hover:border-green-500/50 transition-colors relative">
                                <input type="file" accept=".csv" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="pointer-events-none"><span className="text-4xl mb-2 block">📄</span><span className="font-bold text-green-400">Click to Upload CSV</span></div>
                            </div>
                        </div>
                    )}
                    {/* File Mode */}
                    {inputType === 'file' && (
                        <>
                            <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                                <button onClick={() => setUploadMode('single')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 ${uploadMode === 'single' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Single Question</button>
                                <button onClick={() => setUploadMode('bulk')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 ${uploadMode === 'bulk' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Full Paper</button>
                            </div>
                            {fileSizeWarning && <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl text-orange-200 text-xs font-bold animate-fade-in mb-4">⚠️ {fileSizeWarning}<input type="text" value={apiKeys.gemini} onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })} placeholder="Paste Google Gemini API Key here" className="w-full mt-2 p-3 rounded-lg bg-black/30 border border-orange-500/30 text-white outline-none focus:border-orange-500" /></div>}
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-brand-500/50 transition-colors relative mb-6">
                                <input type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="fileUpload" />
                                <div className="pointer-events-none"><span className="text-4xl mb-2 block">📸</span><span className="font-bold text-brand-400">Click to Upload Image / PDF</span></div>
                            </div>
                            {previewUrl && (
                                <div className="animate-fade-in space-y-6">
                                    <div className="p-2 bg-white/5 rounded-xl border border-white/5 relative group">
                                        {selectedFile?.type.includes('image') ? (<><img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" /><div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><button onClick={() => setShowCropModal(true)} className="px-4 py-2 bg-white text-black font-bold rounded-lg shadow-lg hover:bg-slate-200 transition-colors">✂️ Crop Image</button></div></>) : (<div className="text-center py-10"><span className="text-4xl">📄</span><p className="mt-2 font-bold text-white">{selectedFile?.name}</p></div>)}
                                    </div>
                                    <Button onClick={handleExtract} isLoading={isProcessing} className="w-full">{isProcessing ? 'AI Processing...' : `✨ Extract ${uploadMode === 'bulk' ? 'All Questions' : 'Question'}`}</Button>
                                </div>
                            )}
                            {uploadMode === 'single' && extractedQuestion && (
                                <div className="bg-white/5 p-6 rounded-2xl border border-brand-500/30 space-y-6 animate-slide-up">
                                    <h3 className="font-black text-brand-400 uppercase tracking-widest text-xs">AI Extraction Result</h3>
                                    {(uploadLanguage === 'en' || uploadLanguage === 'both') && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between"><span className="text-[10px] text-blue-400 font-bold uppercase">English Text</span></div>
                                            <textarea value={extractedQuestion.text || ''} onChange={e => setExtractedQuestion({...extractedQuestion, text: e.target.value})} className="w-full p-3 bg-black/20 rounded-xl text-sm border border-white/10 h-24" />
                                            <div className="grid grid-cols-2 gap-2">{extractedQuestion.options?.map((opt, i) => (<input key={i} value={opt} onChange={e => { const newOpts = [...(extractedQuestion.options || [])]; newOpts[i] = e.target.value; setExtractedQuestion({...extractedQuestion, options: newOpts}); }} className={`w-full p-2 rounded-lg text-sm bg-black/20 border ${extractedQuestion.correctIndex === i ? 'border-green-500' : 'border-white/10'}`} />))}</div>
                                        </div>
                                    )}
                                    {(uploadLanguage === 'hi' || uploadLanguage === 'both') && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between"><span className="text-[10px] text-orange-400 font-bold uppercase">Hindi Text</span></div>
                                            <textarea value={extractedQuestion.textHindi || ''} onChange={e => setExtractedQuestion({...extractedQuestion, textHindi: e.target.value})} className="w-full p-3 bg-black/20 rounded-xl text-sm border border-white/10 h-24" />
                                            <div className="grid grid-cols-2 gap-2">{extractedQuestion.optionsHindi?.map((opt, i) => (<input key={i} value={opt} onChange={e => { const newOpts = [...(extractedQuestion.optionsHindi || [])]; newOpts[i] = e.target.value; setExtractedQuestion({...extractedQuestion, optionsHindi: newOpts}); }} className={`w-full p-2 rounded-lg text-sm bg-black/20 border ${extractedQuestion.correctIndex === i ? 'border-green-500' : 'border-white/10'}`} />))}</div>
                                        </div>
                                    )}
                                    <div className="flex gap-4 pt-4"><Button variant="secondary" onClick={() => setExtractedQuestion(null)} className="flex-1">Discard</Button><Button onClick={handleSaveQuestion} isLoading={isProcessing} className="flex-1 bg-green-600 hover:bg-green-500">💾 Save</Button></div>
                                </div>
                            )}
                        </>
                    )}
                    {/* Bulk Preview */}
                    {((inputType === 'file' && uploadMode === 'bulk') || inputType === 'csv') && bulkQuestions.length > 0 && (
                        <div className="bg-white/5 p-6 rounded-2xl border border-brand-500/30 space-y-4 animate-slide-up">
                            <div className="flex justify-between items-center"><h3 className="font-black text-brand-400 uppercase tracking-widest text-xs">Found {bulkQuestions.length} Questions</h3><Button onClick={handleSaveQuestion} isLoading={isProcessing} size="sm" className="bg-green-600 hover:bg-green-500">💾 Save All</Button></div>
                            <div className="max-h-96 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                                {bulkQuestions.map((q, idx) => (
                                    <div key={idx} className="p-4 bg-black/30 rounded-xl border border-white/5 hover:border-brand-500/30 transition-colors">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-500">Q{idx+1}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400">Subject:</span>
                                                <select value={q.subject || 'General'} onChange={(e) => { const newBulk = [...bulkQuestions]; newBulk[idx].subject = e.target.value; setBulkQuestions(newBulk); }} className="bg-white/10 border border-white/10 text-xs rounded-lg px-2 py-1 outline-none focus:border-brand-500 text-white">
                                                    {availableSubjects.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                                                    <option value="General" className="text-black">General</option>
                                                </select>
                                                <button onClick={() => { const newBulk = bulkQuestions.filter((_, i) => i !== idx); setBulkQuestions(newBulk); }} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">{(uploadLanguage === 'en' || uploadLanguage === 'both') && q.text && <p className="text-sm font-bold text-blue-200">{q.text}</p>}{(uploadLanguage === 'hi' || uploadLanguage === 'both') && q.textHindi && <p className="text-sm font-bold text-orange-200">{q.textHindi}</p>}</div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">{((uploadLanguage === 'hi' ? q.optionsHindi : q.options) || []).map((o, i) => (<div key={i} className={`text-xs px-2 py-1 rounded bg-white/5 ${i === q.correctIndex ? 'text-green-400 border border-green-500/30' : 'text-slate-400'}`}>{o}</div>))}</div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="secondary" onClick={() => setBulkQuestions([])} className="w-full">Discard All</Button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ... (Keys & Users & Logs: unchanged structure) ... */}
        {activeTab === 'keys' && (
          <div className="max-w-2xl mx-auto space-y-8">
             <div className="bg-[#121026] p-8 rounded-[32px] border border-white/5 shadow-2xl">
                 <h2 className="text-2xl font-black mb-1">Provider Config</h2>
                 <div className="space-y-6">
                    <div>
                       <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">Select Engine</label>
                       <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setConfig({ ...config, aiProvider: 'gemini' })} className={`p-4 rounded-2xl border-2 text-left transition-all ${config.aiProvider === 'gemini' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}><div className="font-black text-lg">Google Gemini</div><div className="text-[10px] text-slate-400 mt-1">V3.0 Flash Preview</div></button>
                          <button onClick={() => setConfig({ ...config, aiProvider: 'groq' })} className={`p-4 rounded-2xl border-2 text-left transition-all ${config.aiProvider === 'groq' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}><div className="font-black text-lg">Groq (Llama 3)</div><div className="text-[10px] text-slate-400 mt-1">High Speed</div></button>
                       </div>
                    </div>
                    <hr className="border-white/5" />
                    <div className="space-y-4">
                        <div className={`p-4 border rounded-xl ${isSecureServer ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <p className={`text-xs ${isSecureServer ? 'text-green-200' : 'text-red-200'}`}>{isSecureServer ? "✅ Server Keys Active." : "⚠️ Server Keys Missing."}</p>
                        </div>
                        {!isSecureServer && (
                            <div className="opacity-50 pointer-events-none">
                                <label className="block text-xs font-black uppercase text-slate-500 mb-2 ml-1 tracking-widest">Gemini API Key</label>
                                <input type="text" value={apiKeys.gemini} onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })} className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white font-mono text-xs focus:border-brand-500 outline-none" />
                            </div>
                        )}
                    </div>
                    <button onClick={handleSaveConfig} disabled={isLoading} className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-black shadow-lg shadow-brand-500/20 transition-all active:scale-95">{isLoading ? 'SAVING...' : 'APPLY CONFIGURATION'}</button>
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
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white">{u.name?.[0]}</div>
                            <div><p className="font-bold text-sm text-white">{u.name}</p><p className="text-[10px] text-slate-500">{u.email}</p></div>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${u.isPro ? 'bg-brand-500/20 text-brand-400 border border-brand-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>{u.isPro ? 'PRO PLAN' : 'FREE TIER'}</span>
                            <button onClick={() => toggleUserPro(u.id, !!u.isPro).then(loadData)} className="text-[10px] font-bold text-slate-400 hover:text-white underline px-2">Toggle</button>
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

      {/* Edit Question Modal */}
      {editingQuestion && (
          <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#121026] w-full max-w-2xl rounded-3xl p-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-white">Edit Question</h3><button onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-white">✕</button></div>
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exam</label><select value={manualEntry.examType} onChange={e => setManualEntry({...manualEntry, examType: e.target.value})} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none">{Object.entries(EXAM_CATEGORIES).map(([category, exams]) => (<optgroup key={category} label={category} className="bg-slate-900 text-slate-400">{exams.map(e => <option key={e} value={e} className="text-white">{e}</option>)}</optgroup>))}</select></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label><select value={manualEntry.subject} onChange={e => setManualEntry({...manualEntry, subject: e.target.value})} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none">{(EXAM_SUBJECTS[manualEntry.examType as ExamType] || []).map(s => (<option key={s} value={s} className="text-black">{s}</option>))}<option value="General" className="text-black">General</option></select></div>
                      </div>
                      <div className="space-y-2"><label className="text-xs font-bold text-blue-400">English</label><textarea value={manualEntry.text} onChange={e => setManualEntry({...manualEntry, text: e.target.value})} className="w-full p-3 bg-black/30 rounded-xl text-sm border border-white/10 h-20 outline-none" /><div className="grid grid-cols-2 gap-2">{manualEntry.options?.map((opt, i) => (<input key={i} value={opt} onChange={e => { const newOpts = [...(manualEntry.options || [])]; newOpts[i] = e.target.value; setManualEntry({...manualEntry, options: newOpts}); }} className={`flex-1 p-2 rounded-lg text-sm bg-black/30 border ${manualEntry.correctIndex === i ? 'border-green-500' : 'border-white/10'}`} />))}</div></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-orange-400">Hindi</label><textarea value={manualEntry.textHindi} onChange={e => setManualEntry({...manualEntry, textHindi: e.target.value})} className="w-full p-3 bg-black/30 rounded-xl text-sm border border-white/10 h-20 outline-none" /><div className="grid grid-cols-2 gap-2">{manualEntry.optionsHindi?.map((opt, i) => (<input key={i} value={opt} onChange={e => { const newOpts = [...(manualEntry.optionsHindi || [])]; newOpts[i] = e.target.value; setManualEntry({...manualEntry, optionsHindi: newOpts}); }} className={`flex-1 p-2 rounded-lg text-sm bg-black/30 border ${manualEntry.correctIndex === i ? 'border-green-500' : 'border-white/10'}`} />))}</div></div>
                      <div className="pt-4 flex gap-4">{[0, 1, 2, 3].map(i => (<button key={i} onClick={() => setManualEntry({...manualEntry, correctIndex: i})} className={`w-8 h-8 rounded-full font-bold flex items-center justify-center ${manualEntry.correctIndex === i ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{String.fromCharCode(65+i)}</button>))}</div>
                      <Button onClick={handleSaveEditedQuestion} isLoading={isProcessing} className="w-full mt-4">Save Changes</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Cropper Modal */}
      {showCropModal && previewUrl && (
          <div className="fixed inset-0 z-[120] bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="relative max-w-full max-h-[80vh] overflow-hidden border border-white/20 rounded-lg shadow-2xl bg-black">
                  <img ref={imgRef} src={previewUrl} className="max-h-[70vh] object-contain select-none" onMouseDown={handleCropStart} onMouseMove={handleCropMove} onMouseUp={handleCropEnd} onMouseLeave={handleCropEnd} draggable={false} />
                  {cropArea && (<div className="absolute border-2 border-brand-500 bg-brand-500/20 pointer-events-none" style={{ left: cropArea.x, top: cropArea.y, width: cropArea.w, height: cropArea.h }}></div>)}
              </div>
              <div className="mt-4 flex gap-4"><button onClick={() => setShowCropModal(false)} className="px-6 py-2 bg-slate-700 text-white rounded-lg font-bold">Cancel</button><Button onClick={performCrop} disabled={!cropArea}>Apply Crop</Button></div>
          </div>
      )}

    </div>
  );
};
