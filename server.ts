import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dhxkwbjtsldlfctwgntr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeGt3Ymp0c2xkbGZjdHdnbnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTk2MTQsImV4cCI6MjA4ODc5NTYxNH0.mz9LC01m_JvnLj_BVxJgi0pwlUIITJcY10Xmxf2ARuo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- API Routes ---

  // Admin Auth
  app.post("/api/admin/login", async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ token: "admin-token-" + data.id, user: data });
  });

  app.post("/api/admin/register", async (req, res) => {
    const { name, email, password } = req.body;
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password, role: 'admin' }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ user: data });
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;
    const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('email', email)
      .eq('role', 'admin');

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Password reset successful" });
  });

  // Student Auth
  app.post("/api/student/login", async (req, res) => {
    const { registrationNumber, dateOfBirth } = req.body;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('registration_number', registrationNumber)
      .eq('date_of_birth', dateOfBirth)
      .eq('role', 'student')
      .single();

    if (error || !data) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ token: "student-token-" + data.id, user: data });
  });

  // Students Management
  app.get("/api/students", async (req, res) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/students", async (req, res) => {
    const studentData = req.body;
    const { data, error } = await supabase
      .from('users')
      .insert([{ ...studentData, role: 'student' }])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/students/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/students/bulk", async (req, res) => {
    const students = req.body;
    const { data, error } = await supabase
      .from('users')
      .insert(students.map((s: any) => ({ ...s, role: 'student' })))
      .select();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/admin/student/:id", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/admin/student/:id/results", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/student/results", async (req, res) => {
    // In a real app, we'd get the student ID from the token
    const { data, error } = await supabase
      .from('attempts')
      .select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Quizzes Management
  app.get("/api/quizzes", async (req, res) => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/quizzes", async (req, res) => {
    const quizData = req.body;
    const { data, error } = await supabase
      .from('quizzes')
      .insert([quizData])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/quizzes/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/quizzes/:id", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.put("/api/quizzes/:id", async (req, res) => {
    const { id } = req.params;
    const quizData = req.body;
    const { data, error } = await supabase
      .from('quizzes')
      .update(quizData)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Reports
  app.post("/api/admin/trigger-report", async (req, res) => {
    const { date } = req.body;
    // Mocking report generation for now
    console.log(`Generating report for ${date}`);
    res.json({ message: "Reports sent successfully" });
  });

  // Leaderboard / Attempts
  app.get("/api/leaderboard", async (req, res) => {
    const { data, error } = await supabase
      .from('attempts')
      .select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/quiz/submit", async (req, res) => {
    const attemptData = req.body;
    const { data, error } = await supabase
      .from('attempts')
      .insert([attemptData])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
