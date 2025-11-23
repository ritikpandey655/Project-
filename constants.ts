
import { ExamType, SubscriptionPlan } from './types';

export const EXAM_SUBJECTS: Record<ExamType, string[]> = {
  [ExamType.UPSC]: ['History', 'Polity', 'Geography', 'Economy', 'General Science', 'Current Affairs', 'CSAT'],
  [ExamType.SSC_CGL]: ['Quantitative Aptitude', 'General Intelligence (Reasoning)', 'English', 'General Awareness'],
  [ExamType.SSC_CHSL]: ['Quantitative Aptitude', 'Reasoning', 'English', 'General Awareness'],
  [ExamType.SSC_MTS]: ['Numerical Aptitude', 'Reasoning', 'English', 'General Awareness'],
  [ExamType.JEE_MAINS]: ['Physics', 'Chemistry', 'Mathematics'],
  [ExamType.NEET]: ['Physics', 'Chemistry', 'Biology (Botany & Zoology)'],
  [ExamType.BANKING]: ['Quantitative Aptitude', 'Reasoning Ability', 'English Language', 'Banking Awareness', 'Computer Aptitude'],
  [ExamType.RAILWAYS]: ['Mathematics', 'General Intelligence', 'General Science', 'General Awareness'],
  [ExamType.RRB_NTPC]: ['Mathematics', 'General Intelligence', 'General Awareness'],
  [ExamType.GATE]: ['Engineering Mathematics', 'General Aptitude', 'Computer Science', 'Electronics', 'Mechanical'],
  [ExamType.NDA]: ['Mathematics', 'General Ability Test (English)', 'General Ability Test (GK)'],
  [ExamType.CDS]: ['English', 'General Knowledge', 'Elementary Mathematics'],
  [ExamType.STATE_PSC]: ['General Studies', 'State Specific GK', 'CSAT'],
  [ExamType.TEACHING_CTET]: ['Child Development', 'Mathematics', 'Environmental Studies', 'Language I', 'Language II'],
  [ExamType.POLICE_CONSTABLE]: ['General Knowledge', 'Numerical Ability', 'Reasoning', 'Mental Aptitude']
};

export const THEME_PALETTES: Record<string, Record<number, string>> = {
  'PYQverse Prime': {
    50: '#efebff', 100: '#dcd0ff', 200: '#bfa6ff', 300: '#9e75ff', 400: '#7d4bff', 
    500: '#5B2EFF', 600: '#491ecb', 700: '#38159b', 800: '#291070', 900: '#1d0b4d'
  },
  'Ocean Blue': {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 
    500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81'
  },
  'Forest Green': {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
  },
  'Sunset Orange': {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 
    500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12'
  },
  'Tech Cyan': {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 
    500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63'
  }
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 199,
    currency: '₹',
    duration: 'Month',
    features: ['Unlimited AI Questions', 'Detailed Analytics', 'Priority Support', 'Ad-free Experience']
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 1499,
    currency: '₹',
    duration: 'Year',
    features: ['All Monthly Features', 'Exclusive Mock Papers', 'Download Offline', 'Save 37%'],
    recommended: true
  }
];

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
