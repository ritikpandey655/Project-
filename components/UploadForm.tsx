
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
  const [showSolution, setShowSolution] = useState(false); // New state to show immediate solution
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  const handleAutoGenerate = async () => {
    if (!topic.trim()) {
      alert("Please enter a Topic or Keyword first (e.g., 'Mughal Empire' or 'Thermodynamics')");
      return;
    }
    setIsGenerating(true);
    setShowSolution(false);
    try {
      const aiQuestion = await generateSingleQuestion(examType, subject, topic);
      if (aiQuestion) {
        setText(aiQuestion.text || '');
        if (aiQuestion.options && aiQuestion.options.length === 4) {
          setOptions(aiQuestion.options);
        }
        setCorrectIndex(aiQuestion.correctIndex || 0);
        setExplanation(aiQuestion.explanation || '');
        
        // Merge tags
        const newTags = aiQuestion.tags || [];
        if (!newTags.includes(topic)) newTags.unshift(topic);
        setTags(newTags.join(', '));
        setShowSolution(true); // Show solution immediately for doubt solving
      } else {
        alert("Could not generate a question. Please try a different topic.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating question.");
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
                setText(aiQuestion.text || '');
                if (aiQuestion.options && aiQuestion.options.length > 0) {
                    const newOpts = [...aiQuestion.options];
                    while(newOpts.length < 4) newOpts.push('');
                    setOptions(newOpts.slice(0, 4));
                }
                setCorrectIndex(aiQuestion.correctIndex || 0);
                setExplanation(aiQuestion.explanation || '');
                setTags((aiQuestion.tags || []).join(', '));
                setShowSolution(true); // Show solution for doubt solving
            } else {
                alert("Could not analyze image. Please try again with a clearer image.");
            }
            setIsGenerating(false);
        };
    } catch (err) {
        console.error(err);
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
      // Reset form
      setText('');
      setOptions(['', '', '', '']);
      setExplanation('');
      setTags('');
      setTopic('');
      setShowSolution(false);
    }, 600);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-3xl mx-auto transition-colors">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            AI Doubt Solver
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {examType}
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Upload a photo or type a topic to get an instant solution & save it.</p>
        </div>
      </div>

      {/* AI Helper Section */}
      <div className="mb-8 bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
        <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
          ✨ Ask AI
        </label>
        
        {/* Text Auto-Fill */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input 
            type="text" 
            placeholder="Type your doubt or topic (e.g. 'Newton's Third Law')" 
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="flex-1 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAutoGenerate())}
          />
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleAutoGenerate} 
            isLoading={isGenerating}
            className="whitespace-nowrap text-indigo-700 bg-white dark:bg-slate-700 dark:text-indigo-300 shadow-sm"
            disabled={isGenerating}
          >
             Solve Doubt
          </Button>
        </div>

        {/* Image Upload */}
        <div className="flex items-center gap-2">
            <div className="h-px bg-indigo-200 dark:bg-indigo-800 flex-1"></div>
            <span className="text-[10px] text-indigo-400 uppercase font-bold">OR</span>
            <div className="h-px bg-indigo-200 dark:bg-indigo-800 flex-1"></div>
        </div>

        <div className="flex justify-center">
            <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />
            <Button 
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isGenerating}
                className="w-full border-dashed border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                disabled={isGenerating}
            >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Scan Question from Image
            </Button>
        </div>
      </div>

      {showSolution && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-fade-in">
           <h3 className="font-bold text-green-800 dark:text-green-300 mb-1 flex items-center gap-2">
             <span className="text-xl">💡</span> AI Solution
           </h3>
           <p className="text-sm text-slate-700 dark:text-slate-300 mb-2"><strong>Correct Answer:</strong> {options[correctIndex]}</p>
           <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{explanation}"</p>
           <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-bold text-center">👇 Edit details below if needed and save to your notes.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
            <select 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {EXAM_SUBJECTS[examType]?.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tags</label>
            <input 
              type="text" 
              placeholder="e.g. hard, imp, history" 
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Text</label>
          <textarea 
            required
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Type your question here..."
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Options</label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                 <input 
                  type="radio"
                  name="correctIndex"
                  checked={correctIndex === idx}
                  onChange={() => setCorrectIndex(idx)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                 />
              </div>
              <input 
                type="text"
                required
                value={opt}
                onChange={e => handleOptionChange(idx, e.target.value)}
                className={`flex-1 p-2 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${correctIndex === idx ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
            </div>
          ))}
          <p className="text-xs text-slate-400 ml-11">Select the radio button next to the correct answer.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Explanation (Why is it correct?)</label>
          <textarea 
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            rows={2}
            className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Add a note for your future self..."
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" isLoading={isSaving} className="w-full md:w-auto">
            Save to Notes
          </Button>
        </div>
      </form>
    </div>
  );
};
