
import React, { useState } from 'react';
import { QuestionPaper, QuestionType } from '../types';
import { Button } from './Button';

interface PaperViewProps {
  paper: QuestionPaper;
  onClose: () => void;
}

export const PaperView: React.FC<PaperViewProps> = ({ paper, onClose }) => {
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-fade-in">
      {/* Toolbar */}
      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 p-4 flex justify-between items-center mb-6 rounded-b-2xl shadow-sm safe-top">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-indigo-600 font-medium">← Exit</button>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>Print Paper</Button>
          <Button 
            size="sm" 
            onClick={() => setShowAnswers(!showAnswers)}
            className={showAnswers ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : ""}
          >
            {showAnswers ? "Hide Answers" : "View Answer Key"}
          </Button>
        </div>
      </div>

      {/* Paper Container */}
      <div className="bg-white p-8 md:p-12 shadow-lg rounded-none md:rounded-xl min-h-screen md:min-h-[auto]">
        {/* Paper Header */}
        <div className="border-b-2 border-slate-800 pb-6 mb-8 text-center">
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2 uppercase tracking-wide">{paper.title}</h1>
          <div className="flex justify-center gap-8 text-sm font-serif text-slate-700">
            <p><span className="font-bold">Subject:</span> {paper.subject}</p>
            <p><span className="font-bold">Time:</span> {paper.durationMinutes} Mins</p>
            <p><span className="font-bold">Max Marks:</span> {paper.totalMarks}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8 text-sm font-serif">
          <p className="font-bold mb-1">General Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-700">
            <li>All questions are compulsory.</li>
            <li>The marks for each question are indicated against it.</li>
            <li>Answers should be brief and to the point.</li>
          </ol>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {paper.sections.map((section) => (
            <div key={section.id}>
              <div className="bg-slate-100 p-2 mb-4 border-y border-slate-300">
                <h2 className="text-center font-serif font-bold text-slate-800 uppercase tracking-wider">
                  {section.title}
                </h2>
                {section.instructions && (
                   <p className="text-center text-xs text-slate-600 italic mt-1">({section.instructions})</p>
                )}
              </div>

              <div className="space-y-6">
                {section.questions.map((q, idx) => (
                  <div key={q.id} className="break-inside-avoid">
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-800 w-6 text-right">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-slate-900 font-serif text-lg leading-snug mb-3">{q.text}</p>
                          <span className="text-xs font-bold text-slate-500 ml-2 whitespace-nowrap">[{q.marks || section.marksPerQuestion} Marks]</span>
                        </div>

                        {/* MCQ Options */}
                        {q.type === QuestionType.MCQ && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 ml-1">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-500">({String.fromCharCode(97 + oIdx)})</span>
                                <span className="text-slate-800 font-serif">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Answer Key (Hidden by default) */}
                        {showAnswers && (
                          <div className="mt-3 p-3 bg-green-50 border-l-4 border-green-500 rounded-r-md text-sm font-serif">
                            <p className="font-bold text-green-800 mb-1">
                              Answer: 
                              {q.type === QuestionType.MCQ 
                                ? ` Option (${String.fromCharCode(97 + q.correctIndex)}) - ${q.options[q.correctIndex]}` 
                                : ''}
                            </p>
                            <p className="text-green-900 leading-relaxed">{q.answer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-400 text-xs font-serif">
          *** End of Paper ***
        </div>
      </div>
    </div>
  );
};
