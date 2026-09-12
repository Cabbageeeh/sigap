import type { NaraRequest, NaraResponse } from '@core';
import { jsonError, jsonServerError, jsonSuccess, jsonValidationError, isUniqueConstraintError, queryString } from '@core';
import { findAllAcademicYears, findActiveAcademicYear } from '@queries/academicYears';
import { findClassesByAcademicYear } from '@queries/classes';
import {
  findTeacherClassAssignmentsByAcademicYear,
  syncTeacherClassAssignments,
} from '@queries/teacherClassAssignments';
import { findAllTeachersForAssignment, findTeacherById } from '@queries/teachers';
import { findAllSubjects } from '@queries/subjects';
import { findSchedulesByYearWithDetails } from '@queries/schedules';
import { isAdmin } from '@queries/users';
import { TeacherClassAssignmentsSchema, zodToErrors } from '@validators';
import Logger from '@services/Logger';

const canManage = (userId: string): boolean => isAdmin(userId);

export const teacherAssignmentsPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const allowed = userId ? canManage(userId) : false;

  if (!allowed) {
    return res.inertia('teacherAssignments', {
      permissions: { canEdit: false },
      teachers: [],
      classes: [],
      years: [],
      assignments: [],
      subjects: [],
      schedules: [],
      selectedYearId: '',
      selectedTeacherId: '',
    });
  }

  const years = findAllAcademicYears();
  const activeYear = findActiveAcademicYear();
  const selectedYearId = queryString(req, 'academic_year_id') || activeYear?.id || years[0]?.id || '';
  const classes = selectedYearId ? findClassesByAcademicYear(selectedYearId) : [];
  const assignments = selectedYearId ? findTeacherClassAssignmentsByAcademicYear(selectedYearId) : [];
  const schedules = selectedYearId ? findSchedulesByYearWithDetails(selectedYearId) : [];
  const teachers = findAllTeachersForAssignment();
  const requestedTeacherId = queryString(req, 'teacher_id');
  const selectedTeacherId = requestedTeacherId && teachers.some(teacher => teacher.id === requestedTeacherId)
    ? requestedTeacherId
    : '';

  return res.inertia('teacherAssignments', {
    permissions: { canEdit: true },
    teachers,
    classes,
    years,
    assignments,
    subjects: findAllSubjects(),
    schedules,
    selectedYearId,
    selectedTeacherId,
  });
};

export const saveTeacherAssignments = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Kamu tidak memiliki akses untuk mengatur penugasan guru', 403);

  const teacherId = req.params.teacherId;
  if (!teacherId) return jsonError(res, 'ID guru wajib diisi', 400);
  if (!findTeacherById(teacherId)) return jsonError(res, 'Guru tidak ditemukan', 404);

  const parsed = TeacherClassAssignmentsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Data penugasan tidak valid', zodToErrors(parsed.error));

  try {
    syncTeacherClassAssignments(teacherId, parsed.data.academic_year_id, parsed.data.assignments);
    return jsonSuccess(res, 'Penugasan guru berhasil disimpan');
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return jsonError(res, 'Kelas tersebut sudah memiliki wali kelas lain', 409, 'HOMEROOM_ALREADY_ASSIGNED');
    }
    Logger.error('Failed to save teacher class assignments', error as Error);
    return jsonServerError(res, 'Penugasan guru gagal disimpan');
  }
};
