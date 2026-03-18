export interface User {
  id: number;
  name: string;
  email?: string;
  registration_number?: string;
  date_of_birth?: string;
  mobile?: string;
  role: 'admin' | 'student';
  department?: string;
  section?: 'A' | 'B';
  profile_picture?: string;
  year?: number;
}

export interface Quiz {
  id: number;
  title: string;
  subject: string;
  time_limit: number;
  question_timer?: number; // Seconds per question
  year: number;
  department: string;
  section: 'A' | 'B' | 'Both';
  questions?: Question[];
}

export interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

export interface Attempt {
  id: number;
  student_id: number;
  quiz_id: number;
  name: string;
  registration_number: string;
  quiz_name: string;
  score: number;
  total_questions: number;
  attempt_date: string;
  responses?: Record<number, string>; // question_id -> selected_option
}
