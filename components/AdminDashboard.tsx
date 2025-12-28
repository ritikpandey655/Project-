import React, { useState, useEffect } from 'react';
import { User, SystemLog } from '../types';
import { 
  getAllUsers, removeUser, toggleUserPro,
  getSystemLogs, clearSystemLogs, saveSystemConfig, getSystemConfig
} from '../services/storageService';
import { checkAIConnectivity } from '../services/geminiService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'config' | 'users' | 'logs'>('monitor');
  const [diagnostics, setDiagnostics] = useState<any>({ status: 'Connecting...' });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<{ aiProvider: 'gemini' | 'groq', modelName?: string }>({ aiProvider: 'gemini', modelName: 'gemini-2.5-flash-preview' });
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    const result = await checkAIConnectivity();
    setDiagnostics(result);
  };

  const loadData = async () => {
    setIsLoading(true);
    const [u, l, c] = await Promise.all([getAllUsers(), getSystemLogs(), getSystemConfig()]);
    setUsers(u);
    setLogs(l);
    if(c.aiProvider) setConfig(c);
    setIsLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
    loadData();
  }, []);

  const handleSaveConfig = async () => {
    setIsLoading(true);
    await saveSystemConfig(config);
    alert(`System Updated: Using ${config.aiProvider.toUpperCase()}`);
    setIsLoading(false);
  };

  const handleTogglePro = async (user: User) => {
    await toggleUserPro(user.id, !!user.isPro);
    loadData();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0814] text-white font-sans overflow-hidden flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-[#121026] border-b border-white/5 p-4 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-black">A</div>
          <div>
            <h1 className="text-lg font-black tracking-tight">PYQverse CONTROL</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Administrator</p>
          </div>
        </div>
        <button onClick={onBack} className="px-6 py-2 bg-red-600 font-black rounded-xl text-xs">EXIT</button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#121026]/50 border-b border-white/5 p-1">
        {['monitor', 'config', 'users', 'logs'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {activeTab === 'monitor' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className={`p-8 rounded-[32px] border-2 ${diagnostics.status !== 'Failed' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <h3 className="text-sm font-black uppercase text-slate-400 mb-2">Backend Status</h3>
                <p className="text-3xl font-black">{diagnostics.status}</p>
                <p className="text-xs mt-2 text-slate-500">{diagnostics.secure ? 'API Key Active' : 'API Key Missing'}</p>
             </div>
             <div className="p-8 rounded-[32px] bg-slate-800/50 border border-white/10">
                <h3 className="text-sm font-black uppercase text-slate-400 mb-2">Current Engine</h3>
                <p className="text-3xl font-black text-brand-400">{config.aiProvider === 'groq' ? 'GROQ (Llama)' : 'GEMINI 2.5'}</p>
             </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto bg-[#121026] p-8 rounded-[32px] border border-white/5">
             <h2 className="text-2xl font-black mb-6">AI Engine Configuration</h2>
             
             <div className="space-y-6">
                <div>
                   <label className="block text-xs font-black uppercase text-slate-500 mb-3">Select Provider</label>
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setConfig({ ...config, aiProvider: 'gemini', modelName: 'gemini-2.5-flash-preview' })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiProvider === 'gemini' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}
                      >
                         <span className="block font-black text-lg">Google Gemini</span>
                         <span className="text-xs text-slate-400">Model: 2.5 Flash</span>
                      </button>
                      <button 
                        onClick={() => setConfig({ ...config, aiProvider: 'groq', modelName: 'llama-3.3-70b-versatile' })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${config.aiProvider === 'groq' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}
                      >
                         <span className="block font-black text-lg">Groq Cloud</span>
                         <span className="text-xs text-slate-400">Model: Llama 3.3</span>
                      </button>
                   </div>
                </div>

                <button 
                  onClick={handleSaveConfig} 
                  disabled={isLoading}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-black shadow-lg shadow-brand-500/20"
                >
                   {isLoading ? 'SAVING...' : 'APPLY CONFIGURATION'}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'users' && (
            <div className="space-y-2">
                {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                        <div>
                            <p className="font-bold">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${u.isPro ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{u.isPro ? 'PRO' : 'FREE'}</span>
                            <button onClick={() => handleTogglePro(u)} className="text-xs underline text-brand-400">Toggle</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {activeTab === 'logs' && (
            <div className="font-mono text-xs text-slate-400 space-y-1">
                {logs.map(l => (
                    <div key={l.id} className="border-b border-white/5 py-2">
                        <span className={l.type === 'ERROR' ? 'text-red-400' : 'text-green-400'}>{l.type}</span>: {l.message}
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};