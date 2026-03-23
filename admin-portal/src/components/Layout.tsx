import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { LogOut, ShieldCheck } from 'lucide-react';
import { AccessibilityMenu } from './AccessibilityMenu';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      <nav className="bg-white border-b border-[#141414]/10 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#141414] text-white p-2 rounded-lg">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">MIT - ADMIN PORTAL</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-semibold text-indigo-600">Secure Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border-l border-[#141414]/10 pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user?.name}</p>
              <p className="text-[10px] uppercase opacity-50">{user?.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
      
      <AccessibilityMenu />

      <footer className="mt-auto py-8 border-t border-[#141414]/5 text-center">
        <p className="text-xs text-[#141414]/40 font-medium uppercase tracking-widest">
          &copy; 2026 MAHENDRA INSTITUTE OF TECHNOLOGY • Admin Portal
        </p>
      </footer>
    </div>
  );
}
