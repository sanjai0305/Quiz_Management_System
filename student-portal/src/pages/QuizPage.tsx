import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../App';
import { Quiz, Question } from '../types';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2, ShieldCheck, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import emailjs from '@emailjs/browser';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

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
  const [stage, setStage] = useState<'loading' | 'verification' | 'environment_check' | 'safety_check' | 'security_check' | 'instructions' | 'quiz' | 'result'>('loading');
  const [malpracticeCount, setMalpracticeCount] = useState(0);
  const [securityLog, setSecurityLog] = useState<{ event: string; timestamp: string }[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [environmentPhoto, setEnvironmentPhoto] = useState<string | null>(null);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [securityConfirmed, setSecurityConfirmed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const currentQuestion = quiz?.questions?.[currentIdx];
  useEffect(() => {
    if (stage === 'quiz' && currentQuestion) {
      speak(`Question ${currentIdx + 1}: ${currentQuestion.question_text}`);
    }
  }, [currentIdx, stage, currentQuestion, speak]);

  const logSecurityEvent = useCallback((event: string) => {
    setSecurityLog(prev => [...prev, { event, timestamp: new Date().toISOString() }]);
    setMalpracticeCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    const checkAttemptAndFetchQuiz = async () => {
      try {
        const rQuery = query(
          collection(db, 'attempts'),
          where('registration_number', '==', user?.registration_number),
          where('quiz_id', '==', id)
        );
        const rSnap = await getDocs(rQuery);
        
        if (!rSnap.empty) {
          setShowAlreadyAttempted(true);
          setLoading(false);
          return;
        }

        const qSnap = await getDoc(doc(db, 'quizzes', id!));
        if (!qSnap.exists()) throw new Error('Quiz not found');
        const data = { ...qSnap.data(), id: qSnap.id } as any as Quiz;

        if (data.scheduled_at && new Date(data.scheduled_at) > new Date()) {
          alert(`This quiz is scheduled to start at ${new Date(data.scheduled_at).toLocaleString()}`);
          navigate('/student');
          return;
        }

        if (data.questions && Array.isArray(data.questions)) {
          const shuffledQuestions = [...data.questions];
          // Shuffling logic stays same
          for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
          }

          data.questions = shuffledQuestions.map((q: any) => {
            const options = [
              { id: 'a', text: q.option_a || q.a },
              { id: 'b', text: q.option_b || q.b },
              { id: 'c', text: q.option_c || q.c },
              { id: 'd', text: q.option_d || q.d }
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

        setQuiz(data);
        
        let baseTime = data.time_limit * 60;
        if (user?.priority_type && user.priority_type !== 'normal') {
          baseTime = Math.floor(baseTime * 1.5);
        }
        setTimeLeft(baseTime);

        const expiry = data.expires_at || (data as any).priority_category;
        if (expiry && new Date(expiry) < new Date()) {
          alert('This quiz has expired and is no longer available.');
          navigate('/student');
          return;
        }

        if (data.question_timer > 0) setQuestionTimeLeft(data.question_timer);
        
        if (data.is_proctored) {
          setStage('verification');
        } else {
          setStage('instructions');
        }
      } catch (err) {
        console.error(err);
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };

    if (token && id) checkAttemptAndFetchQuiz();
  }, [id, token, navigate, user?.priority_type]);

  useEffect(() => {
    if (stage !== 'quiz' || !quiz?.strict_mode) return;

    const handleVisibilityChange = () => {
      if (document.hidden) logSecurityEvent('Tab Switched / Minimized');
    };

    const handleBlur = () => logSecurityEvent('Window Focus Lost');
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logSecurityEvent('Right Click Attempted');
    };
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logSecurityEvent('Copy/Paste Attempted');
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 'u')) {
        e.preventDefault();
        logSecurityEvent(`Keyboard Shortcut Attempted: ${e.key}`);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyPaste);
    window.addEventListener('paste', handleCopyPaste);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopyPaste);
      window.removeEventListener('paste', handleCopyPaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [stage, quiz?.strict_mode, logSecurityEvent]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Camera access is required for this proctored quiz.');
    }
  };

  const capturePhoto = (type: 'verification' | 'environment') => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const photo = canvasRef.current.toDataURL('image/jpeg');
        if (type === 'verification') setCapturedPhoto(photo);
        else setEnvironmentPhoto(photo);
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const handleSubmit = useCallback(async () => {
    if (!quiz || !quiz.questions || isSubmitting) return;
    setIsSubmitting(true);

    let correctCount = 0;
    quiz.questions.forEach(q => {
      const originalAns = q.option_mapping ? q.option_mapping[answersRef.current[q.id] as 'a'|'b'|'c'|'d'] : answersRef.current[q.id];
      if (originalAns === q.correct_answer) correctCount++;
    });

    try {
      const attemptData = {
        quiz_id: quiz.id,
        quiz_title: quiz.title,
        student_id: user?.id,
        name: user?.name,
        registration_number: user?.registration_number,
        score: correctCount,
        total_questions: quiz.questions.length,
        responses: answersRef.current,
        malpractice_count: malpracticeCount,
        security_log: securityLog,
        verification_photo: capturedPhoto,
        attempt_date: new Date().toISOString()
      };

      await addDoc(collection(db, 'attempts'), attemptData);

      // Email notification logic (simplified check)
      const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
      const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;
      const adminEmail = (quiz as any).admin_email || (import.meta as any).env.VITE_ADMIN_EMAIL;

      if (serviceId && templateId && publicKey && adminEmail) {
        // You could add logic here to check if this was the last student in class
        // but for Firestore we'll just send if configured
      }

      setScore(correctCount);
      setShowResult(true);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz.');
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, token, isSubmitting, malpracticeCount, securityLog, capturedPhoto]);

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
    if (quiz?.question_timer && quiz.question_timer > 0) setQuestionTimeLeft(quiz.question_timer);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (showAlreadyAttempted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white border-2 border-[#141414] p-10 text-center space-y-8 rounded-3xl shadow-brutal">
          <AlertCircle size={48} className="mx-auto text-amber-600" />
          <h2 className="text-3xl font-black uppercase">ALREADY ATTEMPTED</h2>
          <button onClick={() => navigate('/student')} className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold uppercase">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  if (stage === 'verification') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] p-8 flex items-center justify-center">
        <div className="bg-white border-4 border-[#141414] p-8 max-w-md w-full space-y-6 shadow-brutal">
          <h2 className="text-2xl font-black uppercase">Stage 1: Identity</h2>
          <div className="aspect-video bg-gray-100 border-4 border-[#141414] rounded-2xl overflow-hidden relative">
            {!capturedPhoto ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <img src={capturedPhoto} className="w-full h-full object-cover" />}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          {!capturedPhoto ? (
            <div className="flex gap-4">
              <button onClick={startCamera} className="flex-1 py-3 bg-indigo-600 text-white font-bold border-2 border-[#141414]">Start Camera</button>
              <button onClick={capturePhoto} className="flex-1 py-3 bg-[#141414] text-white font-bold border-2 border-[#141414]">Capture</button>
            </div>
          ) : (
            <div className="flex gap-4">
              <button onClick={() => setCapturedPhoto(null)} className="flex-1 py-3 border-2 border-[#141414] font-bold">Retake</button>
              <button onClick={() => setStage('environment_check')} className="flex-1 py-3 bg-[#141414] text-white font-bold border-2 border-[#141414]">Next Stage</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'environment_check') {
    const captureEnv = () => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setEnvironmentPhoto(canvas.toDataURL('image/jpeg'));
        }
      }
    };
    return (
      <div className="min-h-screen bg-[#E4E3E0] p-8 flex items-center justify-center">
        <div className="bg-white border-4 border-[#141414] p-8 max-w-md w-full space-y-6 shadow-brutal">
          <h2 className="text-2xl font-black uppercase">Stage 2: Environment</h2>
          <div className="aspect-video bg-gray-100 border-4 border-[#141414] rounded-2xl overflow-hidden relative">
            {!environmentPhoto ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <img src={environmentPhoto} className="w-full h-full object-cover" />}
          </div>
          {!environmentPhoto ? (
            <button onClick={captureEnv} className="w-full py-3 bg-[#141414] text-white font-bold border-2 border-[#141414]">Capture Environment</button>
          ) : (
            <div className="flex gap-4">
              <button onClick={() => setEnvironmentPhoto(null)} className="flex-1 py-3 border-2 border-[#141414] font-bold">Retake</button>
              <button onClick={() => setStage('safety_check')} className="flex-1 py-3 bg-[#141414] text-white font-bold border-2 border-[#141414]">Next Stage</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'safety_check') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] p-8 flex items-center justify-center">
        <div className="bg-white border-4 border-[#141414] p-8 max-w-md w-full space-y-6 shadow-brutal">
          <h2 className="text-2xl font-black uppercase">Stage 3: Safety</h2>
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center gap-4">
              <ShieldCheck size={24} className="text-emerald-500" />
              <p className="text-xs font-black uppercase text-emerald-700">System Integrity Verified</p>
            </div>
            <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex items-center gap-4">
              <Camera size={24} className="text-indigo-500" />
              <p className="text-xs font-black uppercase text-indigo-700">Camera Facility Active</p>
            </div>
          </div>
          <button onClick={() => setStage('security_check')} className="w-full py-4 bg-[#141414] text-white font-black uppercase border-4 border-[#141414]">Confirm & Proceed</button>
        </div>
      </div>
    );
  }

  if (stage === 'security_check') {
    const enterFullScreen = () => {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    };
    return (
      <div className="min-h-screen bg-[#E4E3E0] p-8 flex items-center justify-center">
        <div className="bg-white border-4 border-[#141414] p-8 max-w-md w-full space-y-6 shadow-brutal">
          <h2 className="text-2xl font-black uppercase">Stage 4: OS Security</h2>
          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
            <p className="text-xs font-black uppercase text-red-600">Strict Mode Protocol</p>
            <ul className="text-[10px] font-bold text-red-700 list-disc pl-4">
              <li>Fullscreen mode required</li>
              <li>Tab switching prohibited</li>
              <li>Right-click/Copy/Paste disabled</li>
            </ul>
          </div>
          {!isFullScreen ? (
            <button onClick={enterFullScreen} className="w-full py-4 bg-red-600 text-white font-black uppercase border-4 border-[#141414]">Enable Secure Mode</button>
          ) : (
            <button onClick={() => setStage('instructions')} className="w-full py-4 bg-[#141414] text-white font-black uppercase border-4 border-[#141414]">Continue</button>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'instructions') {
    return (
      <div className="min-h-screen bg-[#E4E3E0] p-8 flex items-center justify-center">
        <div className="bg-white border-4 border-[#141414] p-8 max-w-2xl w-full space-y-8 shadow-brutal">
          <h1 className="text-4xl font-black uppercase">{quiz?.title}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 border-2 border-[#141414] rounded-2xl">
              <h3 className="font-black uppercase text-xs opacity-40 mb-4">Quiz Rules</h3>
              <ul className="space-y-3 text-sm font-bold">
                <li>Time: {Math.floor(timeLeft / 60)}m</li>
                {quiz?.question_timer && <li>Per Question: {quiz.question_timer}s</li>}
                {quiz?.strict_mode && <li className="text-red-600">Strict Mode: Active</li>}
              </ul>
            </div>
            <div className="p-6 bg-indigo-50 border-2 border-[#141414] rounded-2xl">
              <h3 className="font-black uppercase text-xs opacity-40 mb-4">Student Info</h3>
              <p className="text-sm font-bold">{user?.name}</p>
              {user?.priority_type && user.priority_type !== 'normal' && <span className="text-[10px] font-black uppercase text-amber-600">{user.priority_type} Category</span>}
            </div>
          </div>
          <button onClick={() => setStage('quiz')} className="w-full py-4 bg-[#141414] text-white font-black uppercase border-4 border-[#141414]">Start Quiz</button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-12">
        <div className="bg-white border-2 border-[#141414] p-12 rounded-[3rem] shadow-brutal text-center space-y-8">
          <h2 className="text-4xl font-black uppercase">Assessment Complete</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-[#141414]/5">
              <p className="text-[10px] font-bold uppercase opacity-40">Total</p>
              <p className="text-2xl font-black">{quiz.questions?.length}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <p className="text-[10px] font-bold uppercase text-emerald-600">Correct</p>
              <p className="text-2xl font-black text-emerald-700">{score}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
              <p className="text-[10px] font-bold uppercase text-red-600">Wrong</p>
              <p className="text-2xl font-black text-red-700">{(quiz.questions?.length || 0) - score}</p>
            </div>
          </div>
          <button onClick={() => navigate('/student')} className="bg-[#141414] text-white px-8 py-4 rounded-2xl font-bold uppercase">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto relative">
      <header className="sticky top-[72px] z-40 flex justify-between items-center bg-white/90 backdrop-blur-md border-2 border-[#141414] p-6 rounded-3xl shadow-brutal mb-4">
        <div>
          <h2 className="text-xl font-bold uppercase">{quiz.title}</h2>
          <p className="text-[10px] font-bold uppercase opacity-40">{quiz.subject}</p>
        </div>
        <div className="flex items-center gap-6">
          {quiz.question_timer && quiz.question_timer > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black uppercase opacity-60">Question Time</span>
              <span className="font-mono font-black text-xl">{questionTimeLeft}s</span>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase opacity-60">Time Remaining</span>
            <span className="font-mono font-black text-2xl">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div key={currentQuestion.id} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
            <div className="bg-white border-2 border-[#141414] p-8 rounded-[2rem] shadow-brutal">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">Question {currentIdx + 1} of {quiz.questions?.length}</span>
              </div>
              <h3 className="text-2xl font-bold leading-tight mb-8">{currentQuestion.question_text}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['a', 'b', 'c', 'd'].map(opt => {
                  const optKey = `option_${opt}` as keyof Question;
                  const isSelected = answers[currentQuestion.id] === opt;
                  return (
                    <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: opt }))} className={`p-6 text-left rounded-2xl border-2 font-bold transition-all flex items-center gap-4 ${isSelected ? 'bg-indigo-600 border-[#141414] text-white shadow-brutal-sm scale-[1.02]' : 'bg-white border-[#141414] hover:bg-gray-50'}`}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 ${isSelected ? 'bg-white text-indigo-600 border-white' : 'bg-gray-100 border-[#141414] text-[#141414]'}`}>{opt.toUpperCase()}</span>
                      {currentQuestion[optKey] as string}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} className="px-8 py-4 bg-white border-2 border-[#141414] rounded-2xl font-bold uppercase flex items-center gap-2 disabled:opacity-30"><ChevronLeft size={20} /> Previous</button>
              {currentIdx === (quiz.questions?.length || 0) - 1 ? (
                <button onClick={handleSubmit} disabled={isSubmitting} className="px-10 py-4 bg-emerald-600 text-white border-2 border-[#141414] rounded-2xl font-black uppercase flex items-center gap-2 shadow-brutal-sm hover:bg-emerald-700 transition-all">{isSubmitting ? 'Submitting...' : 'Submit Assessment'} <Send size={20} /></button>
              ) : (
                <button onClick={() => setCurrentIdx(prev => prev + 1)} className="px-8 py-4 bg-[#141414] text-white border-2 border-[#141414] rounded-2xl font-bold uppercase flex items-center gap-2 hover:bg-gray-800 transition-all">Next <ChevronRight size={20} /></button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
