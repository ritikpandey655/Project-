import { ExamType } from './types';

export const EXAM_SUBJECTS: Record<ExamType, string[]> = {
  [ExamType.UPSC]: ['History', 'Polity', 'Geography', 'Economy', 'General Science', 'Current Affairs'],
  [ExamType.SSC_CGL]: ['Quantitative Aptitude', 'General Intelligence (Reasoning)', 'English', 'General Awareness'],
  [ExamType.JEE_MAINS]: ['Physics', 'Chemistry', 'Mathematics'],
  [ExamType.NEET]: ['Physics', 'Chemistry', 'Biology'],
  [ExamType.BANKING]: ['Quantitative Aptitude', 'Reasoning Ability', 'English Language', 'Banking Awareness'],
  [ExamType.RAILWAYS]: ['Mathematics', 'General Intelligence', 'General Science', 'General Awareness'],
  [ExamType.GATE]: ['Engineering Mathematics', 'General Aptitude', 'Computer Science', 'Electronics']
};

export const MOCK_QUESTIONS_FALLBACK = [
  {
    id: 'fallback-1',
    text: 'Who was the first Governor-General of Bengal?',
    options: ['Lord Clive', 'Warren Hastings', 'Lord William Bentinck', 'Lord Cornwallis'],
    correctIndex: 1,
    explanation: 'Warren Hastings became the first Governor-General of Bengal in 1773 under the Regulating Act.',
    source: 'PYQ_AI',
    examType: 'UPSC',
    subject: 'History',
    createdAt: Date.now()
  },
  {
    id: 'fallback-2',
    text: 'Which gas is used in chips packets to prevent oxidation?',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
    correctIndex: 2,
    explanation: 'Nitrogen is an inert gas used to flush bags of chips to prevent oxidation and keep them fresh.',
    source: 'PYQ_AI',
    examType: 'SSC CGL',
    subject: 'General Science',
    createdAt: Date.now()
  }
];
