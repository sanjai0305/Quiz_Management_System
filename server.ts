import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
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

// --- Live Quiz State ---
const liveSessions = new Map<string, { 
  isLive: boolean, 
  students: Set<string>, // Connected student IDs
  excluded: Set<string>  // Absent/Excluded student IDs
}>();

let io: Server;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json({ limit: '10mb' }));

  // --- Socket.io Logic ---
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_quiz', ({ quizId, userId, role }) => {
      const qId = String(quizId);
      socket.join(`quiz_${qId}`);
      
      if (!liveSessions.has(qId)) {
        liveSessions.set(qId, { isLive: false, students: new Set(), excluded: new Set() });
      }
      
      const session = liveSessions.get(qId)!;
      if (role === 'student' && userId) {
        session.students.add(String(userId));
      }
      
      // Notify everyone in the room about student presence
      io.to(`quiz_${qId}`).emit('presence_update', {
        onlineStudents: Array.from(session.students),
        excludedStudents: Array.from(session.excluded),
        isLive: session.isLive
      });

      // If admin joins, broadcast to all students that a session is available
      if (role === 'admin') {
        io.emit('session_available', { quizId: qId });
      }
    });

    socket.on('start_quiz', ({ quizId }) => {
      const qId = String(quizId);
      const session = liveSessions.get(qId);
      if (session) {
        session.isLive = true;
        io.to(`quiz_${qId}`).emit('quiz_started', { quizId: qId });
      }
    });

    socket.on('stop_quiz', ({ quizId }) => {
      const qId = String(quizId);
      const session = liveSessions.get(qId);
      if (session) {
        session.isLive = false;
        io.to(`quiz_${qId}`).emit('quiz_stopped', { quizId: qId });
      }
    });

    socket.on('toggle_absent', ({ quizId, studentId, isAbsent }) => {
      const qId = String(quizId);
      const session = liveSessions.get(qId);
      if (session) {
        const sId = String(studentId);
        if (isAbsent) session.excluded.add(sId);
        else session.excluded.delete(sId);
        
        io.to(`quiz_${qId}`).emit('presence_update', {
          onlineStudents: Array.from(session.students),
          excludedStudents: Array.from(session.excluded),
          isLive: session.isLive
        });
      }
    });

    socket.on('toggle_manual_presence', ({ quizId, studentId, isPresent }) => {
      const qId = String(quizId);
      const session = liveSessions.get(qId);
      if (session) {
        const sId = String(studentId);
        if (isPresent) session.students.add(sId);
        else session.students.delete(sId);
        
        io.to(`quiz_${qId}`).emit('presence_update', {
          onlineStudents: Array.from(session.students),
          excludedStudents: Array.from(session.excluded),
          isLive: session.isLive
        });
      }
    });

    socket.on('security_violation', async ({ quizId, userId, type }) => {
      const qId = String(quizId);
      console.log(`Security violation: Quiz ${qId}, User ${userId}, Type ${type}`);
      
      // Broadcast to admin in the room
      io.to(`quiz_${qId}`).emit('security_alert', { userId, type });

      // Save to database
      try {
        await supabase.from('security_violations').insert([{
          quiz_id: parseInt(qId),
          student_id: String(userId),
          violation_type: type
        }]);
      } catch (err) {
        console.error('Error saving security violation:', err);
      }
    });

    socket.on('get_active_sessions', () => {
      const activeIds = Array.from(liveSessions.keys());
      socket.emit('active_sessions_list', { quizIds: activeIds });
    });

    socket.on('disconnect', () => {
      // If an admin disconnects, notify students that the session is closed
      // This is a bit complex because we need to know if the socket was an admin for a specific quiz
      // For now, let's add an explicit 'close_session' event
    });

    socket.on('close_session', ({ quizId }) => {
      const qId = String(quizId);
      io.emit('session_closed', { quizId: qId });
    });
  });

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

    // Notify all students to refresh their quiz list
    io.emit('quiz_created');

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
    const { data: leaderboard, error } = await supabase
      .from('attempts')
      .select(`
        score,
        total_questions,
        attempt_date,
        students!inner (name, registration_number, created_by),
        quizzes (title)
      `)
      .eq('students.created_by', (req as any).user.id)
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
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is live and listening on 0.0.0.0:${PORT}`);
  });
}

startServer();
