import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../../App';
import { Shield, User as UserIcon, Key, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    newPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isForgotPassword) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            newPassword: formData.newPassword 
          })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess('Password reset successful! Please login.');
          setIsForgotPassword(false);
        } else {
          setError(data.error || 'Reset failed');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRegistering) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formData.name, 
            email: formData.email, 
            password: formData.password 
          })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess('Registration successful! Please login.');
          setIsRegistering(false);
        } else {
          setError(data.error || 'Registration failed');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, { ...data.user, role: 'admin' });
        navigate('/admin');
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
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] p-8"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-[#141414] text-white p-4 rounded-2xl">
            <Shield size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-black text-center mb-2 tracking-tighter uppercase leading-tight">
          {isRegistering ? 'Admin Register' : (isForgotPassword ? 'Reset Password' : 'ADMIN PORTAL')}
        </h2>
        <p className="text-center text-[10px] text-[#141414]/50 mb-8 font-bold uppercase tracking-[0.2em]">
          {isRegistering ? 'Create Admin Account' : (isForgotPassword ? 'Recover Admin Access' : 'Secure Administrative Access')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#141414] rounded-xl focus:ring-0 focus:border-indigo-500 transition-all outline-none font-medium"
                  placeholder="Admin Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Email Address</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-[#141414] rounded-xl focus:ring-0 focus:border-indigo-500 transition-all outline-none font-medium"
                placeholder="admin@college.edu"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          {!isForgotPassword ? (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#141414] rounded-xl focus:ring-0 focus:border-indigo-500 transition-all outline-none font-medium"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#141414] rounded-xl focus:ring-0 focus:border-indigo-500 transition-all outline-none font-medium"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-600 text-xs font-bold rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#141414] text-white py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#2a2a2a] transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Create Account' : (isForgotPassword ? 'Update Password' : 'Authorize Access'))}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4 text-center">
          {!isForgotPassword && (
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
              className="text-xs font-bold uppercase tracking-widest text-[#141414]/50 hover:text-[#141414] underline underline-offset-4"
            >
              {isRegistering ? 'Already have an account? Login' : 'Need an admin account? Register'}
            </button>
          )}
          
          {!isRegistering && (
            <button
              onClick={() => { setIsForgotPassword(!isForgotPassword); setError(''); setSuccess(''); }}
              className="text-xs font-bold uppercase tracking-widest text-[#141414]/50 hover:text-[#141414] underline underline-offset-4"
            >
              {isForgotPassword ? 'Back to Login' : 'Forgot Password?'}
            </button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-[#141414]/10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">
            Secure Administrative Environment
          </p>
        </div>
      </motion.div>
    </div>
  );
}
