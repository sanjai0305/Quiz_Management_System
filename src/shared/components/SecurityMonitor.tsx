import React, { useState, useEffect } from 'react';
import { Camera, Shield, Monitor, AlertTriangle, CheckCircle2, Lock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface SecurityStatus {
  camera: 'active' | 'inactive' | 'error';
  fullscreen: boolean;
  focus: boolean;
  osSecure: boolean;
  safetySecure: boolean;
}

export function SecurityMonitor({ user }: { user?: User }) {
  const [status, setStatus] = useState<SecurityStatus>({
    camera: user?.camera_facilities ? 'active' : 'inactive',
    fullscreen: false,
    focus: true,
    osSecure: user?.os_security_status === 'secure',
    safetySecure: user?.is_safety_secure || false
  });

  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  useEffect(() => {
    const handleVisibilityChange = () => {
      setStatus(prev => ({ ...prev, focus: !document.hidden }));
      if (document.hidden) {
        setAlertMsg('Window Focus Lost! Security Alert Triggered.');
        setShowAlert(true);
      }
    };

    const handleFullscreenChange = () => {
      setStatus(prev => ({ ...prev, fullscreen: !!document.fullscreenElement }));
      if (!document.fullscreenElement) {
        setAlertMsg('Fullscreen Mode Exited! Please re-enter for security.');
        setShowAlert(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <>
      <div className="fixed top-24 right-6 z-40 flex flex-col gap-3 pointer-events-none sm:pointer-events-auto">
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-white border-4 border-[#141414] p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] w-48 space-y-3"
        >
          <div className="flex items-center justify-between border-b-2 border-[#141414]/10 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest">Security Feed</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/30" />
            </div>
          </div>

          <div className="space-y-2">
            {user?.priority_type && user.priority_type !== 'normal' && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <UserIcon size={14} className="text-amber-600" />
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600">Priority: {user.priority_type}</span>
              </div>
            )}
            <SecurityItem 
              icon={<Camera size={14} />} 
              label="Camera" 
              status={status.camera === 'active' ? 'secure' : 'warning'} 
            />
            <SecurityItem 
              icon={<Monitor size={14} />} 
              label="Fullscreen" 
              status={status.fullscreen ? 'secure' : 'warning'} 
            />
            <SecurityItem 
              icon={<Shield size={14} />} 
              label="OS Integrity" 
              status={status.osSecure ? 'secure' : 'danger'} 
            />
            <SecurityItem 
              icon={<CheckCircle2 size={14} />} 
              label="Safety Secure" 
              status={status.safetySecure ? 'secure' : 'warning'} 
            />
            <SecurityItem 
              icon={<Lock size={14} />} 
              label="Focus" 
              status={status.focus ? 'secure' : 'danger'} 
            />
          </div>

          <div className="pt-2">
            <div className="bg-gray-100 rounded-lg h-24 flex items-center justify-center overflow-hidden relative border-2 border-[#141414]/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <Camera size={24} className="text-[#141414]/20" />
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[6px] font-bold text-white uppercase">Live</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAlert && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white border-8 border-red-600 p-8 rounded-[3rem] max-w-md w-full shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] space-y-6 text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-600">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tight text-red-600">Security Violation</h2>
                <p className="font-bold text-gray-600">{alertMsg}</p>
              </div>
              <button 
                onClick={() => setShowAlert(false)}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-[4px_4px_0px_0px_rgba(153,27,27,1)]"
              >
                Acknowledge & Resume
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SecurityItem({ icon, label, status }: { icon: React.ReactNode, label: string, status: 'secure' | 'warning' | 'danger' }) {
  const colors = {
    secure: 'text-emerald-600 bg-emerald-50',
    warning: 'text-amber-600 bg-amber-50',
    danger: 'text-red-600 bg-red-50'
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded-xl border-2 border-transparent hover:border-[#141414]/5 transition-all ${colors[status]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
      </div>
      {status === 'secure' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
    </div>
  );
}
