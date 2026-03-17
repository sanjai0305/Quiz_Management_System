import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Quiz, Question } from '../types';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, Accessibility, Volume2, ShieldCheck, Camera, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function QuizPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  // Accessibility: Text to Speech
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Security: Tab Switch Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !showResult) {
        alert('Security Alert: Tab switching is prohibited during the quiz. This incident will be reported.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showResult]);

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

  useEffect(() => {
    fetch(`/api/quizzes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(data => {
      // Shuffle questions and options for each student session
      if (data.questions && Array.isArray(data.questions)) {
        // 1. Shuffle Questions
        const shuffledQuestions = [...data.questions];
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
        }

        // 2. Shuffle Options for each question
        data.questions = shuffledQuestions.map(q => {
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
      setTimeLeft(data.time_limit * 60);
    });
  }, [id, token]);

  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !showResult && isVerified) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && quiz && !showResult && isVerified) {
      handleSubmit();
    }
  }, [timeLeft, quiz, showResult, isVerified]);

  const handleSubmit = async () => {
    if (!quiz || !quiz.questions) return;
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
          score: correctCount,
          total_questions: quiz.questions.length
        })
      });
      setScore(correctCount);
      setShowResult(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!quiz) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-[#141414] border-t-transparent rounded-full animate-spin" /></div>;

  if (!isVerified) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-[#141414] p-12 rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] space-y-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-amber-100 text-amber-600 p-4 rounded-2xl">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Safety Verification</h2>
              <p className="text-[10px] font-bold uppercase opacity-40">Identity & Environment Check</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-[#141414]/5">
              <Camera className="text-indigo-600 mt-1" size={20} />
              <div>
                <p className="text-xs font-bold uppercase mb-1">Camera Facility</p>
                <p className="text-[10px] opacity-60 leading-relaxed">Your camera will be active throughout the session for proctoring. Ensure you are in a well-lit area.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-[#141414]/5">
              <Lock className="text-indigo-600 mt-1" size={20} />
              <div>
                <p className="text-xs font-bold uppercase mb-1">OS Security</p>
                <p className="text-[10px] opacity-60 leading-relaxed">System integrity check completed. Browser environment is locked for this assessment.</p>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={() => setIsVerified(true)}
              className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#2a2a2a] transition-all flex items-center justify-center gap-3"
            >
              Confirm & Start Assessment <ChevronRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showResult) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto py-12">
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
      </motion.div>
    );
  }

  const currentQuestion = quiz.questions?.[currentIdx];
  const progress = ((currentIdx + 1) / (quiz.questions?.length || 1)) * 100;

  const fontSizeClass = 'text-xl';

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3 space-y-8">
        <header className="sticky top-[72px] z-40 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/90 backdrop-blur-md border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] mb-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight">{quiz.title}</h2>
          <p className="text-[10px] font-bold uppercase opacity-40">{quiz.subject} • {quiz.year}{quiz.year === 1 ? 'st' : quiz.year === 2 ? 'nd' : quiz.year === 3 ? 'rd' : 'th'} Year</p>
        </div>
        
        <div className="flex items-center gap-6">
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
              <h3 className={`font-bold leading-tight ${fontSizeClass}`}>
                {currentIdx + 1}. {currentQuestion.question_text}
              </h3>
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
            onClick={handleSubmit}
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

      </div>

      <aside className="space-y-6">
        <div className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Live Monitoring</h4>
          </div>
          <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden relative border border-[#141414]/10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertCircle size={24} className="text-white/30" />
                </div>
                <p className="text-[8px] font-bold uppercase text-white/40">Camera Active</p>
              </div>
            </div>
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">
              REC
            </div>
            <div className="absolute bottom-2 right-2 text-white/50 text-[8px] font-mono">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
          <p className="text-[9px] font-bold uppercase opacity-30 mt-4 text-center leading-relaxed">
            AI-Powered Proctoring in Progress. Maintain focus on the screen.
          </p>
        </div>

        <div className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-4">System Security</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase opacity-40">OS Integrity</span>
              <span className="text-[9px] font-bold uppercase text-emerald-600">Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase opacity-40">Network</span>
              <span className="text-[9px] font-bold uppercase text-emerald-600">Encrypted</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase opacity-40">Browser Lock</span>
              <span className="text-[9px] font-bold uppercase text-emerald-600">Active</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
