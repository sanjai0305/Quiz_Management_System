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

const JWT_SECRET = 'super-secret-key-for-mini-project';

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
    const { name, registration_number, date_of_birth, mobile, department, profile_picture, priority_type } = req.body;
    const { data, error } = await supabase
      .from('students')
      .insert([{ 
        name, 
        registration_number, 
        date_of_birth, 
        mobile, 
        department, 
        profile_picture, 
        priority_type: priority_type || 'general' 
      }]);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.get('/api/students', authenticateToken, async (req, res) => {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, registration_number, date_of_birth, mobile, department, profile_picture, priority_type');
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(students);
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
    const { title, subject, time_limit, stage, questions } = req.body;
    
    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([{ 
        title, 
        subject, 
        time_limit, 
        stage: stage || 1, 
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
    const { title, subject, time_limit, stage, questions } = req.body;
    const quizId = req.params.id;

    // Update quiz metadata
    const { error: quizError } = await supabase
      .from('quizzes')
      .update({ title, subject, time_limit, stage: stage || 1 })
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
    const { data: quizzes, error } = await supabase.from('quizzes').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(quizzes);
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
    const { data: leaderboard, error } = await supabase
      .from('attempts')
      .select(`
        score,
        total_questions,
        attempt_date,
        students (name, registration_number),
        quizzes (title)
      `)
      .order('score', { ascending: false })
      .order('attempt_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    
    // Format for frontend
    const formatted = leaderboard.map((a: any) => ({
      name: a.students.name,
      registration_number: a.students.registration_number,
      quiz_name: a.quizzes.title,
      score: a.score,
      total_questions: a.total_questions,
      attempt_date: a.attempt_date
    }));

    res.json(formatted);
  });

  app.get('/api/student/results', authenticateToken, async (req, res) => {
    const { data: results, error } = await supabase
      .from('attempts')
      .select(`
        score,
        total_questions,
        attempt_date,
        quizzes (title)
      `)
      .eq('student_id', (req as any).user.id)
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the dist directory
    const distPath = path.resolve(__dirname, 'dist');
    console.log('Serving production build from:', distPath);
    
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is live and listening on 0.0.0.0:${PORT}`);
  });
}

startServer();
