import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { User, SystemLog } from '../types';
import { 
  getAllUsers, removeUser, toggleUserPro,
  getSystemLogs, clearSystemLogs, getExamConfig, getSystemConfig
} from '../services/storageService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'users' | 'logs'>('monitor');
  const [diagnostics, setDiagnostics] = useState({
    status: 'Checking...',
    latency: 0,
    secure: false,
    timestamp: 0
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    runDiagnostics();
    loadAdminData();
  }, []);

  const runDiagnostics = async () => {
    const start = Date.now();
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics({
          status: 'Operational',
          latency: Date.now() - start,
          secure: data.secure,
          timestamp: data.timestamp
        });
      } else {
        throw new Error();
      }
    } catch (e) {
      setDiagnostics({ status: 'Failed', latency: 0, secure: false, timestamp: Date.now() });
    }
  };

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [u, l] = await Promise.all([getAllUsers(), getSystemLogs()]);
      setUsers(u);
      setLogs(l);
    } catch (e) {
      console.error("Admin Load Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePro = async (user: User) => {
    await toggleUserPro(user.id, !!user.isPro);
    loadAdminData();
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("Delete this user permanently?")) {
      await removeUser(id);
      loadAdminData();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/5 p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center font-black">A</div>
          <h1 className="text-lg font-display font-black tracking-tight">PYQverse <span className="text-brand-500">CONTROL</span></h1>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAdminData} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={onBack} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs font-bold rounded-lg transition-colors">EXIT</button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex bg-slate-900/50 border-b border-white/5 p-1 gap-1">
        {(['monitor', 'users', 'logs'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'monitor' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-6 rounded-3xl border transition-all ${diagnostics.status === 'Operational' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Backend Status</p>
                <h3 className={`text-3xl font-black ${diagnostics.status === 'Operational' ? 'text-green-400' : 'text-red-400'}`}>{diagnostics.status}</h3>
              </div>
              <div className="p-6 rounded-3xl border bg-slate-800/50 border-white/5">
                <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Latency</p>
                <h3 className="text-3xl font-black text-white">{diagnostics.latency}ms</h3>
              </div>
              <div className={`p-6 rounded-3xl border transition-all ${diagnostics.secure ? 'bg-brand-500/10 border-brand-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                <p className="text-[10px] text-slate-400 font-black uppercase mb-2">API Security</p>
                <h3 className="text-xl font-black text-white">{diagnostics.secure ? 'KEY ACTIVE' : 'KEY MISSING'}</h3>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-3xl p-6 border border-white/5">
              <h4 className="text-sm font-black uppercase mb-4 text-slate-400">Environment Node</h4>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">Deployment Region</span>
                  <span className="text-white">Global (Vercel Edge)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500">AI Model Default</span>
                  <span className="text-brand-400">gemini-3-flash-preview</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">System Time</span>
                  <span className="text-white">{new Date(diagnostics.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-black">User Directory ({users.length})</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {users.map(u => (
                <div key={u.id} className="bg-slate-800/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden">
                      {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : u.name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {u.name}
                        {u.isAdmin && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-black rounded uppercase">Admin</span>}
                        {u.isPro && <span className="px-1.5 py-0.5 bg-brand-500/20 text-brand-400 text-[8px] font-black rounded uppercase">Pro</span>}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleTogglePro(u)} className="px-3 py-1.5 bg-brand-500/10 text-brand-400 rounded-lg text-[10px] font-bold border border-brand-500/20">TOGGLE PRO</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-bold border border-red-500/20">DELETE</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="max-w-5xl mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black">System Logs</h3>
              <button onClick={() => { clearSystemLogs(); setLogs([]); }} className="text-[10px] font-bold text-red-400 hover:underline">CLEAR ALL</button>
            </div>
            <div className="bg-black/40 rounded-3xl p-4 font-mono text-[10px] text-slate-400 space-y-2 border border-white/5 h-[60vh] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center italic opacity-30">No event logs recorded.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-4 border-b border-white/5 pb-1">
                    <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={log.type === 'ERROR' ? 'text-red-400' : 'text-brand-400'}>{log.type}</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};