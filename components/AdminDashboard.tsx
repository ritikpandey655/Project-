import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Question, QuestionSource, NewsItem, User, Transaction } from '../types';
import { 
  getGlobalStats, saveAdminQuestion, getAdminQuestions, 
  saveAdminNews, getAllUsers, removeUser, toggleUserPro, deleteGlobalQuestion,
  getTransactions, saveExamConfig, getExamConfig
} from '../services/storageService';
import { parseSmartInput } from '../services/geminiService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'exams' | 'upload' | 'questions' | 'payments' | 'settings'>('dashboard');
  
  // System Health States
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Online' | 'Offline'>('Checking');
  const [ping, setPing] = useState<number>(0);
  const [isSecure, setIsSecure] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<string>('-');

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [examConfig, setExamConfig] = useState<Record<string, string[]>>({});
  const [newExamName, setNewExamName] = useState('');
  const [newExamSubjects, setNewExamSubjects] = useState('');

  // Upload Tab State
  const [uploadType, setUploadType] = useState<'Question' | 'News'>('Question');
  const [uploadExam, setUploadExam] = useState<string>('UPSC');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  
  // Question Form State
  const [qText, setQText] = useState('');
  const [qTextHindi, setQTextHindi] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qOptionsHindi, setQOptionsHindi] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState('');
  
  // Smart Import State
  const [smartInput, setSmartInput] = useState