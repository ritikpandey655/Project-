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
  const [activeTab, setActiveTab] = useState<'monitor' | 'users' | 'settings'>('monitor');
  const [aiStatus, setAiStatus] = useState<'Checking' | 'Operational' | 'Failed'>('Checking');
  const [latency, setLatency] = useState<number>(0);
  const [isSecure, setIsSecure] = useState<boolean>(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  useEffect(() => {
    loadData();
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsTestRunning(true);
    const start = Date.now();
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setLatency(Date.now() - start);
      setAiStatus(data.status === 'Online' ? 'Operational' : 'Failed');
      setIsSecure(data.secure);
    } catch (e) {
      setAiStatus('Failed');
      setLatency(0);
      setIsSecure(false);
    }
    setIsTestRunning(false);
  };

  const loadData = async () => {
    try {
      const [u, l] = await Promise.all([getAllUsers(), getSystemLogs()]);
      setUsers(u);
      setLogs(l);
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-mono fixed inset-0 z-[100] overflow-y-auto">
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-20 flex justify-between items-center">
         <h1 className="text-lg font-bold tracking-widest uppercase">PYQverse <span className="text-orange-500">ADMIN</span></h1>
         <div className="flex gap-2">
            <button onClick={runDiagnostics} className="px-3 py-1 bg-slate-700 rounded text-xs uppercase">Scan</button>
            <button onClick={onBack} className="px-3 py-1 bg-red-600 rounded text-xs uppercase">Exit</button>
         </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-6 rounded-2xl border ${aiStatus === 'Operational' ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                <p className="text-[10px] text-slate-400 uppercase font-black mb-4">Backend Status</p>
                <h3 className={`text-3xl font-black ${aiStatus === 'Operational' ? 'text-green-400' : 'text-red-400'}`}>{aiStatus}</h3>
            </div>
            <div className="p-6 rounded-2xl border bg-slate-800/50 border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-4">Network Latency</p>
                <h3 className="text-3xl font-black text-white">{latency}ms</h3>
            </div>
            <div className={`p-6 rounded-2xl border ${isSecure ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                <p className="text-[10px] text-slate-400 uppercase font-black mb-4">API Security</p>
                <h3 className="text-xl font-black text-white">{isSecure ? 'Key Secured' : 'Key Missing'}</h3>
            </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <h3 className="font-bold mb-4">System Log</h3>
            <div className="space-y-2 text-[10px] font-mono text-slate-400 max-h-64 overflow-y-auto">
                {logs.length === 0 ? "No logs found." : logs.map(l => (
                    <div key={l.id} className="border-b border-slate-700 pb-1">
                        [{new Date(l.timestamp).toLocaleTimeString()}] {l.type}: {l.message}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};