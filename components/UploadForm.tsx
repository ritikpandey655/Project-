
import React, { useState } from 'react';
import { ExamType, QuestionSource, Question } from '../types';
import { EXAM_SUBJECTS } from '../constants';
import { Button } from './Button';
import { saveUserQuestion } from '../services/storageService';

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
  const [isSaving, setIsSaving] = useState(false);

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
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
    }, 600);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Add to Self-Revision</h2>
        <p className="text-slate-500 mt-1">Digitize your notes. We'll quiz you on this later.</p>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (Optional)</label>
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
