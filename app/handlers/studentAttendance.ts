import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError, queryInt } from '@core';
import Logger from '@services/Logger';
import { findAttendanceByJournal, findAttendanceByStudent, findStudentAttendanceById, upsertStudentAttendance, deleteStudentAttendance, getAttendanceRecap } from '@queries/studentAttendance';
import { findJournalById } from '@queries/journals';
import { findScheduleById } from '@queries/schedules';
import { findAllClasses, findClassesByTeacherUser } from '@queries/classes';
import { isTeacherUser } from '@queries/teacherClassAssignments';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import { StudentAttendanceSchema, zodToErrors } from '@validators';

const isTeacherActor = (userId: string): boolean => !hasRole(userId, 'parent') && !isAdmin(userId) && isTeacherUser(userId);
const canView = (userId: string): boolean => !hasRole(userId, 'parent') && !isAdmin(userId) && hasPermission(userId, 'attendance.view');
export const studentAttendancePage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  const userId = req.user.id;

  const teacherActor = isTeacherActor(userId);
  const classes = teacherActor ? findClassesByTeacherUser(userId) : canView(userId) || isAdmin(userId) ? findAllClasses() : [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86399999;

  const classId = (req.query.class_id as string | undefined) || classes[0]?.id || '';
  const from = queryInt(req, 'from', startOfToday);
  const to = queryInt(req, 'to', endOfToday);

  const selectedClass = classes.find(c => c.id === classId);
  const recap = selectedClass
    ? getAttendanceRecap(classId, from, to, teacherActor ? userId : undefined)
    : [];

  return res.inertia('studentAttendance', {
    classes: classes.map(c => ({ id: c.id, name: c.name })),
    recap,
    filters: { class_id: classId, from, to },
  });
};

export const listAttendanceByJournal = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const journal = findJournalById(req.params.journalId || '');
  if (!journal) return jsonError(res, 'Journal not found', 404);

  const schedule = findScheduleById(journal.schedule_id);
  const canAccess = (canView(req.user.id) && !isTeacherActor(req.user.id)) ||
    (isTeacherActor(req.user.id) && schedule?.teacher_user_id === req.user.id);
  if (!canAccess) return jsonError(res, 'Forbidden', 403);

  return jsonSuccess(res, 'OK', findAttendanceByJournal(journal.id));
};

export const listAttendanceByStudent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const studentId = req.params.studentId;
  if (!studentId) return jsonError(res, 'Student ID required', 400);

  // Parent attendance is served through the ownership-checked parent handler.
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  return jsonSuccess(res, 'OK', findAttendanceByStudent(studentId));
};

export const saveAttendance = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const items = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];

  for (const raw of items) {
    const parsed = StudentAttendanceSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));
    }

    const journal = findJournalById(parsed.data.journal_id);
    if (!journal) return jsonError(res, 'Journal not found', 404);

    const schedule = findScheduleById(journal.schedule_id);
    const canEdit = isTeacherActor(req.user.id) &&
      hasPermission(req.user.id, 'attendance.edit') &&
      schedule?.teacher_user_id === req.user.id;
    if (!canEdit) return jsonError(res, 'Forbidden', 403);

    try {
      const item = upsertStudentAttendance(parsed.data);
      results.push(item);
    } catch (error: unknown) {
      Logger.error('Failed to save attendance', error as Error);
      return jsonServerError(res, 'Failed to save attendance');
    }
  }

  return jsonCreated(res, 'Attendance saved', results);
};

export const removeAttendance = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'attendance.delete')) {
    return jsonError(res, 'Forbidden', 403);
  }

  const existing = findStudentAttendanceById(id);
  if (!existing) return jsonError(res, 'Not found', 404);
  const journal = findJournalById(existing.journal_id);
  const schedule = journal ? findScheduleById(journal.schedule_id) : undefined;
  if (schedule?.teacher_user_id !== req.user.id) return jsonError(res, 'Forbidden', 403);

  const ok = deleteStudentAttendance(id);
  if (!ok) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'Attendance record deleted');
};
