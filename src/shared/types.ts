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
  os_security_status?: 'secure' | 'vulnerable' | 'unknown';
  current_stage?: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  total_questions: number;
  created_at: string;
  year?: number;
  department?: string;
  section?: string;
  subject?: string;
  time_limit?: number;
  expires_at?: string;
  scheduled_at?: string;
  question_timer?: number;
  priority_category?: string;
  stage_level?: number;
}

export interface Question {
  id: string;
  quiz_id: string;
  text: string;
  options: string[];
  correct_answer: number;
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
}

export interface Attempt {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  completed_at: string;
  answers: Record<string, number>;
  attempt_date: string;
  verification_photo?: string;
  malpractice_count?: number;
  title?: string;
  total_questions?: number;
  responses?: any;
  questions?: any;
  is_malpractice?: boolean;
}
