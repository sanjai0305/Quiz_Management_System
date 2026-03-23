import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../App';
import { User, Quiz, Attempt } from '../types';
import { Users, BookOpen, Trophy, Plus, Save, Trash2, User as UserIcon, Pencil, Eye, X, Upload, ChevronRight, Clock, Send, Cpu, AlertCircle, ShieldCheck, FileSpreadsheet, FileText, Mail, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'students' | 'quizzes' | 'leaderboard'>('students');
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
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'students' && <div key="students"><StudentManager token={token!} /></div>}
        {activeTab === 'quizzes' && <div key="quizzes"><QuizManager token={token!} /></div>}
        {activeTab === 'leaderboard' && <div key="leaderboard"><LeaderboardView token={token!} /></div>}
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
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, qRes, aRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/quizzes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/leaderboard`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (sRes.ok) setStudents(await sRes.json());
      if (qRes.ok) setQuizzes(await qRes.json());
      if (aRes.ok) setAttempts(await aRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/api/students/${id}`, {
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
          <p className="text-[10px] font-bold uppercase opacity-40">Hierarchical Management System • {students.length} Total Students</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowBulkAdd(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-brutal-sm"
          >
            <Upload size={16} /> Bulk Upload
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-[#141414] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#2a2a2a] transition-all shadow-brutal-sm"
          >
            <Plus size={16} /> Enroll Student
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-[#141414] p-8 rounded-[2.5rem] shadow-brutal-sm">
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
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-mono font-bold text-indigo-600">{student.registration_number}</p>
                              {student.priority_type && student.priority_type !== 'normal' && (
                                <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase">
                                  {student.priority_type}
                                </span>
                              )}
                            </div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#141414]/5 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-30">Priority Type</p>
                  <p className="font-bold text-sm uppercase text-amber-600">{student.priority_type || 'Normal'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-30">Safety Secure</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${student.is_safety_secure ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <p className="font-bold text-sm uppercase">{student.is_safety_secure ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-30">Camera Facility</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${student.camera_facilities ? 'bg-indigo-500' : 'bg-red-500'}`} />
                    <p className="font-bold text-sm uppercase">{student.camera_facilities ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                    <div className="flex items-center gap-4">
                      {attempt.verification_photo && (
                        <img 
                          src={attempt.verification_photo} 
                          alt="Verification" 
                          className="w-10 h-10 rounded-lg object-cover border border-[#141414]/10"
                        />
                      )}
                      <div>
                        <p className="font-bold text-sm uppercase tracking-tight">Quiz ID: {attempt.quiz_id}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] opacity-40 uppercase font-bold">{new Date(attempt.attempt_date).toLocaleDateString()}</p>
                          {attempt.malpractice_count !== undefined && attempt.malpractice_count > 0 && (
                            <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">
                              {attempt.malpractice_count} Malpractice
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div>
                        <p className="font-black text-lg text-indigo-600">{attempt.score}</p>
                        <p className="text-[10px] font-bold uppercase opacity-30">Score</p>
                      </div>
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
    section: 'A' as 'A' | 'B',
    priority_type: 'normal' as 'normal' | 'children' | 'disability' | 'senior',
    is_safety_secure: true,
    camera_facilities: true
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

    const res = await fetch(`${API_BASE_URL}/api/students`, {
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
                  value={formData.year || 1}
                  onChange={e => setFormData({...formData, year: parseInt(e.target.value) || 1})}
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Priority Type</label>
                <select 
                  className="w-full p-3 border-2 border-[#141414] rounded-xl font-medium bg-white"
                  value={formData.priority_type}
                  onChange={e => setFormData({...formData, priority_type: e.target.value as any})}
                >
                  <option value="normal">Normal</option>
                  <option value="children">Children</option>
                  <option value="disability">Disability</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border-2 border-[#141414] rounded-xl bg-emerald-50/50">
                <input 
                  type="checkbox" 
                  id="is_safety_secure"
                  className="w-5 h-5 accent-[#141414]"
                  checked={formData.is_safety_secure}
                  onChange={e => setFormData({...formData, is_safety_secure: e.target.checked})}
                />
                <label htmlFor="is_safety_secure" className="text-[10px] font-black uppercase tracking-tight cursor-pointer">Safety Secure</label>
              </div>
              <div className="flex items-center gap-3 p-3 border-2 border-[#141414] rounded-xl bg-indigo-50/50">
                <input 
                  type="checkbox" 
                  id="camera_facilities"
                  className="w-5 h-5 accent-[#141414]"
                  checked={formData.camera_facilities}
                  onChange={e => setFormData({...formData, camera_facilities: e.target.checked})}
                />
                <label htmlFor="camera_facilities" className="text-[10px] font-black uppercase tracking-tight cursor-pointer">Camera Facility</label>
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

function QuizManager({ token }: { token: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<number | null>(null);

  const fetchQuizzes = async () => {
    const res = await fetch(`${API_BASE_URL}/api/quizzes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setQuizzes(data);
  };

  const handleDeleteQuiz = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/api/quizzes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchQuizzes();
      setQuizToDelete(null);
    }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white border-2 border-[#141414] p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] mb-8">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold uppercase tracking-tight">Reports & Email Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Manual Report Generation</h4>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const date = prompt('Enter date (YYYY-MM-DD) for the report:', new Date().toISOString().split('T')[0]);
                  if (!date) return;
                  const res = await fetch(`${API_BASE_URL}/api/admin/trigger-report`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ date })
                  });
                  const data = await res.json();
                  if (res.ok) alert('Reports sent successfully!');
                  else alert('Error: ' + data.error);
                }}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 border-2 border-[#141414] shadow-brutal-sm flex items-center justify-center gap-2"
              >
                <Mail size={16} /> Send Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold uppercase tracking-tight">Curriculum & Quizzes</h3>
        <button onClick={() => setShowAdd(true)} className="bg-[#141414] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#2a2a2a] transition-all border-2 border-[#141414] shadow-brutal-sm">
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="bg-white border-2 border-[#141414] p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex justify-between items-center group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-100">Year {quiz.year}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100">{quiz.department}</span>
                <p className="text-[10px] font-bold uppercase opacity-40 ml-2">{quiz.subject}</p>
              </div>
              <h4 className="font-bold text-lg">{quiz.title}</h4>
              <p className="text-xs opacity-50">{quiz.time_limit} Minutes</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setEditingQuizId(quiz.id)} className="p-3 bg-gray-50 rounded-xl border border-[#141414]/10 hover:bg-[#141414] hover:text-white transition-all opacity-0 group-hover:opacity-100"><Pencil size={18} /></button>
              <button onClick={() => setQuizToDelete(quiz.id)} className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <QuizModal onClose={() => setShowAdd(false)} onAdded={fetchQuizzes} token={token} />}
      {editingQuizId && <QuizModal quizId={editingQuizId} onClose={() => setEditingQuizId(null)} onAdded={fetchQuizzes} token={token} />}
      
      <AnimatePresence>
        {quizToDelete && (
          <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border-2 border-[#141414] w-full max-w-sm rounded-3xl p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto"><Trash2 size={32} /></div>
              <div><h3 className="text-xl font-bold uppercase">Delete Quiz?</h3></div>
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
    scheduled_date: '',
    scheduled_time: '',
    expiry_date: '',
    expiry_time: '',
    is_proctored: false,
    strict_mode: false,
    reset_attempts: false,
    questions: [{ text: '', a: '', b: '', c: '', d: '', correct: 'a' }]
  });
  const [isLoading, setIsLoading] = useState(!!quizId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (quizId) {
      setIsLoading(true);
      fetch(`${API_BASE_URL}/api/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } })
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
          scheduled_date: data.scheduled_at ? data.scheduled_at.split('T')[0] : '',
          scheduled_time: data.scheduled_at ? data.scheduled_at.split('T')[1].substring(0, 5) : '',
          expiry_date: data.expires_at ? data.expires_at.split('T')[0] : '',
          expiry_time: data.expires_at ? data.expires_at.split('T')[1].substring(0, 5) : '',
          is_proctored: data.is_proctored || false,
          strict_mode: data.strict_mode || false,
          reset_attempts: false,
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
      });
    }
  }, [quizId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = quizId ? `${API_BASE_URL}/api/quizzes/${quizId}` : `${API_BASE_URL}/api/quizzes`;
    const method = quizId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(quizData)
    });
    if (res.ok) { onAdded(); onClose(); }
    else setError('Failed to save quiz');
  };

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border-2 border-[#141414] w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#141414]/10 flex justify-between items-center">
          <h3 className="text-xl font-bold uppercase tracking-tight">Quiz Architect</h3>
          <button onClick={onClose} className="text-sm font-bold opacity-50 hover:opacity-100">CLOSE</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Title" className="p-3 border-2 border-[#141414] rounded-xl" value={quizData.title} onChange={e => setQuizData({...quizData, title: e.target.value})} />
            <input required placeholder="Subject" className="p-3 border-2 border-[#141414] rounded-xl" value={quizData.subject} onChange={e => setQuizData({...quizData, subject: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-[#141414] text-white py-4 rounded-xl font-bold uppercase tracking-widest">Save Quiz</button>
        </form>
      </motion.div>
    </div>
  );
}

function LeaderboardView({ token }: { token: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/leaderboard`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(json => { setData(json); setLoading(false); });
  }, [token]);

  return (
    <div className="bg-white border-2 border-[#141414] rounded-3xl overflow-hidden shadow-brutal-sm">
      <table className="w-full text-left">
        <thead><tr className="bg-gray-50 border-b-2 border-[#141414]"><th className="p-6">Rank</th><th className="p-6">Student</th><th className="p-6">Score</th></tr></thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-[#141414]/5">
              <td className="p-6">{i + 1}</td>
              <td className="p-6">{row.name}</td>
              <td className="p-6 font-bold">{row.totalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
