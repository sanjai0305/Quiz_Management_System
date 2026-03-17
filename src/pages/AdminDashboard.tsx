import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { User, Quiz, Attempt } from '../types';
import { Users, BookOpen, Trophy, Plus, Save, Trash2, AlertCircle, Accessibility, User as UserIcon, Pencil, Eye, ShieldCheck, Camera, Lock, X, Upload, ChevronRight, Clock, Send, Cpu, Play, Square, UserCheck, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'students' | 'quizzes' | 'leaderboard' | 'notifications'>('students');
  const { token, user } = useAuth();

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase">ADMIN {user?.name}</h2>
          <p className="text-sm font-medium uppercase tracking-widest opacity-50">System Management & Oversight</p>
        </div>
        
        <div className="flex bg-white border-2 border-[#141414] p-1 rounded-xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] overflow-x-auto">
          <TabButton active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users size={18} />} label="Students" />
          <TabButton active={activeTab === 'quizzes'} onClick={() => setActiveTab('quizzes')} icon={<BookOpen size={18} />} label="Quizzes" />
          <TabButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={18} />} label="Leaderboard" />
          <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Send size={18} />} label="Alerts" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'students' && <div key="students"><StudentManager token={token!} /></div>}
        {activeTab === 'quizzes' && <div key="quizzes"><QuizManager token={token!} /></div>}
        {activeTab === 'leaderboard' && <div key="leaderboard"><LeaderboardView token={token!} /></div>}
        {activeTab === 'notifications' && <div key="notifications"><NotificationCenter token={token!} /></div>}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${active ? 'bg-[#141414] text-white' : 'text-[#141414]/50 hover:text-[#141414]'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// --- Student Manager ---
function StudentManager({ token }: { token: string }) {
  const [students, setStudents] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [search, setSearch] = useState('');
  
  // Drill-down state
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, qRes, aRes] = await Promise.all([
        fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/quizzes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/leaderboard', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setStudents(await sRes.json());
      setQuizzes(await qRes.json());
      setAttempts(await aRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchData();
      setStudentToDelete(null);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.registration_number?.toLowerCase().includes(search.toLowerCase());
    const matchesYear = selectedYear === null || s.year === selectedYear;
    const matchesDept = selectedDept === null || s.department === selectedDept;
    const matchesSection = selectedSection === null || s.section === selectedSection;
    return matchesSearch && matchesYear && matchesDept && matchesSection;
  });

  const resetNav = () => {
    setSelectedYear(null);
    setSelectedDept(null);
    setSelectedSection(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold uppercase tracking-tight">Student Registry</h3>
          <p className="text-[10px] font-bold uppercase opacity-40">Hierarchical Management System</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-[#141414] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#2a2a2a] transition-all shadow-brutal-sm"
          >
            <Plus size={16} /> Enroll Student
          </button>
        </div>
      </div>

      {/* Drill-down Navigation */}
      <div className="bg-white border-2 border-[#141414] p-8 rounded-[2.5rem] shadow-brutal-sm">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-8 text-[10px] font-black uppercase tracking-widest">
          <button onClick={resetNav} className={`hover:text-indigo-600 transition-colors ${!selectedYear ? 'text-indigo-600' : 'opacity-40'}`}>Registry</button>
          {selectedYear && (
            <>
              <ChevronRight size={12} className="opacity-20" />
              <button onClick={() => { setSelectedDept(null); setSelectedSection(null); }} className={`hover:text-indigo-600 transition-colors ${!selectedDept ? 'text-indigo-600' : 'opacity-40'}`}>{selectedYear}{selectedYear === 1 ? 'st' : selectedYear === 2 ? 'nd' : selectedYear === 3 ? 'rd' : 'th'} Year</button>
            </>
          )}
          {selectedDept && (
            <>
              <ChevronRight size={12} className="opacity-20" />
              <button onClick={() => setSelectedSection(null)} className={`hover:text-indigo-600 transition-colors ${!selectedSection ? 'text-indigo-600' : 'opacity-40'}`}>{selectedDept}</button>
            </>
          )}
          {selectedSection && (
            <>
              <ChevronRight size={12} className="opacity-20" />
              <span className="text-indigo-600">Section {selectedSection}</span>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#141414] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Level 1: Year Selection */}
            {!selectedYear && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(year => (
                  <button 
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className="group bg-white border-2 border-[#141414] p-8 rounded-3xl shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <span className="text-2xl font-black">{year}</span>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Year {year}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Level 2: Department Selection */}
            {selectedYear && !selectedDept && (
              <div className="grid grid-cols-2 gap-6">
                {['AIML', 'IT'].map(dept => (
                  <button 
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className="group bg-white border-2 border-[#141414] p-8 rounded-3xl shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Cpu size={32} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">{dept} Dept</span>
                  </button>
                ))}
              </div>
            )}

            {/* Level 3: Section Selection */}
            {selectedYear && selectedDept && !selectedSection && (
              <div className="grid grid-cols-2 gap-6">
                {['A', 'B'].map(sec => (
                  <button 
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className="group bg-white border-2 border-[#141414] p-8 rounded-3xl shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <span className="text-2xl font-black">{sec}</span>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Section {sec}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Level 4: Student List */}
            {selectedYear && selectedDept && selectedSection && (
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search students in this section..."
                    className="w-full p-4 pl-12 bg-gray-50 border-2 border-[#141414] rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={20} />
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 opacity-30 font-bold uppercase text-xs">No students found in this section</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStudents.map(student => (
                      <div 
                        key={student.id}
                        className="group relative flex items-center justify-between p-4 bg-white border-2 border-[#141414] rounded-2xl shadow-brutal-sm hover:shadow-brutal transition-all text-left"
                      >
                        <button 
                          onClick={() => setSelectedStudent(student)}
                          className="flex-1 flex items-center gap-4"
                        >
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl overflow-hidden border border-[#141414]/10">
                            {student.profile_picture ? (
                              <img src={student.profile_picture} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-indigo-600"><UserIcon size={20} /></div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm uppercase tracking-tight">{student.name}</h4>
                            <p className="text-[10px] font-mono font-bold text-indigo-600">{student.registration_number}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-black uppercase opacity-30">{student.year}yr</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentToDelete(student.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} onAdded={fetchData} token={token} />}
      {selectedStudent && (
        <StudentProfileModal 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          onDelete={() => {
            setStudentToDelete(selectedStudent.id);
            setSelectedStudent(null);
          }}
          token={token} 
          quizzes={quizzes}
          attempts={attempts.filter(a => a.student_id === selectedStudent.id)}
        />
      )}
      
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border-2 border-[#141414] w-full max-w-sm rounded-3xl p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase">Confirm Deletion</h3>
                <p className="text-xs opacity-50 mt-2 font-medium">This action is irreversible. All student data and quiz history will be lost.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStudentToDelete(null)} className="flex-1 py-3 border-2 border-[#141414] rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={() => handleDeleteStudent(studentToDelete)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Student Profile Modal ---
function StudentProfileModal({ student, onClose, onDelete, token, quizzes, attempts }: { student: User, onClose: () => void, onDelete: () => void, token: string, quizzes: Quiz[], attempts: Attempt[] }) {
  const completedQuizzes = attempts.length;
  const totalQuizzesForYear = quizzes.filter(q => q.year === student.year).length;
  const pendingQuizzes = Math.max(0, totalQuizzesForYear - completedQuizzes);
  const averageScore = attempts.length > 0 
    ? (attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length).toFixed(1) 
    : '0';

  return (
    <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#141414] w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-[#141414]/10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black uppercase tracking-tight">Student Profile</h3>
            <button 
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Delete Student"
            >
              <Trash2 size={18} />
            </button>
          </div>
          <button onClick={onClose} className="text-sm font-bold opacity-50 hover:opacity-100">CLOSE</button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-32 h-32 bg-indigo-50 border-2 border-[#141414] rounded-3xl overflow-hidden shadow-brutal-sm">
              {student.profile_picture ? (
                <img src={student.profile_picture} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-indigo-600"><UserIcon size={48} /></div>
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{student.name}</h4>
                <p className="text-sm font-mono font-bold text-indigo-600 mt-2">{student.registration_number}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-30">Academic Year</p>
                  <p className="font-bold text-lg">{student.year || 1}{student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} Year</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-30">Department</p>
                  <p className="font-bold text-lg">{student.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-30">Section</p>
                  <p className="font-bold text-lg">Section {student.section || 'A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Completed</p>
              <p className="text-3xl font-black text-emerald-700">{completedQuizzes}</p>
              <p className="text-[10px] font-bold opacity-40 uppercase">Quizzes</p>
            </div>
            <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Pending</p>
              <p className="text-3xl font-black text-amber-700">{pendingQuizzes}</p>
              <p className="text-[10px] font-bold opacity-40 uppercase">Assessments</p>
            </div>
            <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Avg Score</p>
              <p className="text-3xl font-black text-indigo-700">{averageScore}</p>
              <p className="text-[10px] font-bold opacity-40 uppercase">Points</p>
            </div>
          </div>

          {/* Detailed Scores List */}
          <div className="space-y-4">
            <h5 className="text-xs font-black uppercase tracking-widest opacity-40">Detailed Quiz History</h5>
            {attempts.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-[#141414]/10 rounded-3xl text-center">
                <p className="text-[10px] font-bold uppercase opacity-30">No quiz attempts recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border border-[#141414]/5 rounded-2xl">
                    <div>
                      <p className="font-bold text-sm uppercase tracking-tight">Quiz ID: {attempt.quiz_id}</p>
                      <p className="text-[10px] opacity-40 uppercase font-bold">{new Date(attempt.attempt_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-indigo-600">{attempt.score}</p>
                      <p className="text-[10px] font-bold uppercase opacity-30">Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AddStudentModal({ onClose, onAdded, token }: { onClose: () => void, onAdded: () => void, token: string }) {
  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    date_of_birth: '',
    mobile: '',
    department: 'AIML',
    profile_picture: '',
    year: 1,
    section: 'A' as 'A' | 'B'
  });
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profile_picture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      onAdded();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#141414] w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#141414]/10 flex justify-between items-center">
          <h3 className="text-xl font-bold uppercase tracking-tight">New Student Enrollment</h3>
          <button onClick={onClose} className="text-sm font-bold opacity-50 hover:opacity-100">CLOSE</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col items-center gap-4 mb-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 bg-gray-50 border-2 border-dashed border-[#141414]/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden relative group"
            >
              {formData.profile_picture ? (
                <>
                  <img src={formData.profile_picture} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Pencil size={20} className="text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Plus size={24} className="opacity-20 mb-1" />
                  <span className="text-[8px] font-bold uppercase opacity-30">Add Photo</span>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Full Name</label>
              <input required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Reg Number</label>
              <input required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={formData.registration_number} onChange={e => setFormData({...formData, registration_number: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Date of Birth</label>
              <input type="date" required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Mobile Number</label>
              <input required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Department</label>
                <select 
                  className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium bg-white"
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Academic Year</label>
                <select 
                  className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium bg-white"
                  value={formData.year}
                  onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Section</label>
                <select 
                  className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium bg-white"
                  value={formData.section}
                  onChange={e => setFormData({...formData, section: e.target.value as 'A' | 'B'})}
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

          <button type="submit" className="w-full bg-[#141414] text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#2a2a2a] transition-all">Complete Enrollment</button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Live Quiz Control Modal ---
function LiveQuizControl({ quiz, students, onClose, token }: { quiz: Quiz, students: User[], onClose: () => void, token: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineStudents, setOnlineStudents] = useState<string[]>([]);
  const [excludedStudents, setExcludedStudents] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<{userId: string, type: string, time: string}[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.emit('join_quiz', { quizId: quiz.id.toString(), userId: user?.name, role: 'admin' });

    s.on('presence_update', (data) => {
      setOnlineStudents(data.onlineStudents);
      setExcludedStudents(data.excludedStudents);
      setIsLive(data.isLive);
    });

    s.on('security_alert', (data) => {
      setSecurityLogs(prev => [{ ...data, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
    });

    s.on('manual_presence_update', (data) => {
      setOnlineStudents(data.onlineStudents);
    });

    return () => { s.disconnect(); };
  }, [quiz.id]);

  const toggleStart = () => {
    if (isLive) {
      socket?.emit('stop_quiz', { quizId: quiz.id.toString() });
    } else {
      socket?.emit('start_quiz', { quizId: quiz.id.toString() });
    }
  };

  const toggleAbsent = (studentId: string, currentStatus: boolean) => {
    socket?.emit('toggle_absent', { 
      quizId: quiz.id.toString(), 
      studentId, 
      isAbsent: !currentStatus 
    });
  };

  const toggleManualPresence = (studentId: string, isCurrentlyOnline: boolean) => {
    socket?.emit('toggle_manual_presence', {
      quizId: quiz.id.toString(),
      studentId,
      isPresent: !isCurrentlyOnline
    });
  };

  const handleClose = () => {
    socket?.emit('close_session', { quizId: quiz.id.toString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#141414] w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-[#141414]/10 flex justify-between items-center bg-indigo-50">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Live Session Control</h3>
            <p className="text-[10px] font-bold uppercase opacity-40">{quiz.title}</p>
          </div>
          <button onClick={handleClose} className="text-sm font-bold opacity-50 hover:opacity-100">CLOSE</button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="flex flex-col sm:flex-row gap-6 items-center justify-between p-6 bg-gray-50 border-2 border-[#141414] rounded-3xl">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <div>
                <p className="text-xs font-black uppercase tracking-widest">{isLive ? 'Session Active' : 'Session Ready'}</p>
                <p className="text-[10px] opacity-50 font-bold uppercase">{onlineStudents.length} Students Connected</p>
              </div>
            </div>
            <button 
              onClick={toggleStart}
              className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-all ${isLive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {isLive ? <><Square size={20} /> Stop Quiz</> : <><Play size={20} /> Start Quiz</>}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase tracking-widest opacity-40">Student Attendance & Proctoring</h4>
              <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg">
                {onlineStudents.length}/{students.length} Present
              </span>
            </div>
            
            {securityLogs.length > 0 && (
              <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-rose-600 flex items-center gap-2">
                  <AlertCircle size={12} /> Security Violations Detected
                </p>
                <div className="space-y-1">
                  {securityLogs.map((log, i) => (
                    <p key={i} className="text-[9px] font-bold text-rose-500 uppercase">
                      [{log.time}] Student {log.userId}: {log.type.replace('_', ' ')}
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {students.map(student => {
                const isOnline = onlineStudents.includes(student.registration_number);
                const isExcluded = excludedStudents.includes(student.registration_number);
                
                return (
                  <div key={student.id} className={`flex items-center justify-between p-4 border-2 rounded-2xl transition-all ${isExcluded ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white border-[#141414]/10'}`}>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleManualPresence(student.registration_number!, isOnline)}
                        className={`w-3 h-3 rounded-full transition-all ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300 hover:bg-emerald-200'}`}
                        title={isOnline ? 'Online (Click to force offline)' : 'Offline (Click to force online)'}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-tight">{student.name}</p>
                          {student.is_priority && (
                            <span className="text-[8px] bg-amber-100 text-amber-600 px-1 rounded font-black uppercase">PRIORITY</span>
                          )}
                        </div>
                        <p className="text-[8px] font-mono font-bold opacity-40">{student.registration_number}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleAbsent(student.registration_number, isExcluded)}
                      className={`p-2 rounded-xl transition-all ${isExcluded ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'}`}
                      title={isExcluded ? 'Mark Present' : 'Mark Absent/Hold'}
                    >
                      {isExcluded ? <UserCheck size={16} /> : <UserX size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
function QuizManager({ token }: { token: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<number | null>(null);
  const [liveQuizId, setLiveQuizId] = useState<number | null>(null);

  const fetchQuizzes = async () => {
    const res = await fetch('/api/quizzes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setQuizzes(data);
  };

  const fetchStudents = async () => {
    const res = await fetch('/api/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setStudents(data);
  };

  const handleDeleteQuiz = async (id: number) => {
    const res = await fetch(`/api/quizzes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchQuizzes();
      setQuizToDelete(null);
    }
  };

  useEffect(() => { 
    fetchQuizzes(); 
    fetchStudents();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold uppercase tracking-tight">Curriculum & Quizzes</h3>
        <button onClick={() => setShowAdd(true)} className="bg-[#141414] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#2a2a2a] transition-all">
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="bg-white border-2 border-[#141414] p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex justify-between items-center group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-100">
                  Year {quiz.year}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100">
                  {quiz.department}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-100">
                  Sec: {quiz.section}
                </span>
                <p className="text-[10px] font-bold uppercase opacity-40 ml-2">{quiz.subject}</p>
              </div>
              <h4 className="font-bold text-lg">{quiz.title}</h4>
              <p className="text-xs opacity-50">{quiz.time_limit} Minutes • Multiple Choice</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLiveQuizId(quiz.id)}
                className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                title="Live Control"
              >
                <Play size={18} />
              </button>
              <button 
                onClick={() => setEditingQuizId(quiz.id)}
                className="p-3 bg-gray-50 text-[#141414] rounded-xl border border-[#141414]/10 hover:bg-[#141414] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                title="Edit Quiz"
              >
                <Pencil size={18} />
              </button>
              <button 
                onClick={() => setQuizToDelete(quiz.id)}
                className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                title="Delete Quiz"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <QuizModal onClose={() => setShowAdd(false)} onAdded={fetchQuizzes} token={token} />}
      {editingQuizId && <QuizModal quizId={editingQuizId} onClose={() => setEditingQuizId(null)} onAdded={fetchQuizzes} token={token} />}
      {liveQuizId && (
        <LiveQuizControl 
          quiz={quizzes.find(q => q.id === liveQuizId)!} 
          students={students.filter(s => {
            const q = quizzes.find(quiz => quiz.id === liveQuizId)!;
            return s.year === q.year && 
                   s.department === q.department && 
                   (q.section === 'Both' || s.section === q.section);
          })}
          onClose={() => setLiveQuizId(null)} 
          token={token} 
        />
      )}
      
      <AnimatePresence>
        {quizToDelete && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border-2 border-[#141414] w-full max-w-sm rounded-3xl p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase">Delete Quiz?</h3>
                <p className="text-xs opacity-50 mt-2 font-medium">This will permanently remove the quiz and all associated questions and student attempts.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setQuizToDelete(null)} className="flex-1 py-3 border-2 border-[#141414] rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={() => handleDeleteQuiz(quizToDelete)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function QuizModal({ onClose, onAdded, token, quizId }: { onClose: () => void, onAdded: () => void, token: string, quizId?: number }) {
  const [quizData, setQuizData] = useState({
    title: '',
    subject: '',
    time_limit: 10,
    question_timer: 0,
    year: 1,
    department: 'AIML',
    section: 'Both' as 'A' | 'B' | 'Both',
    questions: [{ text: '', a: '', b: '', c: '', d: '', correct: 'a' }]
  });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isLoading, setIsLoading] = useState(!!quizId);

  const [error, setError] = useState('');

  useEffect(() => {
    if (quizId) {
      setIsLoading(true);
      fetch(`/api/quizzes/${quizId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setQuizData({
          title: data.title,
          subject: data.subject,
          time_limit: data.time_limit,
          question_timer: data.question_timer || 0,
          year: data.year,
          department: data.department || 'AIML',
          section: data.section || 'Both',
          questions: data.questions.map((q: any) => ({
            text: q.question_text,
            a: q.option_a,
            b: q.option_b,
            c: q.option_c,
            d: q.option_d,
            correct: q.correct_answer
          }))
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load quiz data');
        setIsLoading(false);
      });
    }
  }, [quizId, token]);

  const addQuestion = () => {
    setQuizData({ ...quizData, questions: [...quizData.questions, { text: '', a: '', b: '', c: '', d: '', correct: 'a' }] });
  };

  const addMultipleQuestions = (count: number) => {
    const newQs = Array(count).fill(null).map(() => ({ text: '', a: '', b: '', c: '', d: '', correct: 'a' }));
    setQuizData({ ...quizData, questions: [...quizData.questions, ...newQs] });
  };

  const handleBulkImport = () => {
    const lines = bulkText.split('\n').filter(l => l.trim());
    const newQs = lines.map(line => {
      const [text, a, b, c, d, correct] = line.split('|').map(s => s.trim());
      return { 
        text: text || '', 
        a: a || '', 
        b: b || '', 
        c: c || '', 
        d: d || '', 
        correct: (correct || 'a').toLowerCase() 
      };
    });
    if (newQs.length > 0) {
      setQuizData({ ...quizData, questions: [...quizData.questions, ...newQs] });
      setShowBulk(false);
      setBulkText('');
    }
  };

  const removeQuestion = (index: number) => {
    if (quizData.questions.length > 1) {
      const newQuestions = quizData.questions.filter((_, i) => i !== index);
      setQuizData({ ...quizData, questions: newQuestions });
    }
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...quizData.questions[index] };
    const newQuestions = [...quizData.questions];
    newQuestions.splice(index + 1, 0, questionToDuplicate);
    setQuizData({ ...quizData, questions: newQuestions });
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const newQuestions = [...quizData.questions];
    (newQuestions[index] as any)[field] = value;
    setQuizData({ ...quizData, questions: newQuestions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const url = quizId ? `/api/quizzes/${quizId}` : '/api/quizzes';
    const method = quizId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quizData)
      });
      if (res.ok) {
        onAdded();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save quiz');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#141414] w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#141414]/10 flex justify-between items-center">
          <h3 className="text-xl font-bold uppercase tracking-tight">{quizId ? 'Edit Quiz' : 'Quiz Architect'}</h3>
          <button onClick={onClose} className="text-sm font-bold opacity-50 hover:opacity-100">CLOSE</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Quiz Title</label>
              <input required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={quizData.title} onChange={e => setQuizData({...quizData, title: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Subject</label>
              <input required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={quizData.subject} onChange={e => setQuizData({...quizData, subject: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Time (Min)</label>
              <input type="number" required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={quizData.time_limit} onChange={e => setQuizData({...quizData, time_limit: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Q-Timer (Sec)</label>
              <input type="number" placeholder="0 = No limit" className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={quizData.question_timer} onChange={e => setQuizData({...quizData, question_timer: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Target Year</label>
              <select className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={quizData.year} onChange={e => setQuizData({...quizData, year: parseInt(e.target.value)})}>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Department</label>
              <select className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={quizData.department} onChange={e => setQuizData({...quizData, department: e.target.value})}>
                <option value="AIML">AIML</option>
                <option value="IT">IT</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Section</label>
              <select className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={quizData.section} onChange={e => setQuizData({...quizData, section: e.target.value as any})}>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="Both">Both Sections</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold uppercase tracking-widest opacity-50">Questions ({quizData.questions.length})</h4>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setShowBulk(!showBulk)} className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:underline">Bulk Import</button>
                <button type="button" onClick={() => addMultipleQuestions(5)} className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100">+ Add 5 Questions</button>
                <button type="button" onClick={addQuestion} className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:underline">+ Add Question</button>
              </div>
            </div>

            {showBulk && (
              <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Bulk Import Format</label>
                  <p className="text-[10px] opacity-50">Question | Option A | Option B | Option C | Option D | Correct (A/B/C/D)</p>
                  <textarea 
                    className="w-full p-3 border-2 border-indigo-200 rounded-xl font-mono text-xs" 
                    rows={5} 
                    placeholder="What is 2+2? | 3 | 4 | 5 | 6 | B"
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowBulk(false)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest opacity-50">Cancel</button>
                  <button type="button" onClick={handleBulkImport} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Import Questions</button>
                </div>
              </div>
            )}

            {quizData.questions.map((q, i) => (
              <div key={i} className="p-6 bg-gray-50 border-2 border-[#141414]/10 rounded-2xl space-y-4 relative group">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    type="button" 
                    onClick={() => duplicateQuestion(i)}
                    className="p-2 bg-white border border-[#141414]/10 rounded-lg text-indigo-600 hover:bg-indigo-50"
                    title="Duplicate Question"
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => removeQuestion(i)}
                    className="p-2 bg-white border border-[#141414]/10 rounded-lg text-red-500 hover:bg-red-50"
                    title="Remove Question"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Question {i + 1}</label>
                  <textarea required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['a', 'b', 'c', 'd'].map(opt => (
                    <div key={opt} className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Option {opt.toUpperCase()}</label>
                      <input required className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={(q as any)[opt]} onChange={e => updateQuestion(i, opt, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Correct Answer</label>
                  <select className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium" value={q.correct} onChange={e => updateQuestion(i, 'correct', e.target.value)}>
                    <option value="a">Option A</option>
                    <option value="b">Option B</option>
                    <option value="c">Option C</option>
                    <option value="d">Option D</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
              <AlertCircle size={20} />
              <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
            </div>
          )}

          <button type="submit" className="w-full bg-[#141414] text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#2a2a2a] transition-all">
            {quizId ? 'Save Changes' : 'Publish Quiz'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Leaderboard View ---
function LeaderboardView({ token }: { token: string }) {
  const [data, setData] = useState<Attempt[]>([]);

  useEffect(() => {
    fetch('/api/leaderboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(setData);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border-2 border-[#141414] rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-[#141414]">
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest opacity-50">Rank</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest opacity-50">Student</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest opacity-50">Quiz</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest opacity-50">Score</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-widest opacity-50">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-[#141414]/5 hover:bg-gray-50 transition-colors">
                <td className="p-6">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                    i === 1 ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                    i === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                    'text-gray-400'
                  }`}>
                    {i + 1}
                  </span>
                </td>
                <td className="p-6">
                  <p className="font-bold">{row.name}</p>
                  <p className="text-[10px] font-mono opacity-50">{row.registration_number}</p>
                </td>
                <td className="p-6 font-medium">{row.quiz_name}</td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg">{row.score}</span>
                    <span className="text-[10px] opacity-30">/ {row.total_questions}</span>
                  </div>
                </td>
                <td className="p-6 text-xs opacity-50">{new Date(row.attempt_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function NotificationCenter({ token }: { token: string }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/notifications/send-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });
      if (res.ok) {
        setStatus({ type: 'success', text: 'Notification sent successfully to all registered students!' });
        setMessage('');
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (err) {
      setStatus({ type: 'error', text: 'Error sending notification. Please check your bot token.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-[#141414] p-8 rounded-[2.5rem] shadow-brutal max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-brutal-sm">
          <Send size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter">Telegram Alerts</h3>
          <p className="text-xs font-bold uppercase opacity-40 tracking-widest">Send manual notifications to students</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Message Content</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here... (e.g., Important update regarding tomorrow's quiz!)"
            className="w-full p-6 bg-gray-50 border-2 border-[#141414] rounded-2xl font-medium min-h-[150px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
          />
        </div>

        {status && (
          <div className={`p-4 rounded-xl border-2 flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
            <AlertCircle size={18} />
            <p className="text-xs font-bold uppercase tracking-wide">{status.text}</p>
          </div>
        )}

        <button 
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="w-full bg-[#141414] text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#2a2a2a] transition-all shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              Send Notification
            </>
          )}
        </button>

        <div className="pt-6 border-t border-[#141414]/5">
          <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border-2 border-indigo-100">
            <ShieldCheck className="text-indigo-600 mt-0.5" size={16} />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Security Note</p>
              <p className="text-[10px] font-medium text-indigo-700 leading-relaxed">
                This will send a message to all students who have registered their Telegram Chat ID in their dashboard. 
                Ensure your <code className="bg-white px-1 rounded">TELEGRAM_BOT_TOKEN</code> is correctly set in the environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
