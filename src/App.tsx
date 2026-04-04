import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { supabase } from './shared/lib/supabase';
import { User } from './shared/types';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentLogin from './pages/student/Login';
import QuizPage from './pages/student/QuizPage';
import SecurityDashboard from './pages/admin/SecurityDashboard';
import StudentPreview from './pages/admin/StudentPreview';
import { Shield, User as UserIcon, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Theme Context ---
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className="fixed bottom-8 right-8 z-[500] w-14 h-14 bg-brutal-ink text-brutal-bg border-4 border-brutal-ink rounded-2xl shadow-brutal-sm flex items-center justify-center transition-colors duration-300"
    >
      {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
    </motion.button>
  );
}

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export const API_BASE_URL = '';

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Protected Route ---
function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'student' }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-brutal-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brutal-ink border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/student/login'} />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

// --- Landing Page ---
function LandingPage() {
  return (
    <div className="min-h-screen bg-brutal-bg flex items-center justify-center p-8 transition-colors duration-300">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-brutal-bg border-4 border-brutal-border p-12 text-center space-y-8 rounded-3xl shadow-brutal-lg"
        >
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border-2 border-brutal-border">
            <Shield size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tight text-brutal-ink">Admin Portal</h2>
            <p className="text-sm font-bold opacity-50 uppercase tracking-widest text-brutal-ink">Command Center</p>
          </div>
          <Link 
            to="/admin/login"
            className="inline-flex items-center justify-center w-full py-4 bg-brutal-ink text-brutal-bg rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all border-2 border-brutal-border shadow-brutal-sm"
          >
            Enter System
          </Link>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-brutal-bg border-4 border-brutal-border p-12 text-center space-y-8 rounded-3xl shadow-brutal-lg"
        >
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border-2 border-brutal-border">
            <UserIcon size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tight text-brutal-ink">Student Portal</h2>
            <p className="text-sm font-bold opacity-50 uppercase tracking-widest text-brutal-ink">Learning Environment</p>
          </div>
          <Link 
            to="/student/login"
            className="inline-flex items-center justify-center w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all border-2 border-brutal-border shadow-brutal-sm"
          >
            Start Learning
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ThemeToggle />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <div className="min-h-screen bg-brutal-bg text-brutal-ink p-4 md:p-8">
                  <AdminDashboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/admin/security" element={
              <ProtectedRoute role="admin">
                <SecurityDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/preview/:studentId" element={
              <ProtectedRoute role="admin">
                <StudentPreview />
              </ProtectedRoute>
            } />

            {/* Student Routes */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student" element={
              <ProtectedRoute role="student">
                <div className="min-h-screen bg-brutal-bg text-brutal-ink p-4 md:p-8">
                  <StudentDashboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/student/quiz/:quizId" element={
              <ProtectedRoute role="student">
                <QuizPage />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
