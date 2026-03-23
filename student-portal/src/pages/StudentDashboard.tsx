import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { Quiz, Attempt, Question } from '../types';
import { BookOpen, Trophy, Clock, ChevronRight, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function StudentDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Attempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Quizzes matching student's criteria
      const qQuery = query(
        collection(db, 'quizzes'),
        where('department', '==', user?.department),
        where('year', '==', user?.year)
      );
      const qSnap = await getDocs(qQuery);
      const allQuizzes = qSnap.docs.map(d => ({ ...d.data(), id: d.id } as any as Quiz));
      // Filter by section client-side since Firestore 'where' has limitations with 'Both'
      setQuizzes(allQuizzes.filter(q => q.section === 'Both' || q.section === user?.section));

      // Fetch Student's Results
      const rQuery = query(
        collection(db, 'attempts'),
        where('registration_number', '==', user?.registration_number)
      );
      const rSnap = await getDocs(rQuery);
      setResults(rSnap.docs.map(d => ({ ...d.data(), id: d.id } as any as Attempt)));

      // Fetch Leaderboard (calculated from all attempts in same dept/section)
      const lSnap = await getDocs(collection(db, 'attempts'));
      const studentScores: Record<string, { name: string, registration_number: string, totalScore: number, id: string }> = {};
      
      lSnap.docs.forEach(d => {
        const attempt = d.data();
        const sid = attempt.registration_number;
        if (!studentScores[sid]) {
          studentScores[sid] = { name: attempt.name, registration_number: sid, totalScore: 0, id: attempt.student_id };
        }
        studentScores[sid].totalScore += attempt.score;
      });
      
      const sorted = Object.values(studentScores).sort((a, b) => b.totalScore - a.totalScore);
      setLeaderboard(sorted);
    } catch (err) {
      console.error('Failed to fetch Firestore data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest opacity-40">Verifying Academic Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
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
              <BookOpen size={20} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-widest">Department</h4>
          </div>
          <p className="text-[10px] font-medium opacity-50 uppercase mb-2">Dept: {user?.department || 'N/A'}</p>
          <p className="text-sm font-black uppercase">{user?.department} - Section {user?.section}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Safety Status</p>
            <p className="font-bold text-sm uppercase">{user?.is_safety_secure ? 'Secure Environment' : 'Standard'}</p>
          </div>
          <ShieldCheck className={user?.is_safety_secure ? 'text-emerald-600' : 'text-gray-300'} size={32} />
        </div>
        <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Camera Facility</p>
            <p className="font-bold text-sm uppercase">{user?.camera_facilities ? 'Active Monitoring' : 'Inactive'}</p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user?.camera_facilities ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
            <Clock size={20} />
          </div>
        </div>
        <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Priority Level</p>
            <p className="font-bold text-sm uppercase">{user?.priority_type || 'Normal'}</p>
          </div>
          <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-black text-xs">
            {user?.priority_type?.[0].toUpperCase() || 'N'}
          </div>
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
                      {yearQuizzes.map(quiz => {
                        const attempted = isAttempted(quiz.id);
                        return (
                          <motion.div 
                            key={quiz.id} 
                            whileHover={!attempted ? { y: -5 } : {}}
                            className={`bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col justify-between ${attempted ? 'opacity-75 grayscale-[0.5]' : ''}`}
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
                              <div className="flex flex-col gap-2 mb-6">
                                <div className="flex items-center gap-4 text-xs opacity-50">
                                  <div className="flex items-center gap-1"><Clock size={14} /> {quiz.time_limit}m</div>
                                  <div className="flex items-center gap-1"><BookOpen size={14} /> MCQs</div>
                                </div>
                                {(() => {
                                  const expiry = quiz.expires_at || quiz.priority_category;
                                  const isExpired = expiry && new Date(expiry) < now;
                                  return expiry && !attempted && (
                                    <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                                      <AlertCircle size={12} />
                                      {isExpired ? 'Expired' : `Ends: ${new Date(expiry).toLocaleString()}`}
                                    </div>
                                  );
                                })()}
                                {attempted && (
                                  <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 w-fit">
                                    <ShieldCheck size={14} />
                                    Attempt Locked
                                  </div>
                                )}
                                {quiz.scheduled_at && !attempted && (
                                <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${new Date(quiz.scheduled_at) > now ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                  <Clock size={12} />
                                  {(() => {
                                    const scheduledTime = new Date(quiz.scheduled_at);
                                    if (scheduledTime > now) {
                                      const diff = scheduledTime.getTime() - now.getTime();
                                      const hours = Math.floor(diff / (1000 * 60 * 60));
                                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                                      
                                      if (hours > 24) return `Starts: ${scheduledTime.toLocaleString()}`;
                                      return `Starts in: ${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
                                    }
                                    return 'Quiz is Live';
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const isScheduled = quiz.scheduled_at && new Date(quiz.scheduled_at) > now;
                            const expiry = quiz.expires_at || quiz.priority_category;
                            const isExpired = expiry && new Date(expiry) < now;
                            const attempted = isAttempted(quiz.id);
                            
                            return (
                              <button 
                                onClick={() => handleStartQuiz(quiz)}
                                disabled={attempted || isScheduled || isExpired}
                                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all group ${
                                  attempted 
                                    ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed' 
                                    : isScheduled
                                    ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                                    : isExpired
                                    ? 'bg-red-50 text-red-400 border-2 border-red-100 cursor-not-allowed'
                                    : 'bg-[#141414] text-white hover:bg-[#2a2a2a]'
                                }`}
                              >
                                {attempted ? (
                                  <>Locked <ShieldCheck size={16} /></>
                                ) : isScheduled ? (
                                  <>Not Started <Clock size={16} /></>
                                ) : isExpired ? (
                                  <>Expired <X size={16} /></>
                                ) : (
                                  <>Initiate Quiz <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                              </button>
                            );
                          })()}
                          </motion.div>
                        );
                      })}
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
              <h3 className="text-xl font-bold uppercase tracking-tight">Class Leaderboard</h3>
            </div>
            
            <div className="bg-white border-2 border-[#141414] rounded-3xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <div className="p-4 bg-gray-50 border-b-2 border-[#141414] flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Top Performers</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-100">
                  {user?.department} - {user?.section}
                </span>
              </div>
              <div className="divide-y divide-[#141414]/5">
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center opacity-30 text-xs font-bold uppercase">No data available</div>
                ) : (
                  leaderboard.slice(0, 5).map((row, i) => (
                    <div key={i} className={`p-4 flex items-center justify-between ${row.id === user?.id ? 'bg-indigo-50/50' : ''}`}>
                      <div className="flex items-center gap-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          i === 0 ? 'bg-yellow-400 text-white' :
                          i === 1 ? 'bg-gray-400 text-white' :
                          i === 2 ? 'bg-orange-400 text-white' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className={`text-sm font-bold ${row.id === user?.id ? 'text-indigo-600' : ''}`}>
                            {row.name} {row.id === user?.id && '(You)'}
                          </p>
                          <p className="text-[10px] opacity-40 font-mono">{row.registration_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm">{row.totalScore}</p>
                        <p className="text-[8px] font-bold uppercase opacity-30">Points</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="text-emerald-600" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Recent Performance</h3>
            </div>
            
            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-[#141414]/10 p-8 rounded-3xl text-center">
                  <p className="text-xs font-bold uppercase opacity-30">No attempts recorded yet</p>
                </div>
              ) : (
                results.map((res, i) => (
                  <div key={i} className="bg-white border-2 border-[#141414] p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm">{res.title}</h4>
                        <p className="text-[10px] opacity-50 uppercase tracking-widest">{new Date(res.attempt_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xl">{res.score}<span className="text-xs opacity-30">/{res.total_questions}</span></p>
                        <button 
                          onClick={() => setSelectedAttempt(res)}
                          className="text-[10px] font-bold text-indigo-600 uppercase hover:underline"
                        >
                          See Answers
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedAttempt && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-2 border-[#141414] w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[#141414]/10 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight">{selectedAttempt.title}</h3>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Score: {selectedAttempt.score}/{selectedAttempt.total_questions}</p>
                </div>
                <button 
                  onClick={() => setSelectedAttempt(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {selectedAttempt.questions?.map((q: any, idx: number) => {
                  const studentAns = selectedAttempt.responses[q.id];
                  const isCorrect = studentAns === q.correct_answer;
                  
                  return (
                    <div key={q.id} className={`p-6 rounded-2xl border-2 ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <p className="font-bold text-sm">{idx + 1}. {q.question_text}</p>
                        {isCorrect ? (
                          <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded">Correct</span>
                        ) : (
                          <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded">Incorrect</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['a', 'b', 'c', 'd'].map(opt => {
                          const optKey = `option_${opt}` as keyof Question;
                          const isCorrectOpt = opt === q.correct_answer;
                          const isStudentOpt = opt === studentAns;
                          
                          return (
                            <div 
                              key={opt}
                              className={`p-3 rounded-xl text-xs font-medium border ${
                                isCorrectOpt ? 'bg-emerald-100 border-emerald-200 text-emerald-800' :
                                isStudentOpt ? 'bg-red-100 border-red-200 text-red-800' :
                                'bg-white border-gray-100 opacity-50'
                              }`}
                            >
                              <span className="font-bold uppercase mr-2">{opt}:</span>
                              {q[optKey] as string}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
