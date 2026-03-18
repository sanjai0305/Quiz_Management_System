import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Quiz, Attempt, Question } from '../types';
import { BookOpen, Trophy, Clock, ChevronRight, ShieldCheck, X, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface ResultModalProps {
  attempt: Attempt;
  onClose: () => void;
}

const ResultModal = ({ attempt, onClose }: ResultModalProps) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${attempt.quiz_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setQuiz(data);
      } catch (err) {
        console.error('Failed to fetch quiz details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [attempt.quiz_id, token]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white border-4 border-[#141414] w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] flex flex-col"
      >
        <div className="p-6 border-b-4 border-[#141414] flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight">{attempt.quiz_name}</h3>
            <p className="text-[10px] font-bold uppercase opacity-40">Attempted on {new Date(attempt.attempt_date).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Loading Results...</p>
            </div>
          ) : quiz ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-6 rounded-3xl border-2 border-[#141414]">
                  <p className="text-[10px] font-bold uppercase opacity-40 mb-1 text-center">Total</p>
                  <p className="text-3xl font-black text-center">{attempt.total_questions}</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-500">
                  <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1 text-center">Score</p>
                  <p className="text-3xl font-black text-emerald-700 text-center">{attempt.score}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-500">
                  <p className="text-[10px] font-bold uppercase text-red-600 mb-1 text-center">Wrong</p>
                  <p className="text-3xl font-black text-red-700 text-center">{attempt.total_questions - attempt.score}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xl font-black uppercase tracking-tight">Question Review</h4>
                {quiz.questions?.map((q, idx) => {
                  const studentAns = attempt.responses?.[q.id];
                  const isCorrect = studentAns === q.correct_answer;
                  return (
                    <div key={q.id} className={`p-6 rounded-3xl border-2 border-[#141414] space-y-4 ${isCorrect ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <h5 className="font-bold text-lg leading-tight">
                          {idx + 1}. {q.question_text}
                        </h5>
                        <div className="flex items-center gap-2">
                          {isCorrect ? <CheckCircle2 className="text-emerald-600" size={20} /> : <XCircle className="text-red-600" size={20} />}
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['a', 'b', 'c', 'd'].map(opt => {
                          const optKey = `option_${opt}` as keyof Question;
                          const isCorrectOpt = q.correct_answer === opt;
                          const isStudentOpt = studentAns === opt;
                          
                          let bgColor = 'bg-white';
                          let borderColor = 'border-[#141414]/10';
                          let textColor = 'text-[#141414]';

                          if (isCorrectOpt) {
                            bgColor = 'bg-emerald-100';
                            borderColor = 'border-emerald-500';
                            textColor = 'text-emerald-700';
                          } else if (isStudentOpt && !isCorrect) {
                            bgColor = 'bg-red-100';
                            borderColor = 'border-red-500';
                            textColor = 'text-red-700';
                          }

                          return (
                            <div key={opt} className={`p-4 rounded-xl border-2 flex items-center gap-3 ${bgColor} ${borderColor} ${textColor}`}>
                              <span className={`w-6 h-6 rounded flex items-center justify-center font-bold uppercase text-[10px] ${isCorrectOpt ? 'bg-emerald-300' : (isStudentOpt ? 'bg-red-300' : 'bg-gray-100')}`}>
                                {opt}
                              </span>
                              <span className="text-sm font-bold">{q[optKey] as string}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20 opacity-40 font-bold uppercase">Quiz data no longer available</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function StudentDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Attempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, rRes, lRes] = await Promise.all([
        fetch('/api/quizzes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/student/results', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/leaderboard', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const qData = await qRes.json();
      const rData = await rRes.json();
      const lData = await lRes.json();
      
      setQuizzes(Array.isArray(qData) ? qData : []);
      setResults(Array.isArray(rData) ? rData : []);
      setLeaderboard(Array.isArray(lData) ? lData : []);
      
      console.log('Dashboard Data Loaded:', {
        quizzesCount: Array.isArray(qData) ? qData.length : 0,
        resultsCount: Array.isArray(rData) ? rData.length : 0,
        results: rData
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const isAttempted = (quizId: number | string) => {
    if (!Array.isArray(results)) return false;
    const attempted = results.some(r => {
      const match = r.quiz_id.toString() === quizId.toString();
      return match;
    });
    return attempted;
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
                            disabled={isAttempted(quiz.id)}
                            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all group ${
                              isAttempted(quiz.id) 
                                ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100 cursor-not-allowed' 
                                : 'bg-[#141414] text-white hover:bg-[#2a2a2a]'
                            }`}
                          >
                            {isAttempted(quiz.id) ? (
                              <>Completed <ShieldCheck size={16} /></>
                            ) : (
                              <>Initiate Quiz <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
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
              {leaderboard.length > 5 && (
                <div className="p-3 bg-gray-50 text-center border-t border-[#141414]/5">
                  <p className="text-[8px] font-bold uppercase opacity-40">Showing top 5 of {leaderboard.length} students</p>
                </div>
              )}
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
                        {res.is_malpractice ? (
                          <p className="text-[10px] font-bold text-red-600 uppercase">Malpractice</p>
                        ) : (
                          <p className="text-[10px] font-bold text-emerald-600 uppercase">Completed</p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedAttempt(res)}
                      className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-[#141414]/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      See Answers
                    </button>
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

      <AnimatePresence>
        {selectedAttempt && (
          <ResultModal 
            attempt={selectedAttempt} 
            onClose={() => setSelectedAttempt(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
