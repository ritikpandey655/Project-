
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
  },
  {
    id: 'fallback-3',
    text: 'In the Indian Constitution, the concept of "Fundamental Duties" was borrowed from which country?',
    options: ['USA', 'France', 'USSR (now Russia)', 'Japan'],
    correctIndex: 2,
    explanation: 'The concept of Fundamental Duties (Article 51A) was inspired by the Constitution of the former USSR.',
    source: 'PYQ_AI',
    examType: 'UPSC',
    subject: 'Polity',
    createdAt: Date.now()
  },
  {
    id: 'fallback-4',
    text: 'If a train 120m long crosses a pole in 6 seconds, what is the speed of the train?',
    options: ['60 km/hr', '72 km/hr', '80 km/hr', '90 km/hr'],
    correctIndex: 1,
    explanation: 'Speed = Distance/Time = 120m / 6s = 20 m/s. To convert to km/hr: 20 * 18/5 = 72 km/hr.',
    source: 'PYQ_AI',
    examType: 'SSC CGL',
    subject: 'Quantitative Aptitude',
    createdAt: Date.now()
  },
  {
    id: 'fallback-5',
    text: 'Which organelle is known as the "Powerhouse of the cell"?',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Lysosome'],
    correctIndex: 2,
    explanation: 'Mitochondria are responsible for generating most of the cell\'s supply of adenosine triphosphate (ATP), used as a source of chemical energy.',
    source: 'PYQ_AI',
    examType: 'NEET',
    subject: 'Biology',
    createdAt: Date.now()
  }
];
