export interface User {
  id: string;
  name: string;
  email?: string;
  registration_number?: string;
  date_of_birth?: string;
  role: 'admin' | 'student';
  department?: string;
  year?: number;
  section?: string;
  profile_picture?: string;
  priority_type?: 'normal' | 'child' | 'disability' | 'senior';
  is_safety_secure?: boolean;
  camera_facilities?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  total_questions: number;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  text: string;
  options: string[];
  correct_answer: number;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  completed_at: string;
  answers: Record<string, number>;
}
