import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../../App';
import { User, Quiz, Attempt } from '../../shared/types';
import { Users, BookOpen, Trophy, Plus, Save, Trash2, User as UserIcon, Pencil, Eye, X, Upload, ChevronRight, Clock, Send, Cpu, AlertCircle, ShieldCheck, FileSpreadsheet, FileText, Mail, RefreshCw, Edit2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendQuizTrigger } from '../../firebase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'students' | 'quizzes' | 'leaderboard' | 'security'>('students');
  const { token, user } = useAuth();

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-8 border-brutal-border pb-8">
        <div className="space-y-2">
          <h2 className="text-6xl font-black tracking-tighter text-brutal-ink uppercase leading-none">
            Admin <span className="text-indigo-600">{user?.name}</span>
          </h2>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-brutal-ink/40">
            System Management & Oversight
          </p>
        </div>
        
        <div className="flex bg-white border-4 border-brutal-border p-1.5 rounded-2xl shadow-brutal-sm overflow-x-auto">
          <TabButton active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users size={20} />} label="Students" />
          <TabButton active={activeTab === 'quizzes'} onClick={() => setActiveTab('quizzes')} icon={<BookOpen size={20} />} label="Quizzes" />
          <TabButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={20} />} label="Leaderboard" />
          <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<ShieldCheck size={20} />} label="Security" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'students' && <div key="students"><StudentManager token={token!} /></div>}
        {activeTab === 'quizzes' && <div key="quizzes"><QuizManager token={token!} /></div>}
        {activeTab === 'security' && <div key="security"><SecuritySafetyManager token={token!} /></div>}
        {activeTab === 'leaderboard' && <div key="leaderboard"><LeaderboardView token={token!} /></div>}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
        active 
          ? 'bg-brutal-ink text-white shadow-brutal-sm' 
          : 'text-brutal-ink/40 hover:text-brutal-ink hover:bg-brutal-ink/5'
      }`}
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
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

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

  const years = [1, 2, 3, 4];
  const departments = ['AIML', 'IT'];
  const sections = ['A', 'B'];

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
    const matchesPriority = selectedPriority === null || s.priority_type === selectedPriority;
    const matchesStage = selectedStage === null || s.current_stage === selectedStage;
    return matchesSearch && matchesYear && matchesDept && matchesSection && matchesPriority && matchesStage;
  });

  const resetNav = () => {
    setSelectedYear(null);
    setSelectedDept(null);
    setSelectedSection(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-4xl font-black uppercase tracking-tighter text-brutal-ink leading-none">Student Registry</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink/40">Hierarchical Management System • {students.length} Total Students</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowBulkAdd(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 shadow-brutal-sm hover:translate-y-[-4px] transition-all border-4 border-brutal-border"
          >
            <Upload size={18} /> Bulk Upload
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-brutal-ink text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-brutal-ink/90 shadow-brutal-sm hover:translate-y-[-4px] transition-all border-4 border-brutal-border"
          >
            <Plus size={18} /> Enroll Student
          </button>
        </div>
      </div>

      <div className="bg-white border-4 border-brutal-border p-12 rounded-[3rem] shadow-brutal-md relative">
        <span className="absolute top-8 left-12 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Registry</span>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
          {[1, 2, 3, 4].map(year => (
            <button 
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`group relative bg-white border-4 border-brutal-border p-8 rounded-[2rem] transition-all flex flex-col items-center gap-6 shadow-brutal-sm hover:shadow-brutal-md hover:translate-y-[-8px] ${selectedYear === year ? 'bg-indigo-50 border-indigo-600' : ''}`}
            >
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border-4 border-brutal-border group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <span className="text-4xl font-black">{year}</span>
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-brutal-ink">Year {year}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedYear && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 border-b-4 border-brutal-border pb-4">
            <button onClick={() => { setSelectedYear(null); setSelectedDept(null); setSelectedSection(null); }} className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:opacity-70">Registry</button>
            <ChevronRight size={16} className="text-brutal-ink/20" />
            <span className="text-xs font-black uppercase tracking-widest text-brutal-ink">Year {selectedYear}</span>
            {selectedDept && (
              <>
                <ChevronRight size={16} className="text-brutal-ink/20" />
                <span className="text-xs font-black uppercase tracking-widest text-brutal-ink">{selectedDept}</span>
              </>
            )}
          </div>

            {selectedYear && !selectedDept && (
              <div className="grid grid-cols-2 gap-6">
                {['AIML', 'IT'].map(dept => (
                    <button 
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl hover:border-emerald-500 transition-all flex flex-col items-center gap-4 shadow-sm hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <Cpu size={24} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">{dept} Dept</span>
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
                      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl hover:border-amber-500 transition-all flex flex-col items-center gap-4 shadow-sm hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-amber-100 dark:border-amber-800 group-hover:bg-amber-600 group-hover:text-white transition-all">
                        <span className="text-xl font-bold">{sec}</span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Section {sec}</span>
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
                      className="w-full p-4 pl-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-gray-900 dark:text-white"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 font-medium uppercase text-xs">No students found in this section</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredStudents.map(student => (
                        <div 
                          key={student.id}
                          className="group relative flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-indigo-500 transition-all text-left shadow-sm"
                        >
                          <button 
                            onClick={() => setSelectedStudent(student)}
                            className="flex-1 flex items-center gap-4"
                          >
                            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                              {student.profile_picture ? (
                                <img src={student.profile_picture} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400"><UserIcon size={24} /></div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 dark:text-white">{student.name}</h4>
                                {student.current_stage && (
                                  <span className="text-[8px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800 uppercase">
                                    Stage {student.current_stage}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-mono text-gray-500">{student.registration_number}</p>
                                {student.priority_type && student.priority_type !== 'normal' && (
                                  <span className="text-[8px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800 uppercase">
                                    {student.priority_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                              <span className="text-[10px] font-semibold uppercase text-gray-400">{student.year}yr</span>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setStudentToDelete(student.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete Student"
                            >
                              <Trash2 size={18} />
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

      <div className="flex gap-4 mt-8">
        {/* Buttons moved to top */}
      </div>

      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} onAdded={fetchData} token={token} />}
      {showBulkAdd && <BulkAddModal onClose={() => setShowBulkAdd(false)} onAdded={fetchData} token={token} />}
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1C1C1C] border-2 border-[#F5F5F0]/10 w-full max-w-sm rounded-3xl p-8 text-center space-y-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.4)]">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase text-[#F5F5F0]">Confirm Deletion</h3>
                <p className="text-xs opacity-50 mt-2 font-medium text-[#F5F5F0]/60">This action is irreversible. All student data and quiz history will be lost.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStudentToDelete(null)} className="flex-1 py-3 border-2 border-[#F5F5F0]/10 rounded-xl font-bold text-xs uppercase tracking-widest text-[#F5F5F0]">Cancel</button>
                <button onClick={() => handleDeleteStudent(studentToDelete)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StudentProfileModal({ student, onClose, onDelete, token, quizzes, attempts }: { student: User, onClose: () => void, onDelete: () => void, token: string, quizzes: Quiz[], attempts: Attempt[] }) {
  const [showEdit, setShowEdit] = useState(false);
  const completedQuizzes = attempts.length;
  const totalQuizzesForYear = quizzes.filter(q => q.year === student.year).length;
  const pendingQuizzes = Math.max(0, totalQuizzesForYear - completedQuizzes);
  const averageScore = attempts.length > 0 
    ? (attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length).toFixed(1) 
    : '0';

  return (
    <div className="fixed inset-0 bg-brutal-ink/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brutal-card border-4 border-brutal-border w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-brutal-lg">
        <div className="p-8 border-b-4 border-brutal-border flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-black uppercase tracking-tight text-brutal-ink">Student Profile</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowEdit(true)}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl border-2 border-transparent hover:border-brutal-border transition-all"
                title="Edit Student"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl border-2 border-transparent hover:border-brutal-border transition-all"
                title="Delete Student"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-sm font-black opacity-50 hover:opacity-100 uppercase tracking-widest text-brutal-ink">CLOSE</button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 text-brutal-ink">
          {showEdit && (
            <EditStudentModal 
              student={student} 
              onClose={() => setShowEdit(false)} 
              onUpdated={() => {
                setShowEdit(false);
                onClose();
              }} 
              token={token} 
            />
          )}
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-40 h-40 bg-brutal-ink/5 border-4 border-brutal-border rounded-3xl overflow-hidden shadow-brutal-sm">
              {student.profile_picture ? (
                <img src={student.profile_picture} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-400"><UserIcon size={64} /></div>
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h4 className="text-4xl font-black uppercase tracking-tighter leading-none">{student.name}</h4>
                <p className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 mt-2">{student.registration_number}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Academic Year</p>
                  <p className="font-black text-xl">{student.year || 1}{student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} Year</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Department</p>
                  <p className="font-black text-xl">{student.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Section</p>
                  <p className="font-black text-xl">Section {student.section || 'A'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-brutal-border pt-6 mt-6">
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 border-2 border-brutal-border rounded-xl">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Priority Type</p>
                  <p className="font-black text-sm uppercase text-amber-600 dark:text-amber-400">{student.priority_type || 'Normal'}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 border-2 border-brutal-border rounded-xl">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Safety Secure</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 border-brutal-border ${student.is_safety_secure ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <p className="font-black text-sm uppercase">{student.is_safety_secure ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 border-2 border-brutal-border rounded-xl">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Camera Facility</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 border-brutal-border ${student.camera_facilities ? 'bg-indigo-500' : 'bg-red-500'}`} />
                    <p className="font-black text-sm uppercase">{student.camera_facilities ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/10 p-4 border-2 border-brutal-border rounded-xl">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">OS Security</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 border-brutal-border ${student.os_security_status === 'secure' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <p className="font-black text-sm uppercase">{student.os_security_status || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 border-4 border-brutal-border p-6 rounded-3xl text-center shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">Completed</p>
              <p className="text-4xl font-black text-brutal-ink">{completedQuizzes}</p>
              <p className="text-[10px] font-black opacity-40 uppercase">Quizzes</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/30 border-4 border-brutal-border p-6 rounded-3xl text-center shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">Pending</p>
              <p className="text-4xl font-black text-brutal-ink">{pendingQuizzes}</p>
              <p className="text-[10px] font-black opacity-40 uppercase">Assessments</p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-900/30 border-4 border-brutal-border p-6 rounded-3xl text-center shadow-brutal-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 mb-1">Avg Score</p>
              <p className="text-4xl font-black text-brutal-ink">{averageScore}</p>
              <p className="text-[10px] font-black opacity-40 uppercase">Points</p>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-xs font-black uppercase tracking-widest opacity-40">Detailed Quiz History</h5>
            {attempts.length === 0 ? (
              <div className="p-12 border-4 border-dashed border-brutal-border rounded-3xl text-center bg-brutal-ink/5">
                <p className="text-xs font-black uppercase opacity-30">No quiz attempts recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-6 bg-brutal-card border-4 border-brutal-border rounded-2xl shadow-brutal-sm">
                    <div className="flex items-center gap-4">
                      {attempt.verification_photo && (
                        <img 
                          src={attempt.verification_photo} 
                          alt="Verification" 
                          className="w-14 h-14 rounded-xl object-cover border-2 border-brutal-border"
                        />
                      )}
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight">Quiz ID: {attempt.quiz_id}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] opacity-40 uppercase font-black">{new Date(attempt.attempt_date).toLocaleDateString()}</p>
                          {attempt.malpractice_count !== undefined && attempt.malpractice_count > 0 && (
                            <span className="text-[10px] font-black bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg border-2 border-brutal-border uppercase">
                              {attempt.malpractice_count} Malpractice
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-2xl text-indigo-600 dark:text-indigo-400">{attempt.score}</p>
                      <p className="text-[10px] font-black uppercase opacity-30">Score</p>
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

function EditStudentModal({ student, onClose, onUpdated, token }: { student: User, onClose: () => void, onUpdated: () => void, token: string }) {
  const [formData, setFormData] = useState({
    name: student.name,
    registration_number: student.registration_number || '',
    date_of_birth: student.date_of_birth || '',
    mobile: (student as any).mobile || '',
    department: student.department || 'AIML',
    profile_picture: student.profile_picture || '',
    year: student.year || 1,
    section: (student.section as any) || 'A',
    priority_type: student.priority_type || 'normal',
    is_safety_secure: student.is_safety_secure ?? true,
    camera_facilities: student.camera_facilities ?? true,
    os_security_status: student.os_security_status || 'secure',
    current_stage: student.current_stage || 1
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
    const res = await fetch(`${API_BASE_URL}/api/students/${student.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      onUpdated();
    } else {
      const data = await res.json();
      setError(data.message || 'Failed to update student');
    }
  };

  return (
    <div className="fixed inset-0 bg-brutal-ink/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brutal-card border-4 border-brutal-border w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-brutal-lg">
        <div className="p-6 border-b-4 border-brutal-border flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10">
          <h3 className="text-xl font-black uppercase tracking-tight text-brutal-ink">Edit Student</h3>
          <button onClick={onClose} className="text-xs font-black opacity-50 hover:opacity-100 uppercase tracking-widest text-brutal-ink">CANCEL</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 text-brutal-ink">
          <div className="flex justify-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 bg-brutal-ink/5 border-4 border-brutal-border rounded-2xl overflow-hidden cursor-pointer hover:bg-brutal-ink/10 transition-all flex items-center justify-center relative group shadow-brutal-sm"
            >
              {formData.profile_picture ? (
                <img src={formData.profile_picture} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={40} className="text-indigo-600 dark:text-indigo-400" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Full Name</label>
              <input required className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Department</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Year</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}>
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Priority</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.priority_type} onChange={e => setFormData({...formData, priority_type: e.target.value as any})}>
                  <option value="normal">Normal</option>
                  <option value="child">Child</option>
                  <option value="disability">Disability</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Security Stage</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.current_stage} onChange={e => setFormData({...formData, current_stage: parseInt(e.target.value)})}>
                  {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>Stage {s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">OS Security</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.os_security_status} onChange={e => setFormData({...formData, os_security_status: e.target.value as any})}>
                  <option value="secure">Secure</option>
                  <option value="vulnerable">Vulnerable</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-4 border-4 border-brutal-border rounded-xl bg-emerald-50 dark:bg-emerald-900/10 shadow-brutal-sm">
                <input type="checkbox" id="edit_is_safety_secure" className="w-6 h-6 accent-emerald-600 border-2 border-brutal-border" checked={formData.is_safety_secure} onChange={e => setFormData({...formData, is_safety_secure: e.target.checked})} />
                <label htmlFor="edit_is_safety_secure" className="text-[10px] font-black uppercase tracking-tight cursor-pointer text-emerald-700 dark:text-emerald-400">Safety</label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 p-4 border-4 border-brutal-border rounded-xl bg-indigo-50 dark:bg-indigo-900/10 shadow-brutal-sm">
                <input type="checkbox" id="edit_camera_facilities" className="w-6 h-6 accent-indigo-600 border-2 border-brutal-border" checked={formData.camera_facilities} onChange={e => setFormData({...formData, camera_facilities: e.target.checked})} />
                <label htmlFor="edit_camera_facilities" className="text-[10px] font-black uppercase tracking-tight cursor-pointer text-indigo-700 dark:text-indigo-400">Camera Facilities</label>
              </div>
            </div>
          </div>
          {error && <p className="text-red-600 text-xs font-black bg-red-50 dark:bg-red-900/30 p-3 border-2 border-red-200 rounded-xl">{error}</p>}
          <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 border-4 border-brutal-border shadow-brutal-md hover:translate-y-[-4px] transition-all">Update Student</button>
        </form>
      </motion.div>
    </div>
  );
}

function BulkAddModal({ onClose, onAdded, token }: { onClose: () => void, onAdded: () => void, token: string }) {
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    const lines = csvData.split('\n').filter(line => line.trim());
    const students = lines.map(line => {
      const [name, registration_number, date_of_birth, mobile, department, year, section, priority_type, current_stage] = line.split(',').map(s => s.trim());
      return { 
        name, 
        registration_number, 
        date_of_birth, 
        mobile, 
        department: department || 'AIML', 
        year: parseInt(year) || 1, 
        section: section || 'A',
        priority_type: priority_type || 'normal',
        is_safety_secure: true,
        camera_facilities: true,
        os_security_status: 'secure',
        current_stage: parseInt(current_stage) || 1
      };
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/students/bulk`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ students })
      });

      if (res.ok) {
        onAdded();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add students');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brutal-ink/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brutal-card border-4 border-brutal-border w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-brutal-lg">
        <div className="p-8 border-b-4 border-brutal-border flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brutal-card border-2 border-brutal-border rounded-xl">
              <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-brutal-ink">Bulk Student Upload</h3>
          </div>
          <button onClick={onClose} className="text-sm font-black opacity-50 hover:opacity-100 uppercase tracking-widest text-brutal-ink">CANCEL</button>
        </div>

        <form onSubmit={handleBulkSubmit} className="p-8 overflow-y-auto space-y-6">
          <div className="bg-brutal-ink/5 border-2 border-brutal-border p-6 rounded-2xl space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-brutal-ink/40">CSV Format Guide</h4>
            <p className="text-[10px] font-bold text-brutal-ink/60 font-mono">
              Name, RegNo, DOB(YYYY-MM-DD), Mobile, Dept, Year, Section, Priority, Stage
            </p>
            <p className="text-[10px] italic text-brutal-ink/40">
              Priority: normal, child, disability, senior
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-brutal-ink/40">Paste CSV Data</label>
            <textarea 
              required
              rows={10}
              placeholder="John Doe, 2024001, 2005-05-15, 9876543210, AIML, 1, A, normal, 1"
              className="w-full p-6 bg-brutal-card border-4 border-brutal-border rounded-2xl font-mono text-sm focus:outline-none shadow-brutal-sm focus:shadow-brutal-md transition-all text-brutal-ink placeholder:text-brutal-ink/30"
              value={csvData}
              onChange={e => setCsvData(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-brutal-ink text-brutal-bg py-6 rounded-2xl font-black uppercase tracking-widest shadow-brutal-md hover:translate-y-[-4px] active:translate-y-0 transition-all disabled:opacity-50 border-4 border-brutal-border"
          >
            {isProcessing ? 'Processing...' : 'Upload Students'}
          </button>
        </form>
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
    priority_type: 'normal' as 'normal' | 'child' | 'disability' | 'senior',
    is_safety_secure: true,
    camera_facilities: true,
    os_security_status: 'secure' as 'secure' | 'vulnerable' | 'unknown',
    current_stage: 1
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
    <div className="fixed inset-0 bg-brutal-ink/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brutal-card border-4 border-brutal-border w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-brutal-lg">
        <div className="p-8 border-b-4 border-brutal-border flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10">
          <h3 className="text-2xl font-black uppercase tracking-tight text-brutal-ink">New Enrollment</h3>
          <button onClick={onClose} className="text-sm font-black opacity-50 hover:opacity-100 uppercase tracking-widest text-brutal-ink">CLOSE</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 text-brutal-ink">
          <div className="flex flex-col items-center gap-4 mb-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 bg-brutal-ink/5 border-4 border-dashed border-brutal-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-brutal-ink/10 transition-all overflow-hidden relative group shadow-brutal-sm"
            >
              {formData.profile_picture ? (
                <>
                  <img src={formData.profile_picture} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Pencil size={24} className="text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Plus size={32} className="opacity-20 mb-1 text-brutal-ink" />
                  <span className="text-[10px] font-black uppercase opacity-30 text-brutal-ink">Add Photo</span>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Full Name</label>
              <input required className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Reg Number</label>
              <input required className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.registration_number} onChange={e => setFormData({...formData, registration_number: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">DOB</label>
                <input type="date" required className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mobile</label>
                <input required className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Department</label>
                <select 
                  className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm"
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Year</label>
                <select 
                  className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm"
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
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Section</label>
                <select 
                  className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm"
                  value={formData.section}
                  onChange={e => setFormData({...formData, section: e.target.value as 'A' | 'B'})}
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Priority</label>
                <select 
                  className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm"
                  value={formData.priority_type}
                  onChange={e => setFormData({...formData, priority_type: e.target.value as any})}
                >
                  <option value="normal">Normal</option>
                  <option value="child">Child</option>
                  <option value="disability">Disability</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border-4 border-brutal-border rounded-xl bg-emerald-50 dark:bg-emerald-900/10 shadow-brutal-sm">
                <input 
                  type="checkbox" 
                  id="is_safety_secure"
                  className="w-6 h-6 accent-emerald-600 border-2 border-brutal-border"
                  checked={formData.is_safety_secure}
                  onChange={e => setFormData({...formData, is_safety_secure: e.target.checked})}
                />
                <label htmlFor="is_safety_secure" className="text-[10px] font-black uppercase tracking-tight cursor-pointer text-emerald-700 dark:text-emerald-400">Safety</label>
              </div>
              <div className="flex items-center gap-3 p-4 border-4 border-brutal-border rounded-xl bg-indigo-50 dark:bg-indigo-900/10 shadow-brutal-sm">
                <input 
                  type="checkbox" 
                  id="camera_facilities"
                  className="w-6 h-6 accent-indigo-600 border-2 border-brutal-border"
                  checked={formData.camera_facilities}
                  onChange={e => setFormData({...formData, camera_facilities: e.target.checked})}
                />
                <label htmlFor="camera_facilities" className="text-[10px] font-black uppercase tracking-tight cursor-pointer text-indigo-700 dark:text-indigo-400">Camera</label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">OS Security</label>
                <select 
                  className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm"
                  value={formData.os_security_status}
                  onChange={e => setFormData({...formData, os_security_status: e.target.value as any})}
                >
                  <option value="secure">Secure</option>
                  <option value="vulnerable">Vulnerable</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Initial Stage</label>
                <select 
                  className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm"
                  value={formData.current_stage}
                  onChange={e => setFormData({...formData, current_stage: parseInt(e.target.value)})}
                >
                  {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>Stage {s}</option>)}
                </select>
              </div>
            </div>
          </div>
          {error && <p className="text-red-600 text-xs font-black bg-red-50 dark:bg-red-900/30 p-3 border-2 border-red-200 rounded-xl">{error}</p>}
          <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 border-4 border-brutal-border shadow-brutal-md hover:translate-y-[-4px] transition-all">Enroll Student</button>
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Email Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Manual Report Generation</h4>
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
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Mail size={16} /> Send Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Curriculum & Quizzes</h3>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm">
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex justify-between items-center group hover:border-indigo-500 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">Year {quiz.year}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">{quiz.department}</span>
                <p className="text-[10px] font-bold uppercase text-gray-400 ml-2">{quiz.subject}</p>
              </div>
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">{quiz.title}</h4>
              <p className="text-xs text-gray-500">{quiz.time_limit} Minutes</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditingQuizId(quiz.id)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Pencil size={18} /></button>
              <button onClick={() => setQuizToDelete(quiz.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
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
    is_proctored: true,
    strict_mode: true,
    reset_attempts: false,
    stage_level: 1,
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
    if (res.ok) { 
      onAdded(); 
      onClose(); 
      // Send real-time trigger via Firebase
      await sendQuizTrigger();
    }
    else setError('Failed to save quiz');
  };

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 bg-brutal-ink/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brutal-card border-4 border-brutal-border w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-brutal-lg">
        <div className="p-8 border-b-4 border-brutal-border flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/10">
          <h3 className="text-3xl font-black uppercase tracking-tight text-brutal-ink">Quiz Architect</h3>
          <button onClick={onClose} className="text-sm font-black opacity-50 hover:opacity-100 uppercase tracking-widest text-brutal-ink">CLOSE</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-12 text-brutal-ink">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Quiz Title</label>
                <input required placeholder="e.g. Midterm Assessment" className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.title} onChange={e => setQuizData({...quizData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Subject</label>
                <input required placeholder="e.g. Mathematics" className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.subject} onChange={e => setQuizData({...quizData, subject: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Time (Min)</label>
                <input type="number" required className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.time_limit} onChange={e => setQuizData({...quizData, time_limit: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Q-Timer (Sec)</label>
                <input type="number" required className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.question_timer} onChange={e => setQuizData({...quizData, question_timer: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Target Year</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm appearance-none" value={quizData.year} onChange={e => setQuizData({...quizData, year: parseInt(e.target.value)})}>
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Department</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm appearance-none" value={quizData.department} onChange={e => setQuizData({...quizData, department: e.target.value})}>
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Section</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm appearance-none" value={quizData.section} onChange={e => setQuizData({...quizData, section: e.target.value as any})}>
                  <option value="Both">Both Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Proctored</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm appearance-none" value={quizData.is_proctored ? 'Yes' : 'No'} onChange={e => setQuizData({...quizData, is_proctored: e.target.value === 'Yes'})}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Strict Mode</label>
                <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm appearance-none" value={quizData.strict_mode ? 'Yes' : 'No'} onChange={e => setQuizData({...quizData, strict_mode: e.target.value === 'Yes'})}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Schedule Date</label>
                <input type="date" className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.scheduled_date} onChange={e => setQuizData({...quizData, scheduled_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Schedule Time</label>
                <input type="time" className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.scheduled_time} onChange={e => setQuizData({...quizData, scheduled_time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Expiry Date</label>
                <input type="date" className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.expiry_date} onChange={e => setQuizData({...quizData, expiry_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Expiry Time</label>
                <input type="time" className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={quizData.expiry_time} onChange={e => setQuizData({...quizData, expiry_time: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b-8 border-brutal-border pb-4">
              <h4 className="text-2xl font-black uppercase tracking-tighter">Questions ({quizData.questions.length})</h4>
              <div className="flex gap-4">
                <button type="button" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:opacity-70">Bulk Import</button>
                <button type="button" onClick={() => {
                  const newQs = Array(5).fill(null).map(() => ({ text: '', a: '', b: '', c: '', d: '', correct: 'a' }));
                  setQuizData({...quizData, questions: [...quizData.questions, ...newQs]});
                }} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:opacity-70">+ Add 5 Questions</button>
                <button type="button" onClick={() => setQuizData({...quizData, questions: [...quizData.questions, { text: '', a: '', b: '', c: '', d: '', correct: 'a' }]})} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:opacity-70">+ Add Question</button>
              </div>
            </div>

            <div className="space-y-12">
              {quizData.questions.map((q, i) => (
                <div key={i} className="p-10 bg-white border-4 border-brutal-border rounded-[2.5rem] space-y-8 relative shadow-brutal-sm">
                  <button type="button" onClick={() => setQuizData({...quizData, questions: quizData.questions.filter((_, idx) => idx !== i)})} className="absolute top-8 right-8 text-red-600 hover:text-red-700 transition-colors"><Trash2 size={24} /></button>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Question {i + 1}</label>
                    <textarea required placeholder="Enter your question here..." rows={3} className="w-full p-6 bg-brutal-card border-4 border-brutal-border rounded-2xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={q.text} onChange={e => {
                      const newQs = [...quizData.questions];
                      newQs[i].text = e.target.value;
                      setQuizData({...quizData, questions: newQs});
                    }} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <div key={opt} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Option {opt.toUpperCase()}</label>
                        <input required placeholder={`Enter option ${opt.toUpperCase()}`} className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm" value={(q as any)[opt]} onChange={e => {
                          const newQs = [...quizData.questions];
                          (newQs[i] as any)[opt] = e.target.value;
                          setQuizData({...quizData, questions: newQs});
                        }} />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Correct Answer</label>
                    <select className="w-full p-4 bg-brutal-card border-4 border-brutal-border rounded-xl font-black text-brutal-ink focus:outline-none shadow-brutal-sm appearance-none" value={q.correct} onChange={e => {
                      const newQs = [...quizData.questions];
                      newQs[i].correct = e.target.value;
                      setQuizData({...quizData, questions: newQs});
                    }}>
                      <option value="a">Option A</option>
                      <option value="b">Option B</option>
                      <option value="c">Option C</option>
                      <option value="d">Option D</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-black bg-red-50 dark:bg-red-900/30 p-4 border-4 border-red-200 rounded-2xl">{error}</p>}
          <button type="submit" className="w-full bg-brutal-ink text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest shadow-brutal-md hover:translate-y-[-8px] active:translate-y-0 transition-all border-4 border-brutal-border">Publish Quiz</button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Security & Safety Manager ---
function SecuritySafetyManager({ token }: { token: string }) {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setStudents(await res.json());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStudentSecurity = async (studentId: number, updates: Partial<User>) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-4xl font-black uppercase tracking-tighter text-brutal-ink leading-none">Security Control</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink/40">Student Safety & Proctoring Oversight</p>
        </div>
      </div>

      <div className="bg-white border-4 border-brutal-border rounded-[3rem] shadow-brutal-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-12 h-12 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brutal-ink/5 border-b-4 border-brutal-border">
                  <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Student Identity</th>
                  <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Priority Class</th>
                  <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Safety Status</th>
                  <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Camera Access</th>
                  <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">OS Integrity</th>
                  <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Security Stage</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-b-2 border-brutal-border/10 hover:bg-brutal-ink/5 transition-colors">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white border-4 border-brutal-border rounded-2xl overflow-hidden shadow-brutal-sm">
                          {student.profile_picture ? (
                            <img src={student.profile_picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brutal-ink/20"><UserIcon size={24} /></div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-lg text-brutal-ink uppercase tracking-tight leading-none">{student.name}</p>
                          <p className="text-[10px] font-mono font-black text-indigo-600 mt-1">{student.registration_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <select 
                        className="bg-white border-4 border-brutal-border rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none shadow-brutal-sm appearance-none cursor-pointer"
                        value={student.priority_type || 'normal'}
                        onChange={(e) => updateStudentSecurity(student.id, { priority_type: e.target.value as any })}
                      >
                        <option value="normal">Normal</option>
                        <option value="child">Child</option>
                        <option value="disability">Disability</option>
                        <option value="senior">Senior</option>
                      </select>
                    </td>
                    <td className="p-8">
                      <button 
                        onClick={() => updateStudentSecurity(student.id, { is_safety_secure: !student.is_safety_secure })}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-4 border-brutal-border shadow-brutal-sm hover:translate-y-[-4px] ${
                          student.is_safety_secure 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-600' 
                            : 'bg-red-50 text-red-700 border-red-600'
                        }`}
                      >
                        {student.is_safety_secure ? 'SECURE' : 'UNSAFE'}
                      </button>
                    </td>
                    <td className="p-8">
                      <button 
                        onClick={() => updateStudentSecurity(student.id, { camera_facilities: !student.camera_facilities })}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-4 border-brutal-border shadow-brutal-sm hover:translate-y-[-4px] ${
                          student.camera_facilities 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-600' 
                            : 'bg-brutal-ink/5 text-brutal-ink/40 border-brutal-border/20'
                        }`}
                      >
                        {student.camera_facilities ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                    <td className="p-8">
                      <select 
                        className="bg-white border-4 border-brutal-border rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none shadow-brutal-sm appearance-none cursor-pointer"
                        value={student.os_security_status || 'secure'}
                        onChange={(e) => updateStudentSecurity(student.id, { os_security_status: e.target.value as any })}
                      >
                        <option value="secure">SECURE</option>
                        <option value="vulnerable">VULNERABLE</option>
                        <option value="unknown">UNKNOWN</option>
                      </select>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(stage => (
                          <button
                            key={stage}
                            onClick={() => updateStudentSecurity(student.id, { current_stage: stage })}
                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all border-4 shadow-brutal-sm hover:translate-y-[-4px] ${
                              (student.current_stage || 1) >= stage 
                                ? 'bg-indigo-600 text-white border-brutal-border' 
                                : 'bg-white text-brutal-ink/20 border-brutal-border/20'
                            }`}
                          >
                            {stage}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
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
    <div className="bg-white border-4 border-brutal-border rounded-[3rem] overflow-hidden shadow-brutal-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-brutal-ink/5 border-b-4 border-brutal-border">
            <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Rank</th>
            <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Student Identity</th>
            <th className="p-8 text-xs font-black uppercase tracking-widest text-brutal-ink/40">Performance Score</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b-2 border-brutal-border/10 hover:bg-brutal-ink/5 transition-colors">
              <td className="p-8">
                <div className="w-12 h-12 bg-brutal-ink text-white rounded-xl flex items-center justify-center font-black text-xl shadow-brutal-sm">
                  #{i + 1}
                </div>
              </td>
              <td className="p-8">
                <div className="font-black text-xl text-brutal-ink uppercase tracking-tight leading-none">{row.name}</div>
                <div className="text-[10px] font-mono font-black text-indigo-600 mt-1">{row.registration_number}</div>
              </td>
              <td className="p-8">
                <div className="font-black text-3xl text-indigo-600 tracking-tighter">{row.totalScore}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-brutal-ink/20">Points Earned</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
