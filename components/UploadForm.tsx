
import React, { useState, useRef } from 'react';
import { ExamType, QuestionSource, Question } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { Button } from './Button';
import { saveUserQuestion } from '../services/storageService';
import { generateSingleQuestion, generateQuestionFromImage } from '../services/geminiService';

interface UploadFormProps {
  userId: string;
  examType: ExamType;
  onSuccess: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({ userId, examType, onSuccess }) => {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [subject, setSubject] = useState(EXAM_SUBJECTS[examType][0]);
  const [tags, setTags] = useState('');
  const [topic, setTopic] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSolution, setShowSolution] = useState(false); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  const handleAutoGenerate = async () => {
    if (!topic.trim()) {
      alert("Please enter a Topic first!");
      return;
    }
    setIsGenerating(true);
    setShowSolution(false);
    try {
      const aiQuestion = await generateSingleQuestion(examType, subject, topic);
      if (aiQuestion) {
        // Artificial UX delay
        await new Promise(r => setTimeout(r, 1500));
        setText(aiQuestion.text || '');
        if (aiQuestion.options && aiQuestion.options.length === 4) {
          setOptions(aiQuestion.options);
        }
        setCorrectIndex(aiQuestion.correctIndex || 0);
        setExplanation(aiQuestion.explanation || '');
        setTags(topic);
        setShowSolution(true); 
      } else {
        alert("AI could not generate a question for this topic.");
      }
    } catch (e) {
      alert("AI Server busy. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = file.type || 'image/jpeg';
    setIsGenerating(true);
    setShowSolution(false);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const aiQuestion = await generateQuestionFromImage(base64, mimeType, examType, subject);
            
            if (aiQuestion) {
                await new Promise(r => setTimeout(r, 2000));
                setText(aiQuestion.text || '');
                if (aiQuestion.options && aiQuestion.options.length > 0) {
                    const newOpts = [...aiQuestion.options];
                    while(newOpts.length < 4) newOpts.push('');
                    setOptions(newOpts.slice(0, 4));
                }
                setCorrectIndex(aiQuestion.correctIndex || 0);
                setExplanation(aiQuestion.explanation || '');
                setTags('Scanned Question');
                setShowSolution(true); 
            } else {
                alert("Could not analyze image. Please ensure question is clearly visible.");
            }
            setIsGenerating(false);
        };
    } catch (err) {
        alert("Error processing image.");
        setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || options.some(o => !o)) return;

    setIsSaving(true);
    const newQuestion: Question = {
      id: `user-${Date.now()}`,
      text,
      options,
      correctIndex,
      explanation,
      source: QuestionSource.USER,
      examType: examType,
      subject: subject,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      createdAt: Date.now()
    };

    setTimeout(() => {
      saveUserQuestion(userId, newQuestion);
      setIsSaving(false);
      onSuccess();
    }, 600);
  };

  if (isGenerating || isSaving) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
         <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">
               {isSaving ? '📁' : '📸'}
            </div>
         </div>
         <div className="space-y-4 max-w-sm">
            <h3 className="text-3xl font-display font-black text-white leading-tight">
               {isSaving ? 'Saving to Universe...' : 'Analyzing Doubt...'}
            </h3>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
               {isSaving ? 'Updating your personal notebook archives.' : 'AI Vision is extracting text and calculating correct solution patterns.'}
            </p>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10 animate-slide-up transition-colors">
      <div className="mb-10">
        <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">AI Doubt Solver</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Scan any question or type a topic for an instant AI solution.</p>
      </div>

      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Type topic (e.g. Photosynthesis)" 
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="flex-1 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-medium outline-none focus:ring-2 focus:ring-brand-purple"
          />
          <Button onClick={handleAutoGenerate} className="!rounded-2xl px-8 shadow-lg">SOLVE TOPIC</Button>
        </div>

        <div className="relative py-2 flex items-center gap-4">
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OR</span>
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
        </div>

        <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-10 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-all group flex flex-col items-center gap-4"
        >
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
            <div className="w-16 h-16 rounded-3xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📸</div>
            <div>
               <p className="font-bold text-slate-800 dark:text-white">Scan Question</p>
               <p className="text-xs text-slate-400">Upload a photo from your camera or gallery</p>
            </div>
        </button>
      </div>

      {showSolution && (
        <div className="mb-8 p-6 bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-3xl animate-fade-in">
           <h3 className="font-black text-brand-700 dark:text-brand-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
             <span className="text-lg">💡</span> AI FOUND SOLUTION
           </h3>
           <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 font-medium leading-relaxed italic">"{explanation}"</p>
           <p className="text-[10px] font-black text-slate-400 uppercase text-center">👇 Details are auto-filled below for your notes</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Content</label>
           <textarea 
            required
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-medium outline-none h-32 resize-none"
            placeholder="Type your question here..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {options.map((opt, idx) => (
             <div key={idx} className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${correctIndex === idx ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/20' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'}`}>
                <input type="radio" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} className="w-4 h-4 accent-brand-500" />
                <input value={opt} onChange={e => handleOptionChange(idx, e.target.value)} placeholder={`Option ${String.fromCharCode(65+idx)}`} className="bg-transparent outline-none w-full text-sm font-bold text-slate-800 dark:text-white" />
             </div>
           ))}
        </div>

        <Button type="submit" className="w-full py-5 !rounded-full shadow-2xl shadow-brand-500/20 font-black text-xl">
            SAVE TO NOTEBOOK
        </Button>
      </form>
    </div>
  );
};
