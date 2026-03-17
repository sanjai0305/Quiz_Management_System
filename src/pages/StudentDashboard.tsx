import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Quiz } from '../types';
import { BookOpen, Trophy, Clock, ChevronRight, ShieldCheck, Camera, Accessibility, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

export default function StudentDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [liveQuizId, setLiveQuizId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => {
      s.emit('get_active_sessions');
    });

    s.on('active_sessions_list', (data) => {
      // Check if any of these are in the student's available quizzes
      setQuizzes(prevQuizzes => {
        if (prevQuizzes.length > 0) {
          const eligible = prevQuizzes.find(q => data.quizIds.includes(q.id.toString()));
          if (eligible) setLiveQuizId(eligible.id.toString());
        }
        return prevQuizzes;
      });
    });

    s.on('session_available', (data) => {
      // Only show if the quiz is in the student's available quizzes
      setQuizzes(prevQuizzes => {
        const isEligible = prevQuizzes.some(q => q.id.toString() === data.quizId.toString());
        if (isEligible) {
          setLiveQuizId(data.quizId);
        }
        return prevQuizzes;
      });
    });

    s.on('session_closed', (data) => {
      setLiveQuizId(prevId => prevId === data.quizId ? null : prevId);
    });

    s.on('quiz_created', () => {
      setRefreshTrigger(prev => prev + 1);
    });

    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [qRes, rRes] = await Promise.all([
        fetch('/api/quizzes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/student/results', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const qs = await qRes.json();
      setQuizzes(qs);
      setResults(await rRes.json());
      setLoading(false);

      // Re-check active sessions if socket is connected
      if (socket) {
        socket.emit('get_active_sessions');
      }
    };
    fetchData();
  }, [token, user, socket, refreshTrigger]);

  const handleStartQuiz = (quiz: Quiz) => {
    navigate(`/quiz/${quiz.id}`);
  };

  return (
    <div className="space-y-12">
      <AnimatePresence>
        {liveQuizId && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-indigo-600 text-white p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(79,70,229,0.3)] border-2 border-[#141414] flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-2xl animate-pulse">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight uppercase">Live Assessment Available</h3>
                <p className="text-xs font-medium opacity-80 uppercase tracking-widest">An administrator has initiated a quiz session. Please join the lobby.</p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => setLiveQuizId(null)}
                className="flex-1 md:flex-none px-6 py-3 border-2 border-white/30 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Dismiss
              </button>
              <button 
                onClick={() => navigate(`/quiz/${liveQuizId}`)}
                className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-brutal-sm"
              >
                Accept & Join Lobby
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center gap-6">
        <div className="w-20 h-20 bg-white border-2 border-[#141414] rounded-3xl overflow-hidden shadow-brutal-sm flex items-center justify-center">
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="bg-indigo-50 text-indigo-600 w-full h-full flex items-center justify-center">
              <BookOpen size={32} />
            </div>
          )}
        </div>
        <div>
          <h2 className="text-4xl font-black tracking-tighter">STUDENT PORTAL</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-medium uppercase tracking-widest opacity-50">Academic Dashboard • Welcome, {user?.name}</p>
            {user?.year && (
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-indigo-200">
                {user.year}{user.year === 1 ? 'st' : user.year === 2 ? 'nd' : user.year === 3 ? 'rd' : 'th'} Year
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <BookOpen size={20} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-widest">Academic Year</h4>
          </div>
          <p className="text-[10px] font-medium opacity-50 uppercase mb-2">Year: {user?.year || 'N/A'}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(y => (
              <div key={y} className={`h-1.5 flex-1 rounded-full ${user?.year && user.year >= y ? 'bg-amber-500' : 'bg-amber-100'}`} />
            ))}
          </div>
        </div>
        <div className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-widest">Department</h4>
          </div>
          <p className="text-[10px] font-medium opacity-50 uppercase mb-2">Dept: {user?.department || 'N/A'}</p>
          <p className="text-sm font-black uppercase">{user?.department} - Section {user?.section}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="text-indigo-600" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Available Assessments</h3>
            </div>
            
            <div className="space-y-12">
              {[1, 2, 3, 4].map(year => {
                const yearQuizzes = quizzes.filter(q => 
                  q.year === year && 
                  q.department === user?.department && 
                  (q.section === 'Both' || q.section === user?.section)
                );
                if (yearQuizzes.length === 0) return null;
                return (
                  <div key={year} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-indigo-200" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">
                        {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year Assessments
                      </h4>
                      <div className="h-px flex-1 bg-indigo-200" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {yearQuizzes.map(quiz => (
                        <motion.div 
                          key={quiz.id} 
                          whileHover={{ y: -5 }}
                          className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100">
                                {quiz.department}
                              </span>
                              <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-100">
                                Sec: {quiz.section}
                              </span>
                              <p className="text-[10px] font-bold uppercase opacity-40 ml-2">{quiz.subject}</p>
                            </div>
                            <h4 className="font-bold text-xl mb-2">{quiz.title}</h4>
                            <div className="flex items-center gap-4 text-xs opacity-50 mb-6">
                              <div className="flex items-center gap-1"><Clock size={14} /> {quiz.time_limit}m</div>
                              <div className="flex items-center gap-1"><BookOpen size={14} /> MCQs</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleStartQuiz(quiz)}
                            className="w-full bg-[#141414] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#2a2a2a] transition-all group"
                          >
                            Initiate Quiz <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="text-yellow-600" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Recent Performance</h3>
            </div>
            
            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-[#141414]/10 p-8 rounded-3xl text-center">
                  <p className="text-xs font-bold uppercase opacity-30">No attempts recorded yet</p>
                </div>
              ) : (
                results.map((res, i) => (
                  <div key={i} className="bg-white border-2 border-[#141414] p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">{res.title}</h4>
                      <p className="text-[10px] opacity-50 uppercase tracking-widest">{new Date(res.attempt_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl">{res.score}<span className="text-xs opacity-30">/{res.total_questions}</span></p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Completed</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-indigo-600 text-white p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(79,70,229,0.3)]">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={20} />
              <h4 className="font-bold uppercase tracking-widest text-xs">Academic Info</h4>
            </div>
            <p className="text-sm font-medium opacity-90 mb-4">
              Department: <span className="font-bold uppercase">{user?.department}</span>
            </p>
            <div className="text-[10px] opacity-70 leading-relaxed">
              Welcome to the {user?.department} portal. All assessments listed here are tailored for your curriculum.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
