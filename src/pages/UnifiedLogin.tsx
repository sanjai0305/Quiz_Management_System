import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../App';
import { Shield, User as UserIcon, Calendar, ArrowRight, Lock, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UnifiedLogin() {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [formData, setFormData] = useState({
    registration_number: '',
    date_of_birth: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/student');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = role === 'admin' ? '/api/admin/login' : '/api/student/login';
      const body = role === 'admin' 
        ? { email: formData.email, password: formData.password }
        : { registration_number: formData.registration_number, date_of_birth: formData.date_of_birth };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, { ...data.user, role });
        navigate(role === 'admin' ? '/admin' : '/student');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border-4 border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] p-8 rounded-[2.5rem]"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-[#141414] text-white p-4 rounded-2xl shadow-brutal-sm">
            <Shield size={32} />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black tracking-tighter uppercase leading-tight">
            Mahendra Institute of Technology
          </h2>
          <p className="text-[10px] font-black text-[#141414]/40 uppercase tracking-[0.2em] mt-1">
            Secure Academic Portal
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-[#F5F5F0] border-4 border-[#141414] p-1.5 rounded-2xl mb-8">
          <button
            onClick={() => setRole('student')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              role === 'student' ? 'bg-[#141414] text-white shadow-brutal-sm' : 'text-[#141414]/40'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => setRole('admin')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              role === 'admin' ? 'bg-[#141414] text-white shadow-brutal-sm' : 'text-[#141414]/40'
            }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {role === 'student' ? (
              <motion.div
                key="student-fields"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Registration Number</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                    <input
                      type="text"
                      required
                      className="w-full pl-12 pr-4 py-4 border-4 border-[#141414] rounded-2xl focus:ring-0 focus:border-indigo-600 transition-all outline-none font-black uppercase tracking-tight"
                      placeholder="e.g. 2024CS001"
                      value={formData.registration_number}
                      onChange={e => setFormData({ ...formData, registration_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                    <input
                      type="date"
                      required
                      className="w-full pl-12 pr-4 py-4 border-4 border-[#141414] rounded-2xl focus:ring-0 focus:border-indigo-600 transition-all outline-none font-black uppercase tracking-tight"
                      value={formData.date_of_birth}
                      onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="admin-fields"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                    <input
                      type="email"
                      required
                      className="w-full pl-12 pr-4 py-4 border-4 border-[#141414] rounded-2xl focus:ring-0 focus:border-indigo-600 transition-all outline-none font-black tracking-tight"
                      placeholder="admin@mit.edu"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                    <input
                      type="password"
                      required
                      className="w-full pl-12 pr-4 py-4 border-4 border-[#141414] rounded-2xl focus:ring-0 focus:border-indigo-600 transition-all outline-none font-black tracking-tight"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-50 border-4 border-red-600 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#141414] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#2a2a2a] transition-all active:scale-[0.98] disabled:opacity-50 shadow-brutal-sm"
          >
            {loading ? 'Authorizing...' : `Login to ${role} Portal`}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t-4 border-[#141414]/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">
            Secure Examination Environment
          </p>
        </div>
      </motion.div>
    </div>
  );
}
