import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Quiz, User } from '../types';
import { BookOpen, Trophy, Clock, ChevronRight, ShieldCheck, Camera, Accessibility, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function StudentPreview() {
  const { id } = useParams();
  const { token, user: adminUser } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (adminUser?.role !== 'admin') {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch student details
        const sRes = await fetch(`/api/admin/student/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const studentData = await sRes.json();
        setStudent(studentData);

        // Fetch student's view of quizzes and results
        const [qRes, rRes] = await Promise.all([
          fetch('/api/quizzes', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`/api/admin/student/${id}/results`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        setQuizzes(await qRes.json());
        setResults(await rRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token, adminUser, navigate]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-[#141414] border-t-transparent rounded-full animate-spin" /></div>;
  if (!student) return <div className="p-12 text-center">Student not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => window.close()}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={16} /> Close Preview
          </button>
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 border-amber-200 shadow-[4px_4px_0px_0px_rgba(180,83,9,0.2)]">
            Admin Preview Mode • Viewing as {student.name}
          </div>
        </div>

        <header className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white border-2 border-[#141414] rounded-3xl overflow-hidden shadow-brutal-sm flex items-center justify-center">
            {student.profile_picture ? (
              <img src={student.profile_picture} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="bg-indigo-50 text-indigo-600 w-full h-full flex items-center justify-center">
                <BookOpen size={32} />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter">STUDENT PORTAL</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm font-medium uppercase tracking-widest opacity-50">Academic Dashboard • Welcome, {student.name}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-widest">OS Security</h4>
            </div>
            <p className="text-[10px] font-medium opacity-50 uppercase mb-2">Status: Verified & Secure</p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[100%]" />
            </div>
          </div>
          <div className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Camera size={20} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-widest">Camera Facility</h4>
            </div>
            <p className="text-[10px] font-medium opacity-50 uppercase mb-2">Status: Ready for Proctoring</p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-full" />
            </div>
          </div>
          <div className="bg-white border-2 border-[#141414] p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                <BookOpen size={20} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-widest">Academic Year</h4>
            </div>
            <p className="text-[10px] font-medium opacity-50 uppercase mb-2">Year: {student.year || 'N/A'}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(y => (
                <div key={y} className={`h-1.5 flex-1 rounded-full ${student.year && student.year >= y ? 'bg-amber-500' : 'bg-amber-100'}`} />
              ))}
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
                  const yearQuizzes = quizzes.filter(q => q.year === year);
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
                                <p className="text-[10px] font-bold uppercase opacity-40">{quiz.subject}</p>
                              </div>
                              <h4 className="font-bold text-xl mb-2">{quiz.title}</h4>
                              <div className="flex items-center gap-4 text-xs opacity-50 mb-6">
                                <div className="flex items-center gap-1"><Clock size={14} /> {quiz.time_limit}m</div>
                                <div className="flex items-center gap-1"><BookOpen size={14} /> MCQs</div>
                              </div>
                            </div>
                            <button 
                              disabled
                              className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                              Preview Only
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
                Department: <span className="font-bold uppercase">{student.department}</span>
              </p>
              <p className="text-sm font-medium opacity-90 mb-4">
                Year: <span className="font-bold uppercase">{student.year}{student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} Year</span>
              </p>
              <div className="text-[10px] opacity-70 leading-relaxed">
                Viewing {student.name}'s dashboard. This is a read-only preview of the student's academic portal.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
