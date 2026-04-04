import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Camera, 
  Lock, 
  AlertTriangle, 
  Users, 
  Baby, 
  Accessibility, 
  Cpu, 
  Activity,
  Eye,
  Bell,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';

type SecurityLevel = 'NORMAL' | 'ALERT' | 'EMERGENCY';

interface CameraFeed {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastActivity: string;
}

interface SystemCheck {
  id: string;
  name: string;
  status: 'secure' | 'warning' | 'critical';
  details: string;
}

export default function SecurityDashboard() {
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('NORMAL');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cameraFeeds: CameraFeed[] = [
    { id: 'CAM-01', name: 'Main Entrance', status: 'online', lastActivity: '2 mins ago' },
    { id: 'CAM-02', name: 'Server Room', status: 'online', lastActivity: 'Just now' },
    { id: 'CAM-03', name: 'Corridor A', status: 'online', lastActivity: '5 mins ago' },
    { id: 'CAM-04', name: 'Parking Lot', status: 'offline', lastActivity: '1 hour ago' },
  ];

  const systemChecks: SystemCheck[] = [
    { id: 'SYS-01', name: 'Firewall Status', status: 'secure', details: 'Active & Monitoring' },
    { id: 'SYS-02', name: 'Intrusion Detection', status: 'secure', details: 'No threats detected' },
    { id: 'SYS-03', name: 'OS Security Patches', status: 'warning', details: '2 updates pending' },
    { id: 'SYS-04', name: 'Data Encryption', status: 'secure', details: 'AES-256 Active' },
  ];

  const getLevelColor = (level: SecurityLevel) => {
    switch (level) {
      case 'NORMAL': return 'text-emerald-600 border-emerald-600 bg-emerald-50';
      case 'ALERT': return 'text-amber-600 border-amber-600 bg-amber-50';
      case 'EMERGENCY': return 'text-red-600 border-red-600 bg-red-50';
    }
  };

  return (
    <div className="p-8 bg-[#F5F5F0] min-h-screen font-sans text-[#141414]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 border-b-4 border-[#141414] pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter uppercase text-[#141414] mb-4">
            Security Command
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 border-2 border-[#141414] rounded-xl shadow-brutal-sm">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-[#141414]" />
              <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">System Active</span>
            </div>
            <span className="text-sm font-mono font-black opacity-40 uppercase tracking-widest">
              {currentTime}
            </span>
          </div>
        </div>
        <div className="flex gap-3 bg-white p-2 rounded-2xl border-4 border-[#141414] shadow-brutal-sm">
          {(['NORMAL', 'ALERT', 'EMERGENCY'] as SecurityLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setSecurityLevel(level)}
              className={`px-6 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest border-2 ${
                securityLevel === level 
                  ? getLevelColor(level) + ' border-[#141414] shadow-brutal-sm translate-y-[-2px]'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: System & OS Security */}
        <div className="space-y-8">
          <section className="bg-white border-4 border-[#141414] p-8 rounded-3xl shadow-brutal-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-100 border-2 border-[#141414] rounded-xl text-indigo-600">
                <Cpu size={24} />
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight">OS & System Security</h2>
            </div>
            <div className="space-y-4">
              {systemChecks.map((check) => (
                <div key={check.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border-2 border-[#141414] shadow-brutal-sm">
                  <div>
                    <p className="text-sm font-black text-[#141414] uppercase">{check.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{check.details}</p>
                  </div>
                  {check.status === 'secure' ? (
                    <ShieldCheck className="text-emerald-600" size={24} />
                  ) : (
                    <ShieldAlert className="text-amber-600" size={24} />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border-4 border-[#141414] p-8 rounded-3xl shadow-brutal-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-100 border-2 border-[#141414] rounded-xl text-blue-600">
                <Shield size={24} />
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight">Stage-wise Security</h2>
            </div>
            <div className="space-y-6">
              {[
                { stage: 'Stage 1', name: 'Identity Verification', status: 'Active', color: 'bg-emerald-500' },
                { stage: 'Stage 2', name: 'Environment Scan', status: 'Active', color: 'bg-emerald-500' },
                { stage: 'Stage 3', name: 'OS Integrity Check', status: 'Active', color: 'bg-emerald-500' },
                { stage: 'Stage 4', name: 'Continuous Monitoring', status: 'Standby', color: 'bg-blue-500' },
              ].map((s) => (
                <div key={s.stage} className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full border-2 border-[#141414] ${s.color} shadow-brutal-sm`} />
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#141414] uppercase tracking-tight">{s.stage}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{s.name}</p>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-lg border-2 border-[#141414] shadow-brutal-sm ${
                    s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border-4 border-[#141414] p-8 rounded-3xl shadow-brutal-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-amber-100 border-2 border-[#141414] rounded-xl text-amber-600">
                <Activity size={24} />
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight">Priority Safety</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-5 rounded-2xl bg-blue-50 border-2 border-[#141414] shadow-brutal-sm hover:translate-y-[-2px] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 border-2 border-[#141414] rounded-lg text-blue-600">
                    <Baby size={20} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tight">Child Safety</span>
                </div>
                <p className="text-xs text-slate-600 font-bold leading-relaxed">Automatic door locks & restricted access active for designated zones.</p>
              </div>
              <div className="p-5 rounded-2xl bg-purple-50 border-2 border-[#141414] shadow-brutal-sm hover:translate-y-[-2px] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 border-2 border-[#141414] rounded-lg text-purple-600">
                    <Accessibility size={20} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tight">Disability Support</span>
                </div>
                <p className="text-xs text-slate-600 font-bold leading-relaxed">Emergency ramps & audio-visual alerts are on standby for immediate deployment.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Center Column: Camera Facilities */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white border-4 border-[#141414] p-8 rounded-3xl shadow-brutal-lg h-full">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 border-2 border-[#141414] rounded-xl text-emerald-600">
                  <Camera size={24} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Camera Facilities</h2>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-red-100 border-2 border-[#141414] rounded-xl shadow-brutal-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#141414]" />
                <span className="text-xs font-black text-red-700 uppercase tracking-widest">LIVE FEED</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cameraFeeds.map((cam) => (
                <div key={cam.id} className="relative aspect-video bg-slate-200 group overflow-hidden rounded-2xl border-4 border-[#141414] shadow-brutal-sm">
                  {cam.status === 'online' ? (
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,rgba(0,0,0,0.1)_90%)] z-10" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[#141414]/10 font-mono text-xs font-black tracking-[0.3em] animate-pulse">SIGNAL_STABLE_ENCRYPTED</div>
                      </div>
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(0,0,0,0.02),rgba(0,0,0,0.01),rgba(0,0,0,0.02))] bg-[length:100%_4px,6px_100%] pointer-events-none z-20" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50">
                      <XCircle className="text-red-300 mb-3" size={64} />
                      <span className="text-xs font-black text-red-400 uppercase tracking-widest">Signal Lost</span>
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4 flex items-center gap-3 z-30">
                    <div className={`w-3 h-3 rounded-full border-2 border-[#141414] ${cam.status === 'online' ? 'bg-emerald-500 shadow-brutal-sm' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-white font-black uppercase tracking-widest bg-[#141414] px-3 py-1 rounded-lg shadow-brutal-sm">{cam.name}</span>
                  </div>
                  
                  <div className="absolute bottom-4 right-4 text-[10px] text-white font-mono font-black bg-[#141414]/80 px-3 py-1 rounded-lg z-30">
                    {cam.id} | {cam.lastActivity}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6">
              <button className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border-4 border-[#141414] shadow-brutal-sm hover:shadow-brutal-md hover:translate-y-[-4px] transition-all group">
                <Eye size={24} className="text-[#141414] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Multi-View</span>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border-4 border-[#141414] shadow-brutal-sm hover:shadow-brutal-md hover:translate-y-[-4px] transition-all group">
                <Activity size={24} className="text-[#141414] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Motion Log</span>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border-4 border-[#141414] shadow-brutal-sm hover:shadow-brutal-md hover:translate-y-[-4px] transition-all group">
                <Bell size={24} className="text-[#141414] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Alert Setup</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="mt-12 bg-white border-4 border-[#141414] px-8 py-4 flex justify-between items-center rounded-2xl shadow-brutal-md">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-600" size={20} />
            <span className="text-xs font-mono font-black text-slate-500 uppercase tracking-widest">Firewall: Secure</span>
          </div>
          <div className="flex items-center gap-3">
            <Lock className="text-emerald-600" size={20} />
            <span className="text-xs font-mono font-black text-slate-500 uppercase tracking-widest">Encryption: AES-256</span>
          </div>
        </div>
        <div className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">
          v2.4.0-STABLE
        </div>
      </div>
    </div>
  );
}
