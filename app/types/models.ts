export interface User {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
  membership_date: string | null;
  password: string;
  remember_me_token: string | null;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  user_agent: string | null;
  expires_at: number | null;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface Asset {
  id: string;
  name: string | null;
  type: string;
  url: string;
  mime_type: string | null;
  size: number | null;
  s3_key: string | null;
  user_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  created_at: number;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: number;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_at: number;
  end_at: number;
  is_active: number;
  is_grades_published: number;
  created_at: number;
  updated_at: number;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  academic_year_id: string;
  student_count?: number;
  created_at: number;
  updated_at: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  kkm: number;
  created_at: number;
  updated_at: number;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  class_id: string;
  parent_user_id: string | null;
  phone: string | null;
  address: string | null;
  created_at: number;
  updated_at: number;
}

export interface Teacher {
  id: string;
  user_id: string;
  employee_id: string | null;
  phone: string | null;
  created_at: number;
  updated_at: number;
}
export interface TeacherClassAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  academic_year_id: string;
  is_homeroom: number;
  created_at: number;
}


export interface Parent {
  id: string;
  user_id: string;
  phone: string | null;
  address: string | null;
  created_at: number;
  updated_at: number;
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  academic_year_id: string;
  created_at: number;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  academic_year_id: string;
  created_at: number;
}

export interface Schedule {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_user_id: string;
  day_of_week: number;
  start_time: number;
  end_time: number;
  academic_year_id: string;
  created_at: number;
  updated_at: number;
}

export interface SchoolLocation {
  id: string;
  name: string;
  npsn: string | null;
  headmaster_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number | null;
  start_time: string | null;
  is_active: number;
  created_at: number;
}

export interface TeacherConfirmation {
  id: string;
  schedule_id: string | null;
  teacher_user_id: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  is_inside_school: number;
  confirmation_date: number | null;
  confirmed_at: number;
  created_at: number;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: number;
}

export interface TeacherConfirmationLogView {
  id: string;
  teacher_name: string;
  teacher_username: string;
  confirmation_date: number;
  confirmed_at: number;
}

export interface Journal {
  id: string;
  schedule_id: string;
  teacher_confirmation_id: string;
  date: number;
  material: string;
  created_at: number;
  updated_at: number;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  schedule_id: string;
  journal_id: string;
  status: 'present' | 'sick' | 'leave' | 'absent';
  created_at: number;
  updated_at: number;
}

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  type: 'task' | 'daily_quiz' | 'midterm' | 'final';
  score: number;
  date: number;
  teacher_user_id: string;
  created_at: number;
  updated_at: number;
}

export interface GradeComponent {
  id: string;
  academic_year_id: string;
  type: string;
  name: string;
  weight: number;
  created_at: number;
  updated_at: number;
}

export interface GradeAuditLog {
  id: string;
  grade_id: string | null;
  student_id: string;
  subject_id: string;
  class_id: string;
  type: string;
  action: 'create' | 'update' | 'delete';
  old_score: number | null;
  new_score: number | null;
  user_id: string;
  created_at: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author_user_id: string;
  created_at: number;
  updated_at: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: number | null;
  created_at: number;
}
