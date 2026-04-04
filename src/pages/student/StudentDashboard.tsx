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
  const { token, user } = useAuth();
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

  // Listen for real-time quiz updates via Firebase
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Verifying Academic Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-6">
        <div className="w-20 h-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center">
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-full h-full flex items-center justify-center">
              <BookOpen size={32} />
            </div>
          )}
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Student Portal</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Welcome back, {user?.name}</p>
            {user?.year && (
              <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-indigo-100 dark:border-indigo-800">
                {user.year}{user.year === 1 ? 'st' : user.year === 2 ? 'nd' : user.year === 3 ? 'rd' : 'th'} Year
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <BookOpen size={20} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Academic Year</h4>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Year: {user?.year || 'N/A'}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(y => (
              <div key={y} className={`h-1.5 flex-1 rounded-full ${user?.year && user.year >= y ? 'bg-amber-500' : 'bg-gray-100 dark:bg-gray-800'}`} />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <BookOpen size={20} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Department</h4>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Dept: {user?.department || 'N/A'}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{user?.department} - Section {user?.section}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <BookOpen className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Available Assessments</h3>
            </div>
            
            <div className="space-y-10">
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
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">
                        {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year Assessments
                      </h4>
                      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {yearQuizzes.map(quiz => {
                        const attempted = isAttempted(quiz.id);
                        return (
                          <motion.div 
                            key={quiz.id} 
                            whileHover={!attempted ? { y: -4 } : {}}
                            className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between transition-all ${attempted ? 'opacity-60' : ''}`}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                                  {quiz.department}
                                </span>
                                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                  Sec: {quiz.section}
                                </span>
                              </div>
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{quiz.title}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{quiz.subject}</p>
                              
                              <div className="flex flex-col gap-3 mb-6">
                                <div className="flex items-center gap-4 text-[10px] font-medium text-gray-400">
                                  <div className="flex items-center gap-1.5"><Clock size={14} /> {quiz.time_limit}m</div>
                                  <div className="flex items-center gap-1.5"><BookOpen size={14} /> MCQs</div>
                                </div>
                                {(() => {
                                  const expiry = quiz.expires_at || quiz.priority_category;
                                  const isExpired = expiry && new Date(expiry) < now;
                                  return expiry && !attempted && (
                                    <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isExpired ? 'text-red-500' : 'text-amber-500'}`}>
                                      <AlertCircle size={12} />
                                      {isExpired ? 'Expired' : `Ends: ${new Date(expiry).toLocaleString()}`}
                                    </div>
                                  );
                                })()}
                                {attempted && (
                                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800 w-fit">
                                    <ShieldCheck size={14} />
                                    Attempt Locked
                                  </div>
                                )}
                                {quiz.scheduled_at && !attempted && (
                                <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${new Date(quiz.scheduled_at) > now ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
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
                                className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all group ${
                                  attempted 
                                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
                                    : isScheduled
                                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    : isExpired
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20'
                                }`}
                              >
                                {attempted ? (
                                  <>Locked <ShieldCheck size={14} /></>
                                ) : isScheduled ? (
                                  <>Not Started <Clock size={14} /></>
                                ) : isExpired ? (
                                  <>Expired <X size={14} /></>
                                ) : (
                                  <>Start Quiz <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <Trophy className="text-amber-600 dark:text-amber-400 w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Leaderboard</h3>
              </div>
              <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                {user?.department}
              </span>
            </div>
            
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none">
              {/* Top 3 Podium Style */}
              {leaderboard.length >= 3 && (
                <div className="p-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-end justify-center gap-4 sm:gap-8 pt-4 pb-2">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center gap-3 order-1">
                      <div className="relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-gray-500">
                          {leaderboard[1].name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-gray-300 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-700">2</div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate max-w-[80px]">{leaderboard[1].name}</p>
                        <p className="text-[8px] font-bold text-gray-400">{leaderboard[1].totalScore} pts</p>
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center gap-3 order-2 -translate-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 border-4 border-amber-400 flex items-center justify-center text-2xl font-bold text-amber-600">
                          {leaderboard[0].name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                          <Trophy size={14} />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{leaderboard[0].name}</p>
                        <p className="text-[10px] font-bold text-amber-600">{leaderboard[0].totalScore} pts</p>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center gap-3 order-3">
                      <div className="relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-300 dark:border-orange-800 flex items-center justify-center text-xl font-bold text-orange-600">
                          {leaderboard[2].name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-orange-400 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-white">3</div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate max-w-[80px]">{leaderboard[2].name}</p>
                        <p className="text-[8px] font-bold text-gray-400">{leaderboard[2].totalScore} pts</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {leaderboard.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="text-gray-300 w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No rankings yet</p>
                  </div>
                ) : (
                  leaderboard.slice(3, 8).map((row, i) => (
                    <div key={i} className={`p-4 sm:p-5 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${row.id === user?.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200 dark:border-gray-700">
                          {i + 4}
                        </span>
                        <div>
                          <p className={`text-sm font-bold ${row.id === user?.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                            {row.name} {row.id === user?.id && '(You)'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium tracking-tight">{row.registration_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{row.totalScore}</p>
                          <p className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">Points</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* User's Rank Footer if not in top 8 */}
              {user && !leaderboard.slice(0, 8).some(r => r.id === user.id) && (
                <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-xs font-bold">
                      ?
                    </div>
                    <div>
                      <p className="text-sm font-bold">Your Ranking</p>
                      <p className="text-[10px] opacity-70">Keep participating to climb up!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{results.reduce((acc, r) => acc + r.score, 0)}</p>
                    <p className="text-[8px] font-bold uppercase opacity-70">Total Points</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Trophy className="text-emerald-600 dark:text-emerald-400 w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Performance</h3>
            </div>
            
            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-2xl text-center">
                  <p className="text-xs font-bold uppercase text-gray-400">No attempts recorded yet</p>
                </div>
              ) : (
                results.map((res, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{res.title}</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{new Date(res.attempt_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-gray-900 dark:text-white">{res.score}<span className="text-xs text-gray-400">/{res.total_questions}</span></p>
                        <button 
                          onClick={() => setSelectedAttempt(res)}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase hover:underline"
                        >
                          Review
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
          <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedAttempt.title}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Score: {selectedAttempt.score}/{selectedAttempt.total_questions}</p>
                </div>
                <button 
                  onClick={() => setSelectedAttempt(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {selectedAttempt.questions?.map((q: any, idx: number) => {
                  const studentAns = selectedAttempt.responses[q.id];
                  const isCorrect = studentAns === q.correct_answer;
                  
                  return (
                    <div key={q.id} className={`p-6 rounded-2xl border ${isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'}`}>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{idx + 1}. {q.question_text}</p>
                        {isCorrect ? (
                          <span className="bg-emerald-500 text-white text-[8px] font-bold uppercase px-2 py-1 rounded-md">Correct</span>
                        ) : (
                          <span className="bg-red-500 text-white text-[8px] font-bold uppercase px-2 py-1 rounded-md">Incorrect</span>
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
                              className={`p-3 rounded-xl text-xs font-medium border transition-colors ${
                                isCorrectOpt ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400' :
                                isStudentOpt ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400' :
                                'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
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
