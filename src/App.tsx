import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './shared/types';
import Login from './shared/pages/Login';
import AdminDashboard from './apps/admin/pages/AdminDashboard';
import StudentDashboard from './apps/student/pages/StudentDashboard';
import StudentPreview from './apps/admin/pages/StudentPreview';
import QuizPage from './apps/student/pages/QuizPage';
import SeedData from './shared/components/SeedData';
import { AlertCircle } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const ProtectedRoute = ({ children, role }: { children: ReactNode, role: 'admin' | 'student' }) => {
  const { user, token } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure state is settled and avoid flash of login
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#141414] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user || user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] p-3 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <BrowserRouter>
        <SeedData />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-preview/:id"
            element={
              <ProtectedRoute role="admin">
                <StudentPreview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id"
            element={
              <ProtectedRoute role="student">
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
