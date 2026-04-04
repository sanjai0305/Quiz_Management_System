import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../../App';
import { Shield, User as UserIcon, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [formData, setFormData] = useState({
    registration_number: '',
    date_of_birth: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && user.role === 'student') {
      navigate('/student');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          registration_number: formData.registration_number, 
          date_of_birth: formData.date_of_birth 
        })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, { ...data.user, role: 'student' });
        navigate('/student');
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
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] p-8"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-[#141414] text-white p-4 rounded-2xl">
            <Shield size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-black text-center mb-2 tracking-tighter uppercase leading-tight">
          MIT STUDENT PORTAL
        </h2>
        <p className="text-center text-[10px] text-[#141414]/50 mb-8 font-bold uppercase tracking-[0.2em]">
          Secure Academic Portal
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Registration Number</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-[#141414] rounded-xl focus:ring-0 focus:border-indigo-500 transition-all outline-none font-medium"
                placeholder="e.g. 2024CS001"
                value={formData.registration_number}
                onChange={e => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
              <input
                type="date"
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-[#141414] rounded-xl focus:ring-0 focus:border-indigo-500 transition-all outline-none font-medium"
                value={formData.date_of_birth}
                onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#141414] text-white py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#2a2a2a] transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Authorizing...' : 'Login to Student Portal'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#141414]/10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">
            Secure Examination Environment
          </p>
        </div>
      </motion.div>
    </div>
  );
}
