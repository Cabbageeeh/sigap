import type { ZodError } from 'zod';

export function zodToErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) errors[path] = [];
    errors[path].push(issue.message);
  }

  return errors;
}

export {
  LoginSchema,
  RegisterSchema,
  ChangePasswordSchema,
  CreateUserSchema,
  UpdateUserSchema,
  DeleteUsersSchema,
  ChangeProfileSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
  AcademicYearSchema,
  UpdateAcademicYearSchema,
  ClassSchema,
  UpdateClassSchema,
  SubjectSchema,
  UpdateSubjectSchema,
  StudentSchema,
  UpdateStudentSchema,
  StudentParentAccountSchema,
  UpdateStudentParentAccountSchema,
  StudentImportSchema,
  TeacherSchema,
  UpdateTeacherSchema,
  TeacherClassAssignmentsSchema,
  ScheduleSchema,
  UpdateScheduleSchema,
  SchoolProfileSchema,
  QrSettingsSchema,
  TeacherConfirmationSchema,
  JournalSchema,
  UpdateJournalSchema,
  StudentAttendanceSchema,
  GradeSchema,
  BulkGradesSchema,
  AddGradeComponentSchema,
  DeleteGradeComponentSchema,
  GradeComponentsSchema,
  gradeTypeSlug,
  AnnouncementSchema,
  UpdateAnnouncementSchema,
} from './schemas';

export type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
  CreateUserInput,
  UpdateUserInput,
  DeleteUsersInput,
  ChangeProfileInput,
  CreateRoleInput,
  UpdateRoleInput,
  AcademicYearInput,
  UpdateAcademicYearInput,
  ClassInput,
  UpdateClassInput,
  SubjectInput,
  UpdateSubjectInput,
  StudentInput,
  UpdateStudentInput,
  StudentParentAccountInput,
  UpdateStudentParentAccountInput,
  StudentImportInput,
  TeacherInput,
  UpdateTeacherInput,
  TeacherClassAssignmentsInput,
  ScheduleInput,
  UpdateScheduleInput,
  SchoolProfileInput,
  QrSettingsInput,
  TeacherConfirmationInput,
  JournalInput,
  UpdateJournalInput,
  StudentAttendanceInput,
  GradeInput,
  GradeComponentsInput,
  AnnouncementInput,
  UpdateAnnouncementInput,
} from './schemas';
