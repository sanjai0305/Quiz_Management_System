import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../../App';
import { Quiz, Question } from '../../shared/types';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2, ShieldCheck, Shield, Camera, UserCheck, Layout, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import emailjs from '@emailjs/browser';
import { supabase } from '../../shared/lib/supabase';

export default function QuizPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<'loading' | 'instructions' | 'quiz' | 'result'>('loading');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isTtsEnabled] = useState(() => localStorage.getItem('pref_tts') === 'true');

  const speak = useCallback((text: string) => {
    if (!isTtsEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [isTtsEnabled]);

  const [showAlreadyAttempted, setShowAlreadyAttempted] = useState(false);

  // Priority-based styling class
  const priorityClass = user?.priority_type === 'child' ? 'priority-children' : 
                       user?.priority_type === 'disability' ? 'priority-disability' : 
                       'priority-normal';

  const currentQuestion = quiz?.questions?.[currentIdx];
  useEffect(() => {
    if (stage === 'quiz' && currentQuestion) {
      speak(`Question ${currentIdx + 1}: ${currentQuestion.question_text}`);
    }
  }, [currentIdx, stage, currentQuestion, speak]);

  useEffect(() => {
    const checkAttemptAndFetchQuiz = async () => {
      if (!user || !id) return;
      try {
        const { data: attempts, error: aError } = await supabase
          .from('attempts')
          .select('*')
          .eq('quiz_id', id)
          .eq('student_id', user.id);
        
        if (aError) throw aError;
        
        if (attempts && attempts.length > 0) {
          setShowAlreadyAttempted(true);
          setLoading(false);
          return;
        }

        const { data: quizData, error: qError } = await supabase
          .from('quizzes')
          .select(`
            *,
            questions (*)
          `)
          .eq('id', id)
          .single();
        
        if (qError) throw qError;
        if (!quizData) throw new Error('Quiz not found');

        if (quizData.scheduled_at && new Date(quizData.scheduled_at) > new Date()) {
          alert(`This quiz is scheduled to start at ${new Date(quizData.scheduled_at).toLocaleString()}`);
          navigate('/');
          return;
        }

        if (quizData.questions && Array.isArray(quizData.questions)) {
          const shuffledQuestions = [...quizData.questions];
          for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
          }

          quizData.questions = shuffledQuestions.map((q: any) => {
            const options = [
              { id: 'a', text: q.option_a },
              { id: 'b', text: q.option_b },
              { id: 'c', text: q.option_c },
              { id: 'd', text: q.option_d }
            ];
            
            for (let i = options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [options[i], options[j]] = [options[j], options[i]];
            }

            return {
              ...q,
              option_a: options[0].text,
              option_b: options[1].text,
              option_c: options[2].text,
              option_d: options[3].text,
              option_mapping: {
                a: options[0].id,
                b: options[1].id,
                c: options[2].id,
                d: options[3].id
              }
            };
          });
        }

        setQuiz(quizData);
        
        // Priority-based time adjustment
        let timeMultiplier = 1;
        if (user.priority_type === 'child') timeMultiplier = 1.5;
        if (user.priority_type === 'disability') timeMultiplier = 2;
        if (user.priority_type === 'senior') timeMultiplier = 1.25;

        let initialTime = Math.floor(quizData.time_limit * 60 * timeMultiplier);
        setTimeLeft(initialTime);

        const expiry = quizData.expires_at || quizData.priority_category;
        if (expiry && new Date(expiry) < new Date()) {
          alert('This quiz has expired and is no longer available.');
          navigate('/');
          return;
        }

        if (quizData.question_timer > 0) {
          setQuestionTimeLeft(Math.floor(quizData.question_timer * timeMultiplier));
        }
        
        setStage('instructions');
      } catch (err) {
        console.error(err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (id && user) checkAttemptAndFetchQuiz();
  }, [id, user, navigate]);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const handleSubmit = useCallback(async () => {
    if (!quiz || !quiz.questions || isSubmitting || !user) return;
    
    setIsSubmitting(true);

    let correctCount = 0;
    quiz.questions.forEach((q: any) => {
      if (answersRef.current[q.id] === q.correct_answer) correctCount++;
    });

    try {
      const { data: attempt, error: aError } = await supabase
        .from('attempts')
        .insert([{
          student_id: user.id,
          quiz_id: quiz.id,
          score: correctCount,
          total_questions: quiz.questions.length,
          responses: answersRef.current,
          attempt_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (aError) throw aError;

      const { data: studentsInGroup, error: sError } = await supabase
        .from('students')
        .select('id')
        .eq('year', user.year)
        .eq('department', user.department)
        .eq('section', user.section);
      
      if (sError) throw sError;

      const { data: attemptsForQuiz, error: atError } = await supabase
        .from('attempts')
        .select('student_id')
        .eq('quiz_id', quiz.id);
      
      if (atError) throw atError;

      const studentIdsInGroup = studentsInGroup.map(s => s.id);
      const attemptedStudentIds = attemptsForQuiz.map(a => a.student_id);
      const allCompleted = studentIdsInGroup.every(id => attemptedStudentIds.includes(id));

      if (allCompleted) {
        const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
        const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;
        
        const adminEmail = (quiz as any).admin_email || (import.meta as any).env.VITE_ADMIN_EMAIL;

        if (serviceId && templateId && publicKey && adminEmail) {
          const templateParams = {
            admin_email: adminEmail,
            quiz_title: quiz.title,
            completed_group: `${user.year}yr ${user.department} Sec ${user.section}`,
            message: `All students in ${user.year}yr ${user.department} Sec ${user.section} have completed the quiz: ${quiz.title}.`,
            date: new Date().toLocaleString()
          };

          try {
            await emailjs.send(serviceId, templateId, templateParams, publicKey);
          } catch (err) {
            console.error('Failed to send class completion email:', err);
          }
        }
      }

      setScore(correctCount);
      setShowResult(true);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, user, isSubmitting]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResult) return;
      if (e.key === 'ArrowRight') setCurrentIdx(prev => Math.min((quiz?.questions?.length || 1) - 1, prev + 1));
      if (e.key === 'ArrowLeft') setCurrentIdx(prev => Math.max(0, prev - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, showResult]);

  useEffect(() => {
    if (quiz?.question_timer && quiz.question_timer > 0) {
      setQuestionTimeLeft(quiz.question_timer);
    }
  }, [currentIdx, quiz?.question_timer]);

  useEffect(() => {
    if (showResult || loading || showAlreadyAttempted || !quiz || stage !== 'quiz') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });

      if (quiz.question_timer && quiz.question_timer > 0) {
        setQuestionTimeLeft(prev => {
          if (prev <= 1) {
            if (currentIdx < (quiz.questions?.length || 0) - 1) {
              setCurrentIdx(c => c + 1);
              return quiz.question_timer || 0;
            } else {
              handleSubmit();
              return 0;
            }
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [showResult, loading, showAlreadyAttempted, quiz, currentIdx, handleSubmit, stage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Assessment...</p>
        </div>
      </div>
    );
  }

  if (showAlreadyAttempted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-3xl p-10 text-center space-y-8 shadow-xl"
        >
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-800/50">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Already Attempted</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Our records show that you have already completed this assessment. 
              Multiple attempts are not permitted for this quiz.
            </p>
          </div>
          <div className="pt-4">
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (stage === 'instructions') {
    return (
      <div className="min-h-screen bg-gray-900 dark:bg-black p-8 flex items-center justify-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 shadow-2xl p-8 max-w-2xl w-full space-y-8 rounded-3xl ${priorityClass}`}>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{quiz?.title}</h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{quiz?.subject}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-4">
              <h3 className="font-bold uppercase text-xs tracking-widest text-gray-400">Quiz Rules</h3>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2"><Clock size={16} className="text-gray-400" /> Total Time: {Math.floor(timeLeft / 60)} minutes</li>
                {quiz?.question_timer && quiz.question_timer > 0 && <li className="flex items-center gap-2"><Clock size={16} className="text-gray-400" /> Per Question: {quiz.question_timer} seconds</li>}
              </ul>
            </div>

            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl space-y-4">
              <h3 className="font-bold uppercase text-xs tracking-widest text-indigo-400">Your Status</h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Student: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user?.name}</span></p>
                {user?.priority_type && user.priority_type !== 'normal' && (
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-200 dark:border-amber-800/50">
                      {user.priority_type} Category
                    </span>
                    <span className="text-[10px] text-gray-400 italic">Extra time applied</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setStage('quiz')}
            className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity"
          >
            Start Quiz Now
          </button>
        </motion.div>
      </div>
    );
  }

  if (!quiz) return null;

  if (showResult) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto py-12 space-y-12 px-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12 rounded-[2.5rem] shadow-2xl text-center space-y-8">
          <div className="flex justify-center">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-6 rounded-3xl">
              <Send size={48} />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Assessment Complete</h2>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-2">Your results have been logged</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Total Questions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{quiz.questions?.length}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
              <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Correct Answers</p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{score}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100 dark:border-red-800/50">
              <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 mb-1">Wrong Answers</p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-400">{(quiz.questions?.length || 0) - score}</p>
            </div>
          </div>

          <div className="pt-8">
            <button 
              onClick={() => navigate('/')}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-12 py-4 rounded-2xl font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Return to Dashboard
            </button>
          </div>

          <div className="mt-12 text-left space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <Layout className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Review Answers</h3>
            </div>
            
            <div className="space-y-6">
              {quiz.questions?.map((q: any, idx: number) => {
                const studentAns = answers[q.id];
                const isCorrect = studentAns === q.correct_answer;
                return (
                  <div key={q.id} className={`p-6 rounded-3xl border ${isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'}`}>
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <p className="font-bold text-gray-900 dark:text-white">{idx + 1}. {q.question_text}</p>
                      {isCorrect ? (
                        <span className="bg-emerald-500 text-white text-[8px] font-bold uppercase px-2 py-1 rounded-md">Correct</span>
                      ) : (
                        <span className="bg-red-500 text-white text-[8px] font-bold uppercase px-2 py-1 rounded-md">Incorrect</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {['a', 'b', 'c', 'd'].map(opt => {
                        const optKey = `option_${opt}` as keyof Question;
                        const originalKey = q.option_mapping?.[opt] || opt;
                        const isCorrectOpt = originalKey === q.correct_answer;
                        const isStudentOpt = originalKey === studentAns;
                        return (
                          <div key={opt} className={`p-3 rounded-xl text-xs font-medium border transition-colors ${
                            isCorrectOpt ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400' :
                            isStudentOpt ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400' :
                            'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                          }`}>
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
          </div>
        </div>
      </motion.div>
    );
  }

  const progress = ((currentIdx + 1) / (quiz.questions?.length || 1)) * 100;

  return (
    <div className={`max-w-6xl mx-auto relative px-3 sm:px-4 ${priorityClass}`}>
      <div className="space-y-6 sm:space-y-8 py-6 sm:py-8">
        <header className="sticky top-4 z-40 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg mb-4">
          <div className="text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight line-clamp-1">{quiz.title}</h2>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 tracking-wider">{quiz.subject} • {quiz.year}{quiz.year === 1 ? 'st' : quiz.year === 2 ? 'nd' : quiz.year === 3 ? 'rd' : 'th'} Year</p>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            {quiz.question_timer && quiz.question_timer > 0 && (
              <div className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                questionTimeLeft < 5 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 animate-pulse' 
                  : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50 text-amber-600 dark:text-amber-400'
              }`}>
                <Clock size={16} className="sm:w-5 sm:h-5" />
                <div className="flex flex-col">
                  <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest opacity-60">Q-Time</span>
                  <span className="font-mono font-bold text-sm sm:text-lg leading-none">{questionTimeLeft}s</span>
                </div>
              </div>
            )}
            <div className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
              timeLeft < 60 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 animate-pulse' 
                : 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400'
            }`}>
              <Clock size={16} className="sm:w-5 sm:h-5" />
              <div className="flex flex-col">
                <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest opacity-60">Total Time</span>
                <span className="font-mono font-bold text-sm sm:text-lg leading-none">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        </header>

      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div 
            key={currentIdx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-[2.5rem] shadow-xl space-y-6 sm:space-y-10"
          >
            <div className="flex justify-between items-start gap-4">
              <h3 className="font-bold tracking-tight leading-tight text-xl sm:text-3xl text-gray-900 dark:text-white">
                {currentIdx + 1}. {currentQuestion.question_text}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {['a', 'b', 'c', 'd'].map(opt => {
                const optKey = `option_${opt}` as keyof Question;
                const originalKey = currentQuestion.option_mapping?.[opt] || opt;
                const isSelected = answers[currentQuestion.id] === originalKey;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswers({ ...answers, [currentQuestion.id]: originalKey })}
                    className={`p-4 sm:p-6 text-left rounded-xl sm:rounded-2xl border transition-all flex items-center gap-3 sm:gap-4 group ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 text-gray-900 dark:text-white'
                    }`}
                  >
                    <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-base font-bold uppercase transition-colors ${
                      isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                    }`}>
                      {opt}
                    </span>
                    <span className="font-bold text-sm sm:text-base">{currentQuestion[optKey] as string}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg">
        <button 
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="px-3 py-2 sm:px-6 sm:py-3 border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1 sm:gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-30 text-gray-700 dark:text-gray-300"
        >
          <ChevronLeft size={14} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="text-[8px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">
            Q {currentIdx + 1} of {quiz.questions?.length}
          </div>
          <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {Object.keys(answers).length} Answered
          </div>
        </div>

        {currentIdx === (quiz.questions?.length || 0) - 1 ? (
          <button 
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="px-4 py-2 sm:px-8 sm:py-3 bg-emerald-600 text-white rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1 sm:gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            {isSubmitting ? '...' : 'Submit'} <Send size={14} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        ) : (
          <button 
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1 sm:gap-2 hover:opacity-90 transition-all"
          >
            Next <ChevronRight size={14} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        )}
      </footer>
      </div>
    </div>
  );
}
