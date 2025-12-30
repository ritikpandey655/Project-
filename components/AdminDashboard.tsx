
import React, { useState, useEffect } from 'react';
import { User, SystemLog } from '../types';
import { 
  getAllUsers, removeUser, toggleUserPro,
  getSystemLogs, clearSystemLogs, saveSystemConfig, getSystemConfig,
  saveApiKeys, getApiKeys
} from '../services/storageService';
import { checkAIConnectivity, generateWithAI } from '../services/geminiService';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'keys' | 'users' | 'logs'>('status');
  const [diagnostics, setDiagnostics] = useState<any>({ status: 'Connecting...', latency: 0, secure: false });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<{ aiProvider: 'gemini' | 'groq', modelName?: string }>({ aiProvider: 'gemini' });
  const [apiKeys, setApiKeys] = useState({ gemini: '', groq: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    loadData();
    const storedKeys = getApiKeys();
    setApiKeys(storedKeys);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [u, l, c, d] = await Promise.all([
        getAllUsers(), 
        getSystemLogs(), 
        getSystemConfig(),
        checkAIConnectivity()
    ]);
    setUsers(u);
    setLogs(l);
    if(c.aiProvider) setConfig(c);
    setDiagnostics(d);
    setIsLoading(false);
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    await saveSystemConfig(config);
    saveApiKeys(apiKeys);
    alert(`System Updated: Provider set to ${config.aiProvider.toUpperCase()}`);
    setIsLoading(false);
    loadData(); // Reload to update status
  };

  const runLatencyTest = async () => {
    setTestResult('Running test...');
    const start = Date.now();
    try {
        // Simple test prompt
        await generateWithAI("Test OK", false, 0.7); 
        const duration = Date.now() - start;
        setTestResult(`✅ Response received in ${duration}ms via ${config.aiProvider}`);
        loadData(); 
    } catch (e: any) {
        setTestResult(`❌ Failed: ${e.message}`);
    }
  };

  // Latency Color Helper
  const getLatencyColor = (ms: number) => {
      if (ms === 0) return 'text-slate-500';
      if (ms < 800) return 'text-brand-green'; 
      if (ms < 2000) return 'text-yellow-400';
      return 'text-red-400';
  };

  // Determine Overall Status
  const hasClientKeys = !!(apiKeys.gemini || apiKeys.groq);
  const isSecureServer = diagnostics.secure;
  const isServerReachable = diagnostics.status !== 'Disconnected';
  
  let statusColor = 'text-red-400';
  let statusText = 'Disconnected';
  let statusDesc = 'Run: npm run server';
  let cardBorder = 'bg-red-500/10 border-red-500/30';

  if (isSecureServer) {
      statusColor = 'text-green-400';
      statusText = 'Online (Server)';
      statusDesc = 'Backend Active & Secured';
      cardBorder = 'bg-green-500/10 border-green-500/30';
  } else if (isServerReachable && !isSecureServer) {
      statusColor = 'text-orange-400';
      statusText = 'Server No Keys';
      statusDesc = 'Backend connected but keys missing in .env';
      cardBorder = 'bg-orange-500/10 border-orange-500/30';
  } else if (hasClientKeys) {
      statusColor = 'text-yellow-400';
      statusText = 'Online (Client)';
      statusDesc = 'Using Manual Browser Keys (Fallback)';
      cardBorder = 'bg-yellow-500/10 border-yellow-500/30';
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0814] text-white font-sans overflow-hidden flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-[#121026] border-b border-white/5 p-4 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-black shadow-[0_0_15px_var(--brand-primary)]">A</div>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight leading-none">PYQverse <span className="text-brand-400">ADMIN</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">System Control Center</p>
          </div>
        </div>
        <div className="flex gap-3">
            <button onClick={loadData} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5" title="Refresh">🔄</button>
            <button onClick={onBack} className="px-6 py-2 bg-red-600 hover:bg-red-700 font-black rounded-xl text-xs transition-colors">EXIT</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#121026]/50 border-b border-white/5 p-1 gap-1">
        {[
            {id: 'status', label: 'Dashboard'},
            {id: 'keys', label: 'Keys & Security'}, 
            {id: 'users', label: 'User Base'}, 
            {id: 'logs', label: 'Event Logs'}
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {activeTab === 'status' && (
          <div className="max-w-5xl mx-auto space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Connectivity Card */}
                 <div className={`p-8 rounded-[32px] border-2 transition-all ${cardBorder}`}>
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Connectivity</h3>
                    <p className={`text-3xl font-black ${statusColor}`}>
                        {statusText}
                    </p>
                    <p className="text-[10px] mt-2 text-slate-500 font-medium">
                        {statusDesc}
                    </p>
                 </div>
                 
                 <div className="p-8 rounded-[32px] bg-slate-800/30 border border-white/10">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Active Provider</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-brand-400">
                            {config.aiProvider === 'groq' ? 'GROQ CLOUD' : 'GOOGLE GEMINI'}
                        </span>
                    </div>
                    <p className="text-[10px] mt-2 text-slate-500 font-medium">Model: {config.modelName || 'Default'}</p>
                 </div>

                 <div className="p-8 rounded-[32px] bg-slate-800/30 border border-white/10 relative overflow-hidden">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Latency Check</h3>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-4xl font-black ${getLatencyColor(diagnostics.latency)}`}>
                            {diagnostics.latency}
                        </p>
                        <span className="text-sm font-bold text-slate-500">ms</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={runLatencyTest} className="text-[10px] font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/5">
                            PING SERVER
                        </button>
                    </div>
                    {/* Visual Indicator */}
                    <div className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${diagnostics.latency > 0 && diagnostics.latency < 500 ? 'w-full bg-green-500' : diagnostics.latency > 2000 ? 'w-full bg-red-500' : 'w-1/2 bg-yellow-500'}`}></div>
                 </div>
             </div>

             {testResult && (
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center font-mono text-xs text-brand-300">
                     {testResult}
                 </div>
             )}
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="max-w-2xl mx-auto space-y-8">
             <div className="bg-[#121026] p-8 rounded-[32px] border border-white/5 shadow-2xl">
                 <h2 className="text-2xl font-black mb-1">Provider Config</h2>
                 <p className="text-sm text-slate-500 mb-8">Switch between AI models instantly.</p>
                 
                 <div className="space-y-6">
                    <div>
                       <label className="block text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">Select Engine</label>
                       <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setConfig({ ...config, aiProvider: 'gemini' })}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${config.aiProvider === 'gemini' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}
                          >
                             <div className="font-black text-lg">Google Gemini</div>
                             <div className="text-[10px] text-slate-400 mt-1">Version 2.5 Flash</div>
                          </button>
                          <button 
                            onClick={() => setConfig({ ...config, aiProvider: 'groq' })}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${config.aiProvider === 'groq' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}
                          >
                             <div className="font-black text-lg">Groq (Llama 3)</div>
                             <div className="text-[10px] text-slate-400 mt-1">High Speed Inference</div>
                          </button>
                       </div>
                    </div>

                    <hr className="border-white/5" />

                    <div className="space-y-4">
                        <div className={`p-4 border rounded-xl ${isSecureServer ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <p className={`text-xs ${isSecureServer ? 'text-green-200' : 'text-red-200'}`}>
                                {isSecureServer 
                                    ? "✅ Server Environment Keys are Active. You are good to go!" 
                                    : "⚠️ Server Keys Missing. Please create a .env file in the root folder with API_KEY=..."}
                            </p>
                        </div>
                        
                        {!isSecureServer && (
                            <div className="opacity-50 pointer-events-none">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-2 ml-1 tracking-widest">Gemini API Key (Manual Override)</label>
                                    <input 
                                        type="text" 
                                        value={apiKeys.gemini} 
                                        onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                                        placeholder="Use .env file instead"
                                        className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white font-mono text-xs focus:border-brand-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                      onClick={handleSaveConfig} 
                      disabled={isLoading}
                      className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-black shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                    >
                       {isLoading ? 'SAVING...' : 'APPLY CONFIGURATION'}
                    </button>
                 </div>
             </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
            <div className="max-w-4xl mx-auto grid gap-3">
                {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                {u.name?.[0]}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-white">{u.name}</p>
                                <p className="text-[10px] text-slate-500">{u.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${u.isPro ? 'bg-brand-500/20 text-brand-400 border border-brand-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                {u.isPro ? 'PRO PLAN' : 'FREE TIER'}
                            </span>
                            <button onClick={() => toggleUserPro(u.id, !!u.isPro).then(loadData)} className="text-[10px] font-bold text-slate-400 hover:text-white underline px-2">
                                Toggle
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
            <div className="max-w-4xl mx-auto bg-black/40 rounded-3xl p-6 border border-white/5 h-[60vh] overflow-y-auto font-mono text-[10px] text-slate-400 space-y-2">
                {logs.length === 0 ? <div className="text-center py-10 opacity-50">No System Logs Found</div> : logs.map(l => (
                    <div key={l.id} className="border-b border-white/5 py-2 flex gap-3">
                        <span className="text-slate-600 shrink-0">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-bold ${l.type === 'ERROR' ? 'text-red-400' : 'text-green-400'}`}>{l.type}</span>
                        <span className="break-all">{l.message}</span>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};
