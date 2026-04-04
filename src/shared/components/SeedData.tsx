import React, { useEffect, useState } from 'react';
import { useAuth } from '../../App';
import { supabase } from '../lib/supabase';

export default function SeedData() {
  const { token, user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const seed = async () => {
    if (!token || user?.role !== 'admin') {
      setStatus('error');
      setMessage('You must be logged in as an admin to seed data.');
      return;
    }

    setStatus('loading');
    try {
      const students = [];
      for (let i = 61; i <= 120; i++) {
        students.push({
          name: `Student${i}`,
          registration_number: `${i}`,
          date_of_birth: '23-03-2026',
          mobile: '0000000000',
          department: 'AIML',
          year: 2,
          section: 'B',
          role: 'student',
          priority_type: 'normal',
          is_safety_secure: true,
          camera_facilities: true,
          os_security_level: 'standard',
          stage: 1
        });
      }

      const { error } = await supabase
        .from('students')
        .insert(students);

      if (!error) {
        setStatus('success');
        setMessage(`Successfully added ${students.length} students.`);
      } else {
        setStatus('error');
        setMessage(error.message || 'Failed to seed students.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error while seeding data.');
    }
  };

  if (user?.email !== 'sanjaim0940r@gmail.com' && user?.email !== 'sanjaim2006r@gmail.com') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div className="bg-white border-2 border-[#141414] p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] max-w-xs">
        <h4 className="font-bold uppercase text-xs mb-2">Data Seeder</h4>
        {status === 'idle' && (
          <button 
            onClick={seed}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all"
          >
            Seed Student Data (61-120)
          </button>
        )}
        {status === 'loading' && <p className="text-[10px] font-bold animate-pulse">Seeding data...</p>}
        {status === 'success' && <p className="text-[10px] font-bold text-emerald-600">{message}</p>}
        {status === 'error' && <p className="text-[10px] font-bold text-red-600">{message}</p>}
      </div>
    </div>
  );
}
