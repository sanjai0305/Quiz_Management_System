import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Quiz, Question } from '../types';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function QuizPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [showAlreadyAttempted, setShowAlreadyAttempted] = useState(false);

  useEffect(() => {
    const checkAttemptAndFetchQuiz = async () => {
      try {
        // Check if already attempted
        const rRes = await fetch('/api/student/results', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const results = await rRes.json();
        const attempted = Array.isArray(results) && results.some((r: any) => r.quiz_id.toString() === id?.toString());
        
        if (attempted) {
          setShowAlreadyAttempted(true);
          setLoading(false);
          return;
        }

        // Fetch quiz
        const qRes = await fetch(`/api/quizzes/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!qRes.ok) throw new Error('Quiz not found');
        const data = await qRes.json();

        // Shuffle questions and options for each student session
        if (data.questions && Array.isArray(data.questions)) {
          // 1. Shuffle Questions
          const shuffledQuestions = [...data.questions];
          for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
          }

          // 2. Shuffle Options for each question
          data.questions = shuffledQuestions.map((q: any) => {
            const options = [
              { id: 'a', text: q.option_a },
              { id: 'b', text: q.option_b },
              { id: 'c', text: q.option_c },
              { id: 'd', text: q.option_d }
            ];
            
            // Shuffle the options array
            for (let i = options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [options[i], options[j]] = [options[j], options[i]];
            }

            // Find the new key for the correct answer
            const newCorrectIdx = options.findIndex(opt => opt.id === q.correct_answer);
            const newCorrectKey = ['a', 'b', 'c', 'd'][newCorrectIdx];

            return {
              ...q,
              option_a: options[0].text,
              option_b: options[1].text,
              option_c: options[2].text,
              option_d: options[3].text,
              correct_answer: newCorrectKey
            };
          });
        }

        setQuiz(data);
        
        // Base time
        let baseTime = data.time_limit * 60;
        
        // Priority Mode: Disability (50% extra time)
        if (data.priority_mode === 'disability') {
          baseTime = Math.floor(baseTime * 1.5);
        }
        
        setTimeLeft(baseTime);

        // Proctoring: Camera Access
        if (data.proctoring_enabled) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            // Wait for next tick to ensure videoRef is available
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
              }
            }, 100);
          } catch (err) {
            console.error('Camera access denied:', err);
            alert('Camera access is required for this proctored assessment.');
            navigate('/student');
          }
        }

        if (data.question_timer > 0) setQuestionTimeLeft(data.question_timer);
      } catch (err) {
        console.error(err);
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };

    if (token && id) checkAttemptAndFetchQuiz();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [id, token, navigate, cameraStream]);

  // Accessibility: Text to Speech

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResult) return;
      if (e.key === 'ArrowRight') setCurrentIdx(prev => Math.min((quiz?.questions?.length || 1) - 1, prev + 1));
      if (e.key === 'ArrowLeft') setCurrentIdx(prev => Math.max(0, prev - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, showResult]);

  // Proctoring: Tab Visibility & Focus Check
  useEffect(() => {
    const handleViolation = () => {
      if (!showResult && !isSubmitting) {
        handleSubmit(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleBlur = () => {
      handleViolation();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showResult && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [showResult, isSubmitting, quiz]);

  // Main Quiz Timer
  useEffect(() => {
    if (timeLeft > 0 && !showResult && quiz) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && quiz && !showResult) {
      handleSubmit();
    }
  }, [timeLeft, quiz, showResult]);

  // Per-Question Timer
  useEffect(() => {
    if (quiz?.question_timer && quiz.question_timer > 0 && !showResult) {
      const qTimer = setInterval(() => {
        setQuestionTimeLeft(prev => {
          if (prev <= 1) {
            // Time up for this question
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
      }, 1000);
      return () => clearInterval(qTimer);
    }
  }, [quiz, currentIdx, showResult]);

  // Reset question timer when manually changing questions
  useEffect(() => {
    if (quiz?.question_timer && quiz.question_timer > 0) {
      setQuestionTimeLeft(quiz.question_timer);
    }
  }, [currentIdx, quiz?.question_timer]);

  const handleSubmit = async (isMalpractice: any = false) => {
    if (!quiz || !quiz.questions || isSubmitting) return;
    
    // Ensure isMalpractice is a boolean (prevents issues if called directly from onClick)
    const malpracticeFlag = typeof isMalpractice === 'boolean' ? isMalpractice : false;
    
    setIsSubmitting(true);

    let correctCount = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correctCount++;
    });

    try {
      await fetch('/api/attempts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quiz_id: quiz.id,
          score: malpracticeFlag ? 0 : correctCount,
          total_questions: quiz.questions.length,
          is_malpractice: malpracticeFlag,
          responses: answers
        })
      });
      setScore(malpracticeFlag ? 0 : correctCount);
      setShowResult(true);
      if (malpracticeFlag) {
        setAlerts(prev => [...prev, "CRITICAL: Assessment terminated due to malpractice (tab switching/blur detected)."]);
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-black uppercase tracking-widest opacity-40">Loading Assessment...</p>
        </div>
      </div>
    );
  }

  if (showAlreadyAttempted) {
    return (
      <div className="min-h-screen bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#141414] w-full max-w-sm rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight">Already Attempted</h3>
            <p className="text-xs opacity-50 mt-2 font-medium leading-relaxed">
              You have already completed this assessment. Each quiz can only be taken once.
            </p>
          </div>
          <button 
            onClick={() => navigate('/student')}
            className="w-full py-4 bg-[#141414] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2a2a2a] transition-all"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (!quiz) return null;

  if (showResult) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto py-12 space-y-12">
        <div className="bg-white border-2 border-[#141414] p-12 rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] text-center space-y-8">
          <div className="flex justify-center">
            <div className="bg-emerald-100 text-emerald-600 p-6 rounded-full">
              <Send size={48} />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase">Assessment Complete</h2>
            <p className="text-sm font-medium opacity-50 uppercase tracking-widest mt-2">Your results have been logged</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-[#141414]/5">
              <p className="text-[10px] font-bold uppercase opacity-40 mb-1">Total</p>
              <p className="text-2xl font-black">{quiz.questions?.length}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Correct</p>
              <p className="text-2xl font-black text-emerald-700">{score}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
              <p className="text-[10px] font-bold uppercase text-red-600 mb-1">Wrong</p>
              <p className="text-2xl font-black text-red-700">{(quiz.questions?.length || 0) - score}</p>
            </div>
          </div>

          <div className="pt-8">
            <button 
              onClick={() => navigate('/student')}
              className="bg-[#141414] text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#2a2a2a] transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-black uppercase tracking-tight">Review Answers</h3>
          {quiz.questions?.map((q, idx) => {
            const studentAns = answers[q.id];
            const isCorrect = studentAns === q.correct_answer;
            return (
              <div key={q.id} className={`bg-white border-2 border-[#141414] p-8 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] space-y-4 ${isCorrect ? 'border-emerald-500' : 'border-red-500'}`}>
                <div className="flex justify-between items-start gap-4">
                  <h4 className="font-bold text-lg leading-tight">
                    {idx + 1}. {q.question_text}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
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
                      bgColor = 'bg-emerald-50';
                      borderColor = 'border-emerald-500';
                      textColor = 'text-emerald-700';
                    } else if (isStudentOpt && !isCorrect) {
                      bgColor = 'bg-red-50';
                      borderColor = 'border-red-500';
                      textColor = 'text-red-700';
                    }

                    return (
                      <div key={opt} className={`p-4 rounded-xl border-2 flex items-center gap-3 ${bgColor} ${borderColor} ${textColor}`}>
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold uppercase text-[10px] ${isCorrectOpt ? 'bg-emerald-200' : (isStudentOpt ? 'bg-red-200' : 'bg-gray-100')}`}>
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
      </motion.div>
    );
  }

  const currentQuestion = quiz.questions?.[currentIdx];
  const progress = ((currentIdx + 1) / (quiz.questions?.length || 1)) * 100;

  const readQuestion = () => {
    if (!currentQuestion) return;
    const utterance = new SpeechSynthesisUtterance(currentQuestion.question_text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* Proctoring Camera Preview */}
      {quiz.proctoring_enabled && cameraStream && (
        <div className="fixed bottom-6 right-6 w-48 h-36 bg-[#141414] border-4 border-indigo-500 rounded-2xl overflow-hidden shadow-2xl z-50">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover grayscale opacity-80"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            Live Proctoring
          </div>
        </div>
      )}

      <div className="space-y-8">
        <header className="sticky top-[72px] z-40 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/90 backdrop-blur-md border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] mb-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight">{quiz.title}</h2>
          <p className="text-[10px] font-bold uppercase opacity-40">{quiz.subject} • {quiz.year}{quiz.year === 1 ? 'st' : quiz.year === 2 ? 'nd' : quiz.year === 3 ? 'rd' : 'th'} Year</p>
        </div>
        
        <div className="flex items-center gap-6">
          {quiz.question_timer && quiz.question_timer > 0 && (
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all duration-300 ${
              questionTimeLeft < 5 
                ? 'bg-amber-500 border-[#141414] text-white animate-pulse' 
                : 'bg-amber-50 border-[#141414] text-amber-700 shadow-[4px_4px_0px_0px_rgba(245,158,11,0.3)]'
            }`}>
              <Clock size={20} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Question Time</span>
                <span className="font-mono font-black text-xl leading-none">{questionTimeLeft}s</span>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all duration-300 ${
            timeLeft < 60 
              ? 'bg-red-600 border-[#141414] text-white shadow-[4px_4px_0px_0px_rgba(220,38,38,0.3)] animate-pulse' 
              : 'bg-white border-[#141414] text-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]'
          }`}>
            <Clock size={24} />
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Time Remaining</span>
              <span className="font-mono font-black text-2xl leading-none">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {quiz.questions?.map((q, i) => {
              const isCurrent = i === currentIdx;
              const isAnswered = !!answers[q.id];
              return (
                <motion.div 
                  key={q.id}
                  initial={false}
                  animate={{ 
                    width: isCurrent ? 24 : 8,
                    backgroundColor: isCurrent ? '#4f46e5' : (isAnswered ? '#10b981' : '#e5e7eb')
                  }}
                  className="h-1.5 rounded-full border border-[#141414]/5"
                  title={`Question ${i + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
                />
              );
            })}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div 
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border-2 border-[#141414] p-8 md:p-12 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] space-y-10"
          >
            <div className="flex justify-between items-start gap-4">
              <h3 className={`font-black tracking-tight leading-tight ${quiz.priority_mode === 'disability' ? 'text-4xl' : 'text-3xl'}`}>
                {currentIdx + 1}. {currentQuestion.question_text}
              </h3>
              {quiz.priority_mode === 'disability' && (
                <button 
                  type="button"
                  onClick={readQuestion}
                  className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                  title="Read Question"
                >
                  <AlertCircle size={20} />
                  <span className="text-[10px] font-bold uppercase">Read</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['a', 'b', 'c', 'd'].map(opt => {
                const optKey = `option_${opt}` as keyof Question;
                const isSelected = answers[currentQuestion.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                    className={`p-6 text-left rounded-2xl border-2 transition-all flex items-center gap-4 group ${
                      isSelected 
                        ? 'bg-[#141414] border-[#141414] text-white shadow-[4px_4px_0px_0px_rgba(79,70,229,0.4)]' 
                        : 'bg-white border-[#141414]/10 hover:border-[#141414] text-[#141414]'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold uppercase transition-colors ${
                      isSelected ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      {opt}
                    </span>
                    <span className="font-bold">{currentQuestion[optKey] as string}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="flex justify-between items-center bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
        <button 
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="px-6 py-3 border-2 border-[#141414] rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all disabled:opacity-30"
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <div className="flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-widest opacity-30">
            Question {currentIdx + 1} of {quiz.questions?.length}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            {Object.keys(answers).length} Answered
          </div>
        </div>

        {currentIdx === (quiz.questions?.length || 0) - 1 ? (
          <button 
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-[4px_4px_0px_0px_rgba(5,150,105,0.3)]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'} <Send size={18} />
          </button>
        ) : (
          <button 
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="px-6 py-3 bg-[#141414] text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#2a2a2a] transition-all"
          >
            Next <ChevronRight size={18} />
          </button>
        )}
      </footer>

      {alerts.length > 0 && (
        <div className="mt-8 bg-red-50 border-2 border-red-200 p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Security Alerts</span>
          </div>
          <div className="space-y-2">
            {alerts.slice(-3).map((alert, i) => (
              <p key={i} className="text-sm text-red-700 font-bold leading-tight">• {alert}</p>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
