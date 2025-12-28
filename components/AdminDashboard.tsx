import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { User, SystemLog } from '../types';
import { 
  getAllUsers, removeUser, toggleUserPro,
  getSystemLogs, clearSystemLogs
} from '../services/storageService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'users' | 'logs'>('monitor');
  const [diagnostics, setDiagnostics] = useState({
    status: 'Connecting...',
    latency: 0,
    secure: false,
    timestamp: Date.now()
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      setDiagnostics({ 
        status: 'Failed', 
        latency: 0, 
        secure: false, 
        timestamp: Date.now() 
      });
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

  useEffect(() => {
    runDiagnostics();
    loadAdminData();
    const interval = setInterval(runDiagnostics, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

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
    <div className="fixed inset-0 z-[100] bg-[#0a0814] text-white font-sans overflow-hidden flex flex-col animate-fade-in">
      {/* Admin Header */}
      <div className="bg-[#121026] border-b border-white/5 p-4 flex justify-between items-center shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-black shadow-[0_0_20px_rgba(91,46,255,0.4)]">A</div>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight leading-none">PYQverse <span className="text-brand-400">CONTROL</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">System Administrator Dashboard</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadAdminData} 
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
            title="Refresh Data"
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={onBack} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-xs font-black rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95">EXIT</button>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="flex bg-[#121026]/50 border-b border-white/5 p-1.5 gap-1.5">
        {(['monitor', 'users', 'logs'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tab ? 'bg-brand-500 border-brand-400 text-white shadow-lg' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {activeTab === 'monitor' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`p-8 rounded-[32px] border-2 transition-all ${diagnostics.status === 'Operational' ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]'}`}>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">Backend Status</p>
                <h3 className={`text-3xl font-black ${diagnostics.status === 'Operational' ? 'text-green-400' : 'text-red-400'}`}>{diagnostics.status}</h3>
                <p className="text-[10px] mt-2 text-slate-500 italic">Checked: {new Date(diagnostics.timestamp).toLocaleTimeString()}</p>
              </div>
              <div className="p-8 rounded-[32px] border-2 bg-slate-800/20 border-white/10 shadow-xl">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">System Latency</p>
                <h3 className="text-4xl font-black text-white">{diagnostics.latency} <span className="text-sm text-slate-500">ms</span></h3>
                <div className="w-full bg-slate-700/50 h-1.5 rounded-full mt-4 overflow-hidden">
                   <div className="bg-brand-500 h-full transition-all" style={{ width: `${Math.min(diagnostics.latency / 10, 100)}%` }}></div>
                </div>
              </div>
              <div className={`p-8 rounded-[32px] border-2 transition-all ${diagnostics.secure ? 'bg-brand-500/10 border-brand-500/30 shadow-[0_0_30px_rgba(91,46,255,0.1)]' : 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.1)]'}`}>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">API Security</p>
                <h3 className="text-xl font-black text-white leading-tight">
                  {diagnostics.secure ? 'KEY ACTIVE' : 'KEY MISSING'}
                </h3>
                <p className="text-[10px] mt-2 text-slate-500">Auth Method: System Env</p>
              </div>
            </div>

            <div className="bg-[#121026] rounded-[32px] p-8 border border-white/5 shadow-2xl">
              <h4 className="text-sm font-black uppercase mb-6 text-brand-400 tracking-widest flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
                Environment Information
              </h4>
              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="text-slate-500">Cloud Provider</span>
                  <span className="text-white font-bold">Vercel Edge Network</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="text-slate-500">AI Model Primary</span>
                  <span className="text-brand-400 font-bold">gemini-3-flash-preview</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="text-slate-500">Node Environment</span>
                  <span className="text-white font-bold">Production (v21.x)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Handshake Time</span>
                  <span className="text-white">{new Date(diagnostics.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black tracking-tight">User Directory <span className="text-brand-400 text-sm ml-2">({users.length} Active)</span></h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {users.map(u => (
                <div key={u.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-black text-slate-300 overflow-hidden shadow-inner">
                      {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : u.name?.[0]}
                    </div>
                    <div>
                      <p className="font-black text-sm flex items-center gap-2">
                        {u.name}
                        {u.isAdmin && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-black rounded-lg uppercase border border-red-500/20">Admin</span>}
                        {u.isPro && <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 text-[8px] font-black rounded-lg uppercase border border-brand-500/20">Pro</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleTogglePro(u)} className="px-4 py-2 bg-brand-500/10 text-brand-400 rounded-xl text-[10px] font-black border border-brand-500/20 hover:bg-brand-500 hover:text-white transition-all">TOGGLE PRO</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">DELETE</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="max-w-5xl mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">System Event Logs</h3>
              <button 
                onClick={() => { if(window.confirm("Clear all system logs?")) { clearSystemLogs(); setLogs([]); } }} 
                className="px-4 py-2 bg-red-500/10 text-red-400 text-[10px] font-black rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
              >
                PURGE LOGS
              </button>
            </div>
            <div className="bg-black/40 rounded-[32px] p-6 font-mono text-[10px] text-slate-400 space-y-2 border border-white/5 h-[60vh] overflow-y-auto scrollbar-hide shadow-inner">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center italic opacity-30 text-sm">No critical events recorded in the current cycle.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-4 border-b border-white/5 pb-2 last:border-0 hover:bg-white/5 transition-colors p-2 rounded-lg">
                    <span className="text-slate-600 shrink-0 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-black ${log.type === 'ERROR' ? 'text-red-400' : log.type === 'API_FAIL' ? 'text-orange-400' : 'text-brand-400'}`}>{log.type}</span>
                    <span className="text-slate-300 break-all">{log.message}</span>
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