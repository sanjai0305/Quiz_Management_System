import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../../App';
import { Quiz, Attempt, Question } from '../../shared/types';
import { BookOpen, Trophy, Clock, ChevronRight, ShieldCheck, X, AlertCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useQuizTriggerListener } from '../../firebase';

export default function StudentDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Attempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, rRes, lRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/quizzes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/student/results`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/leaderboard`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const qData = await qRes.json();
      const rData = await rRes.json();
      const lData = await lRes.json();
      
      setQuizzes(Array.isArray(qData) ? qData : []);
      setResults(Array.isArray(rData) ? rData : []);
      setLeaderboard(Array.isArray(lData) ? lData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  useQuizTriggerListener(() => {
    if (token) fetchData();
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAttempted = (quizId: number | string) => {
    if (!Array.isArray(results)) return false;
    return results.some(r => r.quiz_id.toString() === quizId.toString());
  };

  const handleStartQuiz = (quiz: Quiz) => {
    if (isAttempted(quiz.id)) return;
    navigate(`/quiz/${quiz.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-8 border-[#141414] border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#141414]/40">Verifying Academic Records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans pb-20">
      {/* Top Bar */}
      <div className="border-b-4 border-[#141414] bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#141414] text-white p-2 rounded-lg">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Mahendra Institute of Technology</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Student Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black uppercase tracking-tight leading-none">{user?.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{user?.registration_number}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 border-2 border-[#141414] rounded-lg hover:bg-[#141414] hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-6xl font-black tracking-tighter text-[#141414] uppercase leading-none">
              Welcome, <span className="text-indigo-600">{user?.name?.split(' ')[0]}</span>
            </h2>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#141414]/40">
              Academic Dashboard & Assessments
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white border-4 border-[#141414] p-4 rounded-2xl shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Current Year</p>
              <p className="text-2xl font-black uppercase tracking-tighter">{user?.year}YR</p>
            </div>
            <div className="bg-white border-4 border-[#141414] p-4 rounded-2xl shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Department</p>
              <p className="text-2xl font-black uppercase tracking-tighter">{user?.department}</p>
            </div>
          </div>
        </header>

        {/* Security & Safety Status */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 bg-white border-4 border-[#141414] p-8 rounded-[2.5rem] shadow-brutal-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Shield size={120} />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Security & Safety Status</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Priority Type</p>
                  <p className="text-lg font-black uppercase text-indigo-600">{user?.priority_type || 'Normal'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Safety Status</p>
                  <p className={`text-lg font-black uppercase ${user?.is_safety_secure ? 'text-emerald-600' : 'text-red-600'}`}>
                    {user?.is_safety_secure ? 'SECURE' : 'UNSAFE'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Camera Access</p>
                  <p className={`text-lg font-black uppercase ${user?.camera_facilities ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {user?.camera_facilities ? 'ACTIVE' : 'DISABLED'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">OS Security</p>
                  <p className="text-lg font-black uppercase text-indigo-600">{user?.os_security_status || 'SECURE'}</p>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-[#141414]/5">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 text-center">Security Verification Stages</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(stage => (
                    <div 
                      key={stage}
                      className={`flex-1 h-3 rounded-full border-2 border-[#141414] transition-all ${
                        (user?.current_stage || 1) >= stage ? 'bg-indigo-600' : 'bg-[#F5F5F0]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] text-white p-8 rounded-[2.5rem] shadow-brutal-md flex flex-col justify-between">
            <div className="space-y-4">
              <Trophy size={40} className="text-amber-400" />
              <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Your Rank</h3>
              <p className="text-5xl font-black tracking-tighter">#{leaderboard.findIndex(r => r.id === user?.id) + 1 || '?'}</p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-4">
              Global MIT Leaderboard
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Quizzes */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border-4 border-[#141414] rounded-xl">
                <BookOpen size={24} />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight">Available Quizzes</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {quizzes.filter(q => 
                q.year === user?.year && 
                q.department === user?.department && 
                (q.section === 'Both' || q.section === user?.section)
              ).map(quiz => {
                const attempted = isAttempted(quiz.id);
                const isScheduled = quiz.scheduled_at && new Date(quiz.scheduled_at) > now;
                const expiry = quiz.expires_at || quiz.priority_category;
                const isExpired = expiry && new Date(expiry) < now;

                return (
                  <motion.div 
                    key={quiz.id}
                    whileHover={{ y: -8 }}
                    className="bg-white border-4 border-[#141414] p-8 rounded-[2rem] shadow-brutal-md flex flex-col justify-between gap-8"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 text-indigo-600 border-2 border-indigo-600 rounded-lg">
                          {quiz.subject}
                        </span>
                        {attempted && (
                          <ShieldCheck size={24} className="text-emerald-600" />
                        )}
                      </div>
                      <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">{quiz.title}</h4>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-40">
                        <div className="flex items-center gap-1.5"><Clock size={14} /> {quiz.time_limit} MIN</div>
                        <div className="flex items-center gap-1.5"><BookOpen size={14} /> MCQS</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      disabled={attempted || isScheduled || isExpired}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all border-4 border-[#141414] shadow-brutal-sm active:translate-y-1 active:shadow-none ${
                        attempted ? 'bg-emerald-50 text-emerald-600 border-emerald-600 cursor-not-allowed' :
                        isScheduled ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' :
                        isExpired ? 'bg-red-50 text-red-600 border-red-600 cursor-not-allowed' :
                        'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {attempted ? 'COMPLETED' : isScheduled ? 'NOT STARTED' : isExpired ? 'EXPIRED' : 'START QUIZ'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard Sidebar */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border-4 border-[#141414] rounded-xl">
                <Trophy size={24} />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight">Leaderboard</h3>
            </div>

            <div className="bg-white border-4 border-[#141414] rounded-[2.5rem] overflow-hidden shadow-brutal-md">
              <div className="divide-y-4 divide-[#141414]">
                {leaderboard.slice(0, 5).map((row, i) => (
                  <div key={i} className={`p-6 flex items-center justify-between ${row.id === user?.id ? 'bg-indigo-50' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black border-2 border-[#141414] shadow-brutal-sm ${
                        i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-200' : i === 2 ? 'bg-orange-300' : 'bg-white'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight">{row.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{row.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black tracking-tighter text-indigo-600">{row.totalScore}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40">PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
