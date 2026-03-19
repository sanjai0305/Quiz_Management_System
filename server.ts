import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';

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
    const { name, registration_number, date_of_birth, mobile, department, profile_picture, year, section, priority_type } = req.body;
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
        priority_type: priority_type || 'Normal',
        created_by: (req as any).user.id
      }]);

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'A student with this registration number already exists.' });
      }
      return res.status(400).json({ error: error.message });
    }
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
    const { title, subject, time_limit, question_timer, year, department, section, questions, scheduled_at, is_proctored, strict_mode, priority_category, stage_level } = req.body;
    
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
        scheduled_at: scheduled_at || null,
        is_proctored: is_proctored || false,
        strict_mode: strict_mode || false,
        priority_category: priority_category || 'Normal',
        stage_level: stage_level || 1,
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
    const { title, subject, time_limit, question_timer, year, department, section, questions, scheduled_at, is_proctored, strict_mode, priority_category, stage_level } = req.body;
    const quizId = req.params.id;

    // Update quiz metadata
    const { error: quizError } = await supabase
      .from('quizzes')
      .update({ 
        title, 
        subject, 
        time_limit, 
        question_timer: question_timer || 0, 
        year: year || 1, 
        department: department || 'AIML', 
        section: section || 'Both',
        scheduled_at: scheduled_at || null,
        is_proctored: is_proctored || false,
        strict_mode: strict_mode || false,
        priority_category: priority_category || 'Normal',
        stage_level: stage_level || 1
      })
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
    const user = (req as any).user;
    const quizId = req.params.id;

    // If student, check if already attempted
    if (user.role === 'student') {
      const { data: existingAttempt } = await supabase
        .from('attempts')
        .select('id')
        .eq('student_id', user.id)
        .eq('quiz_id', quizId)
        .maybeSingle();
      
      if (existingAttempt) {
        return res.status(403).json({ error: 'You have already attempted this quiz.' });
      }
    }

    // Fetch quiz first
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();
    
    if (quizError) {
      if (quizError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Quiz not found' });
      }
      return res.status(500).json({ error: quizError.message });
    }

    // Fetch questions
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', req.params.id);

    if (qError) return res.status(500).json({ error: qError.message });

    // Fetch admin email separately to avoid join errors
    let adminEmail = null;
    if (quiz.created_by) {
      const { data: adminData } = await supabase
        .from('admins')
        .select('email')
        .eq('id', quiz.created_by)
        .single();
      adminEmail = adminData?.email;
    }
    
    res.json({ ...quiz, questions, admin_email: adminEmail });
  });

  // Attempts & Results
  app.post('/api/attempts', authenticateToken, async (req, res) => {
    const { quiz_id, score, total_questions, responses, malpractice_count, security_log, verification_photo } = req.body;
    const student_id = (req as any).user.id;

    // Check if already attempted
    const { data: existingAttempt } = await supabase
      .from('attempts')
      .select('id')
      .eq('student_id', student_id)
      .eq('quiz_id', quiz_id)
      .maybeSingle();

    if (existingAttempt) {
      return res.status(400).json({ error: 'You have already attempted this quiz.' });
    }

    const { error: insertError } = await supabase
      .from('attempts')
      .insert([{ 
        student_id, 
        quiz_id, 
        score, 
        total_questions,
        responses: responses || {},
        malpractice_count: malpractice_count || 0,
        security_log: security_log || [],
        verification_photo: verification_photo || null
      }]);

    if (insertError) return res.status(500).json({ error: insertError.message });

    // Check if the whole class has completed the quiz
    try {
      // Get current student's group
      const { data: student } = await supabase
        .from('students')
        .select('year, department, section')
        .eq('id', student_id)
        .single();

      if (student) {
        // Count total students in this group
        const { count: totalStudents } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('year', student.year)
          .eq('department', student.department)
          .eq('section', student.section);

        // Count attempts for this quiz from this group
        const { count: totalAttempts } = await supabase
          .from('attempts')
          .select('*, students!inner(*)', { count: 'exact', head: true })
          .eq('quiz_id', quiz_id)
          .eq('students.year', student.year)
          .eq('students.department', student.department)
          .eq('students.section', student.section);

        const isClassCompleted = totalStudents !== null && totalAttempts !== null && totalAttempts >= totalStudents;
        
        return res.json({ 
          success: true, 
          classCompleted: isClassCompleted,
          completedGroup: `${student.year} Year - ${student.department} - Section ${student.section}`
        });
      }
    } catch (err) {
      console.error('Error checking class completion:', err);
    }

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
    const userId = (req as any).user.id;
    
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { data: results, error } = await supabase
      .from('attempts')
      .select(`
        quiz_id,
        score,
        total_questions,
        attempt_date,
        responses,
        quizzes:quiz_id (title)
      `)
      .eq('student_id', Number(userId))
      .order('attempt_date', { ascending: false });

    if (error) {
      console.error('Supabase Error Details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return res.status(500).json({ error: error.message });
    }

    const formatted = (results || []).map((a: any) => ({
      quiz_id: a.quiz_id,
      title: a.quizzes?.title || 'Unknown Quiz',
      score: a.score,
      total_questions: a.total_questions,
      attempt_date: a.attempt_date,
      responses: a.responses
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
        malpractice_count,
        quizzes:quiz_id (title)
      `)
      .eq('student_id', req.params.id)
      .order('attempt_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = (results || []).map((a: any) => ({
      title: a.quizzes?.title || 'Unknown Quiz',
      score: a.score,
      total_questions: a.total_questions,
      attempt_date: a.attempt_date,
      malpractice_count: a.malpractice_count
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

  // Manual Report Trigger (Admin)
  app.post('/api/admin/trigger-report', authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    
    const { date } = req.body; // YYYY-MM-DD
    const targetDate = date || new Date().toISOString().split('T')[0];

    console.log(`Manual report triggered for date: ${targetDate} by admin: ${(req as any).user.id}`);

    try {
      const { data: quizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .gte('scheduled_at', `${targetDate}T00:00:00`)
        .lte('scheduled_at', `${targetDate}T23:59:59`);

      if (quizError) throw quizError;
      if (!quizzes || quizzes.length === 0) {
        return res.status(404).json({ error: `No quizzes found for ${targetDate}. Make sure the quiz has a scheduled date set.` });
      }

      let reportsSent = 0;
      for (const quiz of quizzes) {
        // ... (rest of the logic remains same, just adding more logging)
        console.log(`Generating report for quiz: ${quiz.title} (ID: ${quiz.id})`);
        
        let studentQuery = supabase
          .from('students')
          .select('id, name, registration_number, year, department, section')
          .eq('year', quiz.year)
          .eq('department', quiz.department);

        if (quiz.section !== 'Both') {
          studentQuery = studentQuery.eq('section', quiz.section);
        }

        const { data: students, error: studentError } = await studentQuery;
        if (studentError) throw studentError;

        const { data: attempts, error: attemptError } = await supabase
          .from('attempts')
          .select('student_id, score, total_questions, attempt_date')
          .eq('quiz_id', quiz.id);

        if (attemptError) throw attemptError;

        const reportData = students.map(student => {
          const attempt = attempts.find(a => a.student_id === student.id);
          return {
            'Student Name': student.name,
            'Reg Number': student.registration_number,
            'Year': student.year,
            'Department': student.department,
            'Section': student.section,
            'Status': attempt ? 'COMPLETED' : 'PENDING',
            'Score': attempt ? `${attempt.score}/${attempt.total_questions}` : 'N/A',
            'Attempt Date': attempt ? new Date(attempt.attempt_date).toLocaleString() : 'N/A'
          };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Fetch admin email
        let adminEmail = process.env.VITE_ADMIN_EMAIL;
        if (quiz.created_by) {
          const { data: adminData } = await supabase
            .from('admins')
            .select('email')
            .eq('id', quiz.created_by)
            .single();
          if (adminData?.email) adminEmail = adminData.email;
        }

        if (!adminEmail) {
          console.warn(`No admin email found for quiz ${quiz.id}, skipping.`);
          continue;
        }

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          throw new Error('SMTP credentials are not configured in environment variables.');
        }

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: `"Quiz System" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `Manual Quiz Report: ${quiz.title} (${targetDate})`,
          text: `Please find attached the manual completion report for the quiz "${quiz.title}" scheduled on ${targetDate}.`,
          attachments: [
            {
              filename: `Manual_Report_${quiz.title}_${targetDate}.xlsx`,
              content: buffer
            }
          ]
        });
        reportsSent++;
      }

      res.json({ success: true, message: `Successfully sent ${reportsSent} reports for ${targetDate}` });
    } catch (err: any) {
      console.error('Error triggering manual report:', err);
      res.status(500).json({ error: err.message || 'Failed to send reports. Check SMTP configuration.' });
    }
  });

  // SMTP Test Endpoint
  app.post('/api/admin/test-smtp', authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    
    const { testEmail } = req.body;
    if (!testEmail) return res.status(400).json({ error: 'Test email address is required' });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({ error: 'SMTP_USER and SMTP_PASS environment variables are missing.' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.verify();
      
      await transporter.sendMail({
        from: `"Quiz System Test" <${process.env.SMTP_USER}>`,
        to: testEmail,
        subject: 'SMTP Configuration Test',
        text: 'If you are reading this, your SMTP configuration for the Quiz System is working correctly!'
      });

      res.json({ success: true, message: 'Test email sent successfully!' });
    } catch (err: any) {
      console.error('SMTP Test Error:', err);
      res.status(500).json({ error: err.message || 'SMTP connection failed' });
    }
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

  // --- Daily Report Cron Job ---
  // Runs every day at 12:00 AM (midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily quiz report cron job...');
    try {
      // 1. Get quizzes from "yesterday"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: quizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .gte('scheduled_at', `${yesterdayStr}T00:00:00`)
        .lte('scheduled_at', `${yesterdayStr}T23:59:59`);

      if (quizError) throw quizError;
      if (!quizzes || quizzes.length === 0) {
        console.log('No quizzes found for yesterday.');
        return;
      }

      // 2. For each quiz, generate report
      for (const quiz of quizzes) {
        // Fetch admin email
        let adminEmail = process.env.VITE_ADMIN_EMAIL;
        if (quiz.created_by) {
          const { data: adminData } = await supabase
            .from('admins')
            .select('email')
            .eq('id', quiz.created_by)
            .single();
          if (adminData?.email) adminEmail = adminData.email;
        }

        if (!adminEmail) {
          console.warn(`No admin email found for quiz ${quiz.id}, skipping report.`);
          continue;
        }

        // Get target students
        let studentQuery = supabase
          .from('students')
          .select('id, name, registration_number, year, department, section')
          .eq('year', quiz.year)
          .eq('department', quiz.department);

        if (quiz.section !== 'Both') {
          studentQuery = studentQuery.eq('section', quiz.section);
        }

        const { data: students, error: studentError } = await studentQuery;
        if (studentError) throw studentError;

        // Get attempts
        const { data: attempts, error: attemptError } = await supabase
          .from('attempts')
          .select('student_id, score, total_questions, attempt_date')
          .eq('quiz_id', quiz.id);

        if (attemptError) throw attemptError;

        // 3. Prepare Excel Data
        const reportData = students.map(student => {
          const attempt = attempts.find(a => a.student_id === student.id);
          return {
            'Student Name': student.name,
            'Reg Number': student.registration_number,
            'Year': student.year,
            'Department': student.department,
            'Section': student.section,
            'Status': attempt ? 'COMPLETED' : 'PENDING',
            'Score': attempt ? `${attempt.score}/${attempt.total_questions}` : 'N/A',
            'Attempt Date': attempt ? new Date(attempt.attempt_date).toLocaleString() : 'N/A'
          };
        });

        // 4. Create Excel File
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // 5. Send Email
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: `"Quiz System" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `Daily Quiz Report: ${quiz.title} (${yesterdayStr})`,
          text: `Please find attached the completion report for the quiz "${quiz.title}" scheduled on ${yesterdayStr}.`,
          attachments: [
            {
              filename: `Quiz_Report_${quiz.title}_${yesterdayStr}.xlsx`,
              content: buffer
            }
          ]
        });

        console.log(`Report sent for quiz ${quiz.id} to ${adminEmail}`);
      }
    } catch (err) {
      console.error('Error in daily report cron job:', err);
    }
  });
}

startServer();
