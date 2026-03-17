import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dhxkwbjtsldlfctwgntr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeGt3Ymp0c2xkbGZjdHdnbnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTk2MTQsImV4cCI6MjA4ODc5NTYxNH0.mz9LC01m_JvnLj_BVxJgi0pwlUIITJcY10Xmxf2ARuo';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-mini-project';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Request logging for debugging production connectivity
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Admin Auth
  app.post('/api/admin/register', async (req, res) => {
    const { name, email, password } = req.body;
    const { data, error } = await supabase
      .from('admins')
      .insert([{ name, email, password }])
      .select();
    
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (admin) {
      const token = jwt.sign({ id: admin.id, role: 'admin' }, JWT_SECRET);
      res.json({ token, user: { name: admin.name, email: admin.email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/admin/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    
    // Check if admin exists
    const { data: admin, error: findError } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .single();

    if (findError || !admin) {
      return res.status(404).json({ error: 'Admin with this email not found' });
    }

    // Update password
    const { error: updateError } = await supabase
      .from('admins')
      .update({ password: newPassword })
      .eq('email', email);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ success: true, message: 'Password reset successful' });
  });

  // Student Auth
  app.post('/api/student/login', async (req, res) => {
    const { registration_number, date_of_birth } = req.body;
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('registration_number', registration_number)
      .eq('date_of_birth', date_of_birth)
      .single();

    if (student) {
      const token = jwt.sign({ id: student.id, role: 'student' }, JWT_SECRET);
      res.json({ token, user: student });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Student Management (Admin)
  app.post('/api/students', authenticateToken, async (req, res) => {
    const { name, registration_number, date_of_birth, mobile, department, profile_picture, year, section } = req.body;
    const { data, error } = await supabase
      .from('students')
      .insert([{ 
        name, 
        registration_number, 
        date_of_birth, 
        mobile, 
        department, 
        profile_picture, 
        year: year || 1,
        section: section || 'A',
        created_by: (req as any).user.id
      }]);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.get('/api/students', authenticateToken, async (req, res) => {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('created_by', (req as any).user.id);
      
      if (error) {
        console.error('Supabase Error:', error);
        return res.status(500).json([]); // Return empty array to prevent frontend crash
      }
      res.json(students || []);
    } catch (err) {
      console.error('Server Error:', err);
      res.status(500).json([]);
    }
  });

  app.delete('/api/students/:id', authenticateToken, async (req, res) => {
    const studentId = req.params.id;
    // Delete student's attempts first
    await supabase.from('attempts').delete().eq('student_id', studentId);
    // Delete the student
    const { error } = await supabase.from('students').delete().eq('id', studentId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Quiz Management
  app.post('/api/quizzes', authenticateToken, async (req, res) => {
    const { title, subject, time_limit, question_timer, year, department, section, questions } = req.body;
    
    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([{ 
        title, 
        subject, 
        time_limit, 
        question_timer: question_timer || 0,
        year: year || 1, 
        department: department || 'AIML',
        section: section || 'Both',
        created_by: (req as any).user.id 
      }])
      .select()
      .single();

    if (quizError) return res.status(500).json({ error: quizError.message });

    // Insert questions
    const questionsToInsert = questions.map((q: any) => ({
      quiz_id: quiz.id,
      question_text: q.text,
      option_a: q.a,
      option_b: q.b,
      option_c: q.c,
      option_d: q.d,
      correct_answer: q.correct
    }));

    const { error: qError } = await supabase.from('questions').insert(questionsToInsert);

    if (qError) return res.status(500).json({ error: qError.message });

    res.json({ success: true, quizId: quiz.id });
  });

  app.put('/api/quizzes/:id', authenticateToken, async (req, res) => {
    const { title, subject, time_limit, question_timer, year, department, section, questions } = req.body;
    const quizId = req.params.id;

    // Update quiz metadata
    const { error: quizError } = await supabase
      .from('quizzes')
      .update({ title, subject, time_limit, question_timer: question_timer || 0, year: year || 1, department: department || 'AIML', section: section || 'Both' })
      .eq('id', quizId);

    if (quizError) return res.status(500).json({ error: quizError.message });

    // Delete old questions
    await supabase.from('questions').delete().eq('quiz_id', quizId);

    // Insert new questions
    const questionsToInsert = questions.map((q: any) => ({
      quiz_id: quizId,
      question_text: q.text,
      option_a: q.a,
      option_b: q.b,
      option_c: q.c,
      option_d: q.d,
      correct_answer: q.correct
    }));

    const { error: qError } = await supabase.from('questions').insert(questionsToInsert);

    if (qError) return res.status(500).json({ error: qError.message });
    res.json({ success: true });
  });

  app.get('/api/quizzes', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    
    if (user.role === 'admin') {
      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('created_by', user.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(quizzes);
    } else {
      // For students, get their profile first to filter quizzes
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('department, year, section')
        .eq('id', user.id)
        .single();
      
      if (studentError || !student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const { data: quizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('department', student.department)
        .eq('year', student.year)
        .or(`section.eq.${student.section},section.eq.Both`);

      if (quizError) return res.status(500).json({ error: quizError.message });
      return res.json(quizzes);
    }
  });

  app.delete('/api/quizzes/:id', authenticateToken, async (req, res) => {
    const quizId = req.params.id;
    // Delete related questions first
    await supabase.from('questions').delete().eq('quiz_id', quizId);
    // Delete related attempts
    await supabase.from('attempts').delete().eq('quiz_id', quizId);
    // Delete the quiz
    const { error } = await supabase.from('quizzes').delete().eq('id', quizId).eq('created_by', (req as any).user.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get('/api/quizzes/:id', authenticateToken, async (req, res) => {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (quizError) return res.status(500).json({ error: quizError.message });

    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', req.params.id);

    if (qError) return res.status(500).json({ error: qError.message });
    res.json({ ...quiz, questions });
  });

  // Attempts & Results
  app.post('/api/attempts', authenticateToken, async (req, res) => {
    const { quiz_id, score, total_questions } = req.body;
    const { error } = await supabase
      .from('attempts')
      .insert([{ 
        student_id: (req as any).user.id, 
        quiz_id, 
        score, 
        total_questions 
      }]);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get('/api/leaderboard', authenticateToken, async (req, res) => {
    const { year, department, section } = req.query;
    const user = (req as any).user;

    let query = supabase
      .from('attempts')
      .select(`
        score,
        total_questions,
        students!inner (id, name, registration_number, year, department, section, created_by)
      `);

    if (user.role === 'student') {
      const { data: student } = await supabase.from('students').select('*').eq('id', user.id).single();
      if (student) {
        query = query.eq('students.year', student.year)
                     .eq('students.department', student.department)
                     .eq('students.section', student.section);
      }
    } else {
      if (year) query = query.eq('students.year', year);
      if (department) query = query.eq('students.department', department);
      if (section) query = query.eq('students.section', section);
      query = query.eq('students.created_by', user.id);
    }

    const { data: attempts, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    const studentMap: Record<number, any> = {};
    attempts.forEach((a: any) => {
      const s = a.students;
      if (!studentMap[s.id]) {
        studentMap[s.id] = {
          id: s.id,
          name: s.name,
          registration_number: s.registration_number,
          year: s.year,
          department: s.department,
          section: s.section,
          totalScore: 0,
          totalQuestions: 0,
          attempts: 0
        };
      }
      studentMap[s.id].totalScore += a.score;
      studentMap[s.id].totalQuestions += a.total_questions;
      studentMap[s.id].attempts += 1;
    });

    const leaderboard = Object.values(studentMap)
      .map((s: any) => ({
        ...s,
        percentage: s.totalQuestions > 0 ? (s.totalScore / s.totalQuestions) * 100 : 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore || b.percentage - a.percentage);

    res.json(leaderboard);
  });

  app.get('/api/student/results', authenticateToken, async (req, res) => {
    const { data: results, error } = await supabase
      .from('attempts')
      .select(`
        quiz_id,
        score,
        total_questions,
        attempt_date,
        quizzes (title)
      `)
      .eq('student_id', (req as any).user.id)
      .order('attempt_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = results.map((a: any) => ({
      quiz_id: a.quiz_id,
      title: a.quizzes.title,
      score: a.score,
      total_questions: a.total_questions,
      attempt_date: a.attempt_date
    }));

    res.json(formatted);
  });

  app.get('/api/admin/student/:id', authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(student);
  });

  app.get('/api/admin/student/:id/results', authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { data: results, error } = await supabase
      .from('attempts')
      .select(`
        score,
        total_questions,
        attempt_date,
        quizzes (title)
      `)
      .eq('student_id', req.params.id)
      .order('attempt_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = results.map((a: any) => ({
      title: a.quizzes.title,
      score: a.score,
      total_questions: a.total_questions,
      attempt_date: a.attempt_date
    }));

    res.json(formatted);
  });

  app.delete('/api/students/:id', authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Student deleted successfully' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production (Railway/Vercel), serve static files
    const distPath = path.resolve(process.cwd(), 'dist');
    
    // Check if dist exists before trying to serve
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      // If it's an API route that wasn't caught, don't serve index.html
      if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          res.status(500).send("Build files not found. Please ensure 'npm run build' was executed.");
        }
      });
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is live and listening on 0.0.0.0:${PORT}`);
  });
}

startServer();
