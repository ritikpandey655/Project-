
import React, { useState } from 'react';
import { ExamType, QuestionSource, Question } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { Button } from './Button';
import { saveUserQuestion } from '../services/storageService';
import { generateSingleQuestion } from '../services/geminiService';

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
        // Add the topic itself as a tag if not present
        if (!newTags.includes(topic)) newTags.unshift(topic);
        setTags(newTags.join(', '));
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

    // Simulate network delay for better UX feel
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
    }, 600);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Add to Self-Revision
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
              {examType}
            </span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm">Digitize your notes. We'll quiz you on this later.</p>
        </div>
      </div>

      {/* AI Helper Section */}
      <div className="mb-8 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
        <label className="block text-xs font-bold text-indigo-800 uppercase mb-2 tracking-wide">
          ✨ AI Auto-Fill (Optional)
        </label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter a topic (e.g. 'Battle of Plassey', 'Trigonometry')" 
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="flex-1 p-2.5 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAutoGenerate())}
          />
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleAutoGenerate} 
            isLoading={isGenerating}
            className="whitespace-nowrap text-indigo-700 bg-white shadow-sm hover:bg-indigo-50 border-indigo-200"
          >
             Auto-Fill with AI
          </Button>
        </div>
        <p className="text-[10px] text-indigo-400 mt-1.5 ml-1">
          Fetches a PYQ-style question from the internet/AI based on your topic.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <select 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {EXAM_SUBJECTS[examType]?.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <input 
              type="text" 
              placeholder="e.g. hard, imp, history" 
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Question Text</label>
          <textarea 
            required
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Type your question here..."
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Options</label>
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
                className={`flex-1 p-2 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 ${correctIndex === idx ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}`}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
            </div>
          ))}
          <p className="text-xs text-slate-400 ml-11">Select the radio button next to the correct answer.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Explanation (Why is it correct?)</label>
          <textarea 
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            rows={2}
            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Add a note for your future self..."
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" isLoading={isSaving} className="w-full md:w-auto">
            Save Question
          </Button>
        </div>
      </form>
    </div>
  );
};
