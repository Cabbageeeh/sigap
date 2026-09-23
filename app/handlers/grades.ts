import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError, jsonPaginated, queryInt, queryString } from '@core';
import Logger from '@services/Logger';
import { getGradesPaginated, findGradeById, findGradesByStudent, findGradesByStudentForTeacher, createGrade, updateGrade, deleteGrade, getClassSubjectSummary, upsertGradesBulk } from '@queries/grades';
import { logGradeChange } from '@queries/gradeAuditLogs';
import { findAllStudents, findStudentsByTeacherUser, findStudentById } from '@queries/students';
import { findAllSubjects } from '@queries/subjects';
import { findAllClasses, findClassesByTeacherUser } from '@queries/classes';
import { findAllAcademicYears } from '@queries/academicYears';
import {
  isTeacherUser,
  isTeacherAssignedToStudent,
  isTeacherAssignedToClassSubject,
  isTeacherHomeroomOfClass,
} from '@queries/teacherClassAssignments';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { findTeacherSchedulesByDay } from '@queries/schedules';
import { isTeachingDay } from '@queries/schoolCalendar';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import { GradeSchema, BulkGradesSchema, AddGradeComponentSchema, DeleteGradeComponentSchema, gradeTypeSlug, zodToErrors } from '@validators';
import { addGradeComponent, findGradeComponent, renameGradeComponent, deleteGradeComponent } from '@queries/gradeComponents';
import { findClassById } from '@queries/classes';

const isTeacherActor = (userId: string): boolean => !hasRole(userId, 'parent') && !isAdmin(userId) && isTeacherUser(userId);
const canView = (userId: string): boolean => !hasRole(userId, 'parent') && !isAdmin(userId) && hasPermission(userId, 'grades.view');
// Presence has to be proven only on a day the teacher actually teaches; on
// holidays, weekends, and empty days grade entry stays open.
const attendanceConfirmedToday = (userId: string): boolean => {
  if (!isTeachingDay(Date.now())) return true;
  return findTeacherSchedulesByDay(userId, new Date().getDay()).length === 0 || !!findTodayConfirmationByTeacher(userId);
};
const canViewTeacherGrade = (userId: string, classId: string, subjectId: string): boolean =>
  isTeacherHomeroomOfClass(userId, classId) || isTeacherAssignedToClassSubject(userId, classId, subjectId);
const canManageGradeInClass = (userId: string, permission: string, classId: string, subjectId: string): boolean =>
  isTeacherActor(userId) && hasPermission(userId, permission) && isTeacherAssignedToClassSubject(userId, classId, subjectId);

const confirmationRequired = (res: NaraResponse): NaraResponse =>
  jsonError(res, 'Konfirmasi kehadiran hari ini diperlukan sebelum mengakses nilai', 403, 'CONFIRMATION_REQUIRED');

const invalidStudentClass = (res: NaraResponse): NaraResponse =>
  jsonError(res, 'Siswa tidak berada di kelas yang dipilih', 422, 'INVALID_STUDENT_CLASS');

export const gradesPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const canViewFlag = userId ? canView(userId) : false;
  const teacherUserId = userId && isTeacherActor(userId) ? userId : undefined;
  const attendanceConfirmed = !teacherUserId || attendanceConfirmedToday(teacherUserId);
  const permissions = {
    canView: canViewFlag,
    canCreate: !!teacherUserId && attendanceConfirmed && hasPermission(teacherUserId, 'grades.create'),
    canEdit: !!teacherUserId && attendanceConfirmed && hasPermission(teacherUserId, 'grades.edit'),
    canDelete: !!teacherUserId && attendanceConfirmed && hasPermission(teacherUserId, 'grades.delete'),
  };

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const classId = queryString(req, 'class_id');
  const subjectId = queryString(req, 'subject_id');

  if (!canViewFlag) {
    return res.inertia('grades', {
      permissions,
      grades: [], students: [], subjects: [], classes: [], years: [],
      meta: undefined, summary: null, attendanceConfirmed: false, confirmationRequired: false,
    });
  }

  if (teacherUserId && !attendanceConfirmed) {
    return res.inertia('grades', {
      permissions,
      grades: [], students: [], subjects: [], classes: [], years: [],
      meta: undefined, summary: null,
      attendanceConfirmed: false,
      confirmationRequired: true,
      classId: classId ?? '',
      subjectId: subjectId ?? '',
    });
  }

  const { data, total } = getGradesPaginated(page, limit, undefined, classId || undefined, subjectId || undefined, teacherUserId);
  const totalPages = Math.ceil(total / limit);
  const summaryAllowed = !!classId && !!subjectId
    && (!teacherUserId || canViewTeacherGrade(teacherUserId, classId, subjectId));
  const summary = summaryAllowed ? getClassSubjectSummary(classId!, subjectId!) : null;

  return res.inertia('grades', {
    permissions,
    grades: data,
    students: teacherUserId ? findStudentsByTeacherUser(teacherUserId) : findAllStudents(),
    subjects: findAllSubjects(),
    classes: teacherUserId ? findClassesByTeacherUser(teacherUserId) : findAllClasses(),
    years: findAllAcademicYears(),
    meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    summary,
    classId: classId ?? '',
    subjectId: subjectId ?? '',
    type: queryString(req, 'type') ?? 'task',
  });
};

export const listGrades = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);
  if (isTeacherActor(req.user.id) && !attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const studentId = queryString(req, 'student_id');
  const classId = queryString(req, 'class_id');
  const subjectId = queryString(req, 'subject_id');

  const scopedTeacherUserId = isTeacherActor(req.user.id) ? req.user.id : undefined;
  const { data, total } = getGradesPaginated(page, limit, studentId || undefined, classId || undefined, subjectId || undefined, scopedTeacherUserId);
  const totalPages = Math.ceil(total / limit);
  return jsonPaginated(res, 'OK', data, { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 });
};

export const gradesByStudent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (hasRole(req.user.id, 'parent') || (!canView(req.user.id) && req.user.id !== req.params.studentId)) return jsonError(res, 'Forbidden', 403);

  const studentId = req.params.studentId;
  if (!studentId) return jsonError(res, 'Student ID required', 400);
  if (isTeacherActor(req.user.id)) {
    if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);
    if (!isTeacherAssignedToStudent(req.user.id, studentId)) return jsonError(res, 'Forbidden', 403);
    return jsonSuccess(res, 'OK', findGradesByStudentForTeacher(studentId, req.user.id));
  }

  return jsonSuccess(res, 'OK', findGradesByStudent(studentId));
};

export const gradeData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const item = findGradeById(req.params.id || '');
  if (!item) return jsonError(res, 'Not found', 404);
  if (isTeacherActor(req.user.id)) {
    if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);
    if (!canViewTeacherGrade(req.user.id, item.class_id, item.subject_id)) return jsonError(res, 'Forbidden', 403);
  }
  return jsonSuccess(res, 'OK', item);
};

export const addGrade = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'grades.create')) return jsonError(res, 'Forbidden', 403);
  if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const parsed = GradeSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));
  if (!canManageGradeInClass(req.user.id, 'grades.create', parsed.data.class_id, parsed.data.subject_id)) {
    return jsonError(res, 'Guru hanya dapat mengisi nilai untuk mapel dan kelas yang diampu', 403, 'GRADE_SCOPE_FORBIDDEN');
  }
  if (findStudentById(parsed.data.student_id)?.class_id !== parsed.data.class_id) return invalidStudentClass(res);
  const teacherUserId = req.user.id;

  try {
    const item = createGrade({ ...parsed.data, teacher_user_id: teacherUserId });
    logGradeChange({
      grade_id: item.id,
      student_id: parsed.data.student_id,
      subject_id: parsed.data.subject_id,
      class_id: parsed.data.class_id,
      type: parsed.data.type,
      action: 'create',
      old_score: null,
      new_score: parsed.data.score,
      user_id: req.user.id,
    });
    return jsonCreated(res, 'Grade created', item);
  } catch (error: unknown) {
    Logger.error('Failed to create grade', error as Error);
    return jsonServerError(res, 'Failed to create grade');
  }
};

export const saveGradesBulk = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'grades.create')) return jsonError(res, 'Forbidden', 403);
  if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const parsed = BulkGradesSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const { class_id, subject_id, type, entries } = parsed.data;
  if (!canManageGradeInClass(req.user.id, 'grades.create', class_id, subject_id)) {
    return jsonError(res, 'Guru hanya dapat mengisi nilai untuk mapel dan kelas yang diampu', 403, 'GRADE_SCOPE_FORBIDDEN');
  }
  for (const entry of entries) {
    if (findStudentById(entry.student_id)?.class_id !== class_id) return invalidStudentClass(res);
  }

  try {
    const results = upsertGradesBulk(class_id, subject_id, type, entries, req.user.id);
    for (const r of results) {
      logGradeChange({
        grade_id: r.grade_id, student_id: r.student_id, subject_id, class_id, type,
        action: r.action, old_score: r.old_score, new_score: r.new_score, user_id: req.user.id,
      });
    }
    return jsonSuccess(res, `${results.length} nilai berhasil disimpan`, { saved: results.length });
  } catch (error: unknown) {
    Logger.error('Failed to bulk save grades', error as Error);
    return jsonServerError(res, 'Failed to save grades');
  }
};

export const addGradeComponentType = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'grades.create')) return jsonError(res, 'Forbidden', 403);
  if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const parsed = AddGradeComponentSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const { class_id, subject_id, name } = parsed.data;
  if (!canManageGradeInClass(req.user.id, 'grades.create', class_id, subject_id)) {
    return jsonError(res, 'Guru hanya dapat menambah jenis nilai untuk mapel dan kelas yang diampu', 403, 'GRADE_SCOPE_FORBIDDEN');
  }

  const cls = findClassById(class_id);
  if (!cls) return jsonError(res, 'Class not found', 404);

  const type = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!type) return jsonError(res, 'Nama jenis nilai tidak valid', 422, 'INVALID_TYPE_NAME');

  try {
    addGradeComponent(cls.academic_year_id, type, name, 0);
    return jsonCreated(res, 'Jenis nilai ditambahkan', { type, name });
  } catch (error: unknown) {
    Logger.error('Failed to add grade component', error as Error);
    return jsonServerError(res, 'Failed to add grade component');
  }
};

export const renameGradeComponentType = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'grades.edit')) return jsonError(res, 'Forbidden', 403);
  if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const typeParsed = gradeTypeSlug.safeParse(req.params.type);
  if (!typeParsed.success) return jsonError(res, 'Jenis nilai tidak valid', 422, 'INVALID_TYPE');
  const type = typeParsed.data;

  const parsed = AddGradeComponentSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const { class_id, subject_id, name } = parsed.data;
  if (!canManageGradeInClass(req.user.id, 'grades.edit', class_id, subject_id)) {
    return jsonError(res, 'Guru hanya dapat mengubah jenis nilai untuk mapel dan kelas yang diampu', 403, 'GRADE_SCOPE_FORBIDDEN');
  }

  const cls = findClassById(class_id);
  if (!cls) return jsonError(res, 'Class not found', 404);
  if (!findGradeComponent(cls.academic_year_id, type)) return jsonError(res, 'Jenis nilai tidak ditemukan', 404);

  try {
    renameGradeComponent(cls.academic_year_id, type, name);
    return jsonSuccess(res, 'Jenis nilai diperbarui', { type, name });
  } catch (error: unknown) {
    Logger.error('Failed to rename grade component', error as Error);
    return jsonServerError(res, 'Failed to rename grade component');
  }
};

export const removeGradeComponentType = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'grades.delete')) return jsonError(res, 'Forbidden', 403);
  if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const typeParsed = gradeTypeSlug.safeParse(req.params.type);
  if (!typeParsed.success) return jsonError(res, 'Jenis nilai tidak valid', 422, 'INVALID_TYPE');
  const type = typeParsed.data;

  const parsed = DeleteGradeComponentSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const { class_id, subject_id } = parsed.data;
  if (!canManageGradeInClass(req.user.id, 'grades.delete', class_id, subject_id)) {
    return jsonError(res, 'Guru hanya dapat menghapus jenis nilai untuk mapel dan kelas yang diampu', 403, 'GRADE_SCOPE_FORBIDDEN');
  }

  const cls = findClassById(class_id);
  if (!cls) return jsonError(res, 'Class not found', 404);
  if (!findGradeComponent(cls.academic_year_id, type)) return jsonError(res, 'Jenis nilai tidak ditemukan', 404);

  try {
    const removed = deleteGradeComponent(cls.academic_year_id, type);
    return jsonSuccess(res, `Jenis nilai dihapus${removed > 0 ? ` beserta ${removed} nilai terkait` : ''}`, { type });
  } catch (error: unknown) {
    Logger.error('Failed to delete grade component', error as Error);
    return jsonServerError(res, 'Failed to delete grade component');
  }
};

export const editGrade = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'grades.edit')) return jsonError(res, 'Forbidden', 403);
  if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const parsed = GradeSchema.partial().safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  try {
    const existing = findGradeById(id);
    if (!existing) return jsonError(res, 'Not found', 404);
    const targetClassId = parsed.data.class_id ?? existing.class_id;
    const targetSubjectId = parsed.data.subject_id ?? existing.subject_id;
    const targetStudentId = parsed.data.student_id ?? existing.student_id;
    if (
      !canManageGradeInClass(req.user.id, 'grades.edit', existing.class_id, existing.subject_id)
      || !canManageGradeInClass(req.user.id, 'grades.edit', targetClassId, targetSubjectId)
    ) {
      return jsonError(res, 'Guru hanya dapat mengubah nilai untuk mapel dan kelas yang diampu', 403, 'GRADE_SCOPE_FORBIDDEN');
    }
    if (findStudentById(targetStudentId)?.class_id !== targetClassId) return invalidStudentClass(res);
    const updateData = { ...parsed.data, teacher_user_id: undefined };
    const item = updateGrade(id, updateData);
    if (!item) return jsonError(res, 'Not found', 404);
    logGradeChange({
      grade_id: item.id,
      student_id: item.student_id,
      subject_id: item.subject_id,
      class_id: item.class_id,
      type: item.type,
      action: 'update',
      old_score: existing.score,
      new_score: parsed.data.score ?? existing.score,
      user_id: req.user.id,
    });
    return jsonSuccess(res, 'Grade updated', item);
  } catch (error: unknown) {
    Logger.error('Failed to update grade', error as Error);
    return jsonServerError(res, 'Failed to update grade');
  }
};

export const removeGrade = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'grades.delete')) return jsonError(res, 'Forbidden', 403);
  if (!attendanceConfirmedToday(req.user.id)) return confirmationRequired(res);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const existing = findGradeById(id);
  if (!existing) return jsonError(res, 'Not found', 404);
  if (!canManageGradeInClass(req.user.id, 'grades.delete', existing.class_id, existing.subject_id)) {
    return jsonError(res, 'Guru hanya dapat menghapus nilai untuk mapel dan kelas yang diampu', 403, 'GRADE_SCOPE_FORBIDDEN');
  }

  const ok = deleteGrade(id);
  if (!ok) return jsonError(res, 'Not found', 404);
  logGradeChange({
    grade_id: existing.id,
    student_id: existing.student_id,
    subject_id: existing.subject_id,
    class_id: existing.class_id,
    type: existing.type,
    action: 'delete',
    old_score: existing.score,
    new_score: null,
    user_id: req.user.id,
  });
  return jsonSuccess(res, 'Grade deleted');
};
