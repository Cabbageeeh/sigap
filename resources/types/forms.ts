/**
 * Frontend Types
 *
 * Shared types (User, Role, Permission, Session, API responses) are re-exported
 * from app/types/shared.ts — the single source of truth.
 *
 * This file contains only frontend-specific types (forms, helpers, type guards).
 */

// Re-export shared types from backend (single source of truth)
export type {
  User,
  Role,
  RoleInfo,
  Permission,
  GroupedPermissions,
  Session,
  PaginationMeta,
  PaginatedResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  AcademicYear,
  Class,
  Subject,
  Student,
  Teacher,
  TeacherClassAssignment,
  Parent,
  Schedule,
  SchoolLocation,
  TeacherConfirmation,
  TeacherConfirmationLogView,
  AppSetting,
  Journal,
  StudentAttendance,

  Grade,
  GradeComponent,
  GradeSummaryRow,
  SubjectGradeSummary,
  StudentGradeProgression,
  ClassSubjectSummary,
  GradeAuditLogRow,
  SessionStatusView,
  JournalCompletenessView,
  GradeProgressView,
  HeadmasterClassOverviewView,
  HeadmasterTeacherAttendanceView,
  HeadmasterTeacherAttendanceHistoryView,
  HeadmasterGradeDetailView,
  OutsideConfirmationView,
  NotificationView,
} from '../../app/types/shared';

import type {
  User,
  Role,
  AcademicYear,
  Class,
  Subject,
  Student,
  Teacher,
  TeacherClassAssignment,
  Parent,
  Schedule,
  SchoolLocation,
  TeacherConfirmation,
  Journal,
  StudentAttendance,
  Grade,
  GradeComponent,
  GradeSummaryRow,
  SubjectGradeSummary,
  StudentGradeProgression,
  ClassSubjectSummary,
  GradeAuditLogRow,
  SessionStatusView,
  GradeProgressView,
  HeadmasterClassOverviewView,
  HeadmasterTeacherAttendanceView,
  HeadmasterTeacherAttendanceHistoryView,
  HeadmasterGradeDetailView,
  OutsideConfirmationView,
  AnnouncementView,
  NotificationView,
} from '../../app/types/shared';

// =============================================================================
// Form Types (frontend-only)
// =============================================================================

export interface UserForm {
  id: string | null;
  name: string;
  username: string;
  roles: string[];
  password: string;
  student_id: string | null;
}

export interface RoleForm {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
}

// =============================================================================
// Helper Functions (frontend-only)
// =============================================================================

export function createEmptyUserForm(): UserForm {
  return {
    id: null,
    name: '',
    username: '',
    roles: ['user'],
    password: '',
    student_id: null,
  };
}

export function userToForm(user: User): UserForm {
  return {
    id: user.id,
    name: user.name || '',
    username: user.username || '',
    roles: user.roles || ['user'],
    password: '',
    student_id: null,
  };
}

export function isApiSuccess<T>(response: import('../../app/types/shared').ApiResponse<T>): response is import('../../app/types/shared').ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiError(response: import('../../app/types/shared').ApiResponse): response is import('../../app/types/shared').ApiErrorResponse {
  return response.success === false;
}

export function createEmptyRoleForm(): RoleForm {
  return {
    id: null,
    name: '',
    slug: '',
    description: '',
    permissions: [],
  };
}

export function roleToForm(role: Role): RoleForm {
  const permissions = (role.permissions || []).map((p: string | { slug: string }) =>
    typeof p === 'string' ? p : p.slug
  );

  return {
    id: role.id,
    name: role.name || '',
    slug: role.slug || '',
    description: role.description || '',
    permissions,
  };
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  todayAttendance: number;
  todayJournals: number;
  pendingConfirmations: number;
}

// =============================================================================
// SIGAP Form Types
// =============================================================================

export interface AcademicYearForm {
  id: string | null;
  name: string;
  start_at: number;
  end_at: number;
  is_active: boolean;
  is_grades_published: boolean;
}

export interface ClassForm {
  id: string | null;
  name: string;
  grade: string;
  academic_year_id: string;
}

export interface SubjectForm {
  id: string | null;
  name: string;
  code: string;
  kkm: number;
}

export interface StudentForm {
  id: string | null;
  nis: string;
  name: string;
  class_id: string;
  parent_user_id: string | null;
  phone: string;
  address: string;
}

export interface TeacherForm {
  id: string | null;
  nip: string;
  name: string;
  subject_ids: string[];
}

export interface ParentForm {
  id: string | null;
  user_id: string;
  phone: string;
  address: string;
}

export interface ScheduleForm {
  id: string | null;
  class_id: string;
  subject_id: string;
  teacher_user_id: string;
  academic_year_id: string;
  day_of_week: number;
  start_time: number;
  end_time: number;
}

export interface SchoolLocationForm {
  name: string;
  npsn: string;
  headmaster_name: string;
  phone: string;
  email: string;
  address: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
  start_time: string;
}

export interface QrSettingsForm {
  qr_refresh_interval: number;
}

export interface StudentSelectOption {
  id: string;
  nis: string;
  name: string;
  class_name: string | null;
}

export interface JournalForm {
  id: string | null;
  schedule_id: string;
  teacher_confirmation_id: string;
  date: number;
  material: string;
}

export interface GradeForm {
  id: string | null;
  student_id: string;
  subject_id: string;
  class_id: string;
  academic_year_id: string;
  type: string;
  score: number;
  date: number;
}

export interface StudentAttendanceForm {
  student_id: string;
  journal_id: string;
  status: 'present' | 'sick' | 'leave' | 'absent';
  note: string;
}

// =============================================================================
// SIGAP Form Factories
// =============================================================================

export function createEmptyAcademicYearForm(): AcademicYearForm {
  return { id: null, name: '', start_at: 0, end_at: 0, is_active: false };
}

export function academicYearToForm(year: AcademicYear): AcademicYearForm {
  return {
    id: year.id,
    name: year.name,
    start_at: year.start_at,
    end_at: year.end_at,
    is_active: year.is_active === 1,
    is_grades_published: year.is_grades_published === 1,
  };
}

export function createEmptyClassForm(): ClassForm {
  return { id: null, name: '', grade: '', academic_year_id: '' };
}

export function classToForm(cls: Class): ClassForm {
  return { id: cls.id, name: cls.name, grade: cls.grade, academic_year_id: cls.academic_year_id };
}

export function createEmptySubjectForm(): SubjectForm {
  return { id: null, name: '', code: '', kkm: 75 };
}

export function subjectToForm(subject: Subject): SubjectForm {
  return { id: subject.id, name: subject.name, code: subject.code, kkm: subject.kkm ?? 75 };
}

export function createEmptyStudentForm(): StudentForm {
  return { id: null, nis: '', name: '', class_id: '', parent_user_id: null, phone: '', address: '' };
}

export function studentToForm(student: Student): StudentForm {
  return {
    id: student.id,
    nis: student.nis,
    name: student.name,
    class_id: student.class_id,
    parent_user_id: student.parent_user_id,
    phone: student.phone || '',
    address: student.address || '',
  };
}

export function createEmptyTeacherForm(): TeacherForm {
  return { id: null, nip: '', name: '', subject_ids: [] };
}

export function teacherToForm(teacher: Teacher & { user_name?: string | null }): TeacherForm {
  return {
    id: teacher.id,
    nip: teacher.employee_id || '',
    name: teacher.user_name || '',
    subject_ids: [],
  };
}

export function createEmptyParentForm(): ParentForm {
  return { id: null, user_id: '', phone: '', address: '' };
}

export function parentToForm(parent: Parent): ParentForm {
  return {
    id: parent.id,
    user_id: parent.user_id,
    phone: parent.phone || '',
    address: parent.address || '',
  };
}

export function createEmptyScheduleForm(): ScheduleForm {
  return { id: null, class_id: '', subject_id: '', teacher_user_id: '', academic_year_id: '', day_of_week: 1, start_time: 0, end_time: 0 };
}

export function scheduleToForm(schedule: Schedule): ScheduleForm {
  return {
    id: schedule.id,
    class_id: schedule.class_id,
    subject_id: schedule.subject_id,
    teacher_user_id: schedule.teacher_user_id,
    academic_year_id: schedule.academic_year_id,
    day_of_week: schedule.day_of_week,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
  };
}

export function createEmptySchoolLocationForm(): SchoolLocationForm {
  return { name: '', npsn: '', headmaster_name: '', phone: '', email: '', address: '', latitude: '', longitude: '', radius_meters: '', start_time: '' };
}

export function schoolLocationToForm(location: SchoolLocation | null): SchoolLocationForm {
  if (!location) return createEmptySchoolLocationForm();
  return {
    name: location.name,
    npsn: location.npsn || '',
    headmaster_name: location.headmaster_name || '',
    phone: location.phone || '',
    email: location.email || '',
    address: location.address || '',
    latitude: location.latitude === null ? '' : String(location.latitude),
    longitude: location.longitude === null ? '' : String(location.longitude),
    radius_meters: location.radius_meters === null ? '' : String(location.radius_meters),
    start_time: location.start_time || '',
  };
}

export function createEmptyJournalForm(): JournalForm {
  return { id: null, schedule_id: '', teacher_confirmation_id: '', date: Date.now(), material: '' };
}

export function journalToForm(journal: Journal): JournalForm {
  return {
    id: journal.id,
    schedule_id: journal.schedule_id,
    teacher_confirmation_id: journal.teacher_confirmation_id,
    date: journal.date,
    material: journal.material,
  };
}

export function createEmptyGradeForm(): GradeForm {
  return { id: null, student_id: '', subject_id: '', class_id: '', academic_year_id: '', type: 'task', score: 0, date: 0 };
}

export function gradeToForm(grade: Grade): GradeForm {
  return {
    id: grade.id,
    student_id: grade.student_id,
    subject_id: grade.subject_id,
    class_id: grade.class_id,
    academic_year_id: grade.academic_year_id,
    type: grade.type,
    score: grade.score,
    date: grade.date,
  };
}

export function createEmptyAttendanceForm(): StudentAttendanceForm {
  return { student_id: '', journal_id: '', status: 'present', note: '' };
}

export function attendanceToForm(attendance: StudentAttendance): StudentAttendanceForm {
  return {
    student_id: attendance.student_id,
    journal_id: attendance.journal_id,
    status: attendance.status,
    note: attendance.note || '',
  };
}
