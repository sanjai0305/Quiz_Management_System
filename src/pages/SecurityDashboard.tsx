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
      case 'NORMAL': return 'text-green-500 border-green-500 bg-green-500/10';
      case 'ALERT': return 'text-yellow-500 border-yellow-500 bg-yellow-500/10';
      case 'EMERGENCY': return 'text-red-500 border-red-500 bg-red-500/10';
    }
  };

  return (
    <div className="p-6 bg-[#E4E3E0] min-h-screen font-sans text-[#141414]">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b border-[#141414] pb-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase italic font-serif">
            Security Command Center
          </h1>
          <p className="text-xs font-mono opacity-60 uppercase tracking-widest">
            System Status: Active | {currentTime}
          </p>
        </div>
        <div className="flex gap-2">
          {(['NORMAL', 'ALERT', 'EMERGENCY'] as SecurityLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setSecurityLevel(level)}
              className={`px-4 py-1 text-xs font-mono border transition-all ${
                securityLevel === level 
                  ? getLevelColor(level) 
                  : 'border-[#141414] opacity-40 hover:opacity-100'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: System & OS Security */}
        <div className="space-y-6">
          <section className="border border-[#141414] p-4 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#141414] pb-2">
              <Cpu size={18} />
              <h2 className="text-sm font-mono uppercase font-bold">OS & System Security</h2>
            </div>
            <div className="space-y-3">
              {systemChecks.map((check) => (
                <div key={check.id} className="flex justify-between items-center p-2 border-b border-[#141414]/10 last:border-0">
                  <div>
                    <p className="text-xs font-bold">{check.name}</p>
                    <p className="text-[10px] opacity-60 font-mono">{check.details}</p>
                  </div>
                  {check.status === 'secure' ? (
                    <ShieldCheck className="text-green-600" size={16} />
                  ) : (
                    <ShieldAlert className="text-yellow-600" size={16} />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="border border-[#141414] p-4 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#141414] pb-2">
              <Shield size={18} />
              <h2 className="text-sm font-mono uppercase font-bold">Stage-wise Security</h2>
            </div>
            <div className="space-y-4">
              {[
                { stage: 'Stage 1', name: 'Identity Verification', status: 'Active', color: 'bg-green-500' },
                { stage: 'Stage 2', name: 'Environment Scan', status: 'Active', color: 'bg-green-500' },
                { stage: 'Stage 3', name: 'OS Integrity Check', status: 'Active', color: 'bg-green-500' },
                { stage: 'Stage 4', name: 'Continuous Monitoring', status: 'Standby', color: 'bg-blue-500' },
              ].map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-tighter">{s.stage}</p>
                    <p className="text-[9px] opacity-60 uppercase">{s.name}</p>
                  </div>
                  <span className="text-[8px] font-mono border border-[#141414]/20 px-1.5 py-0.5">{s.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-[#141414] p-4 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[#141414] pb-2">
              <Activity size={18} />
              <h2 className="text-sm font-mono uppercase font-bold">Priority Safety Protocols</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-[#141414]/20 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Baby size={16} className="text-blue-600" />
                  <span className="text-[10px] font-bold uppercase">Child Safety</span>
                </div>
                <p className="text-[9px] opacity-70">Automatic door locks & restricted access active.</p>
              </div>
              <div className="p-3 border border-[#141414]/20 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Accessibility size={16} className="text-purple-600" />
                  <span className="text-[10px] font-bold uppercase">Disability Support</span>
                </div>
                <p className="text-[9px] opacity-70">Emergency ramps & audio alerts standby.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Center Column: Camera Facilities */}
        <div className="lg:col-span-2 space-y-6">
          <section className="border border-[#141414] p-4 bg-white/50 backdrop-blur-sm h-full">
            <div className="flex justify-between items-center mb-4 border-b border-[#141414] pb-2">
              <div className="flex items-center gap-2">
                <Camera size={18} />
                <h2 className="text-sm font-mono uppercase font-bold">Camera Facilities</h2>
              </div>
              <span className="text-[10px] font-mono bg-[#141414] text-white px-2 py-0.5">LIVE FEED</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {cameraFeeds.map((cam) => (
                <div key={cam.id} className="relative aspect-video bg-[#141414] group overflow-hidden border border-[#141414]">
                  {cam.status === 'online' ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,transparent_20%,#000_70%)]" />
                      <div className="text-white/20 font-mono text-[8px] animate-pulse">RECEIVING SIGNAL...</div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
                      <XCircle className="text-red-500 opacity-50" size={32} />
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${cam.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[8px] text-white font-mono uppercase tracking-tighter">{cam.name}</span>
                  </div>
                  
                  <div className="absolute bottom-2 right-2 text-[8px] text-white/50 font-mono">
                    {cam.id} | {cam.lastActivity}
                  </div>

                  <div className="absolute inset-0 border border-white/5 pointer-events-none" />
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="border border-[#141414] p-3 text-center hover:bg-[#141414] hover:text-white transition-colors cursor-pointer">
                <Eye size={16} className="mx-auto mb-1" />
                <span className="text-[9px] font-mono uppercase">Multi-View</span>
              </div>
              <div className="border border-[#141414] p-3 text-center hover:bg-[#141414] hover:text-white transition-colors cursor-pointer">
                <Activity size={16} className="mx-auto mb-1" />
                <span className="text-[9px] font-mono uppercase">Motion Log</span>
              </div>
              <div className="border border-[#141414] p-3 text-center hover:bg-[#141414] hover:text-white transition-colors cursor-pointer">
                <Bell size={16} className="mx-auto mb-1" />
                <span className="text-[9px] font-mono uppercase">Alert Setup</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="mt-8 border-t border-[#141414] pt-4 flex justify-between items-center text-[10px] font-mono opacity-60">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> ENCRYPTION: ACTIVE</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> NETWORK: SECURE</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> AUTH: VERIFIED</span>
        </div>
        <div>
          V.2.4.0-STABLE
        </div>
      </div>
    </div>
  );
}
