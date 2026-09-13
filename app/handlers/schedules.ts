import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import { findAllSchedules, findScheduleById, findSchedulesByClass, findSchedulesByTeacher, findSchedulesByYearAndDayWithDetails, createSchedule, updateSchedule, deleteSchedule, type ScheduleWithDetails } from '@queries/schedules';
import { findAllClasses } from '@queries/classes';
import { findAllSubjects } from '@queries/subjects';
import { findAllAcademicYears } from '@queries/academicYears';
import { findTeacherUsersForSchedule } from '@queries/teachers';
import { isTeacherUser } from '@queries/teacherClassAssignments';
import { isAdmin, hasPermission } from '@queries/users';
import { ScheduleSchema, UpdateScheduleSchema, zodToErrors } from '@validators';

const isTeacherActor = (userId: string): boolean =>
  !isAdmin(userId) && isTeacherUser(userId) && hasPermission(userId, 'schedules.view');
const canView = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'schedules.view');
const canManage = (userId: string): boolean => isAdmin(userId);
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const timeToMinutes = (timestamp: number): number => {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
};

const formatScheduleTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number): boolean =>
  startA < endB && startB < endA;

interface ScheduleSlot {
  class_id: string;
  teacher_user_id: string;
  day_of_week: number;
  start_time: number;
  end_time: number;
  academic_year_id: string;
}

const findScheduleConflict = (slot: ScheduleSlot, excludeId?: string): ScheduleWithDetails | undefined => {
  const candidates = findSchedulesByYearAndDayWithDetails(slot.academic_year_id, slot.day_of_week);
  const start = timeToMinutes(slot.start_time);
  const end = timeToMinutes(slot.end_time);
  return candidates.find(candidate => {
    if (excludeId && candidate.id === excludeId) return false;
    if (candidate.teacher_user_id !== slot.teacher_user_id && candidate.class_id !== slot.class_id) return false;
    return rangesOverlap(start, end, timeToMinutes(candidate.start_time), timeToMinutes(candidate.end_time));
  });
};

const conflictMessage = (slot: ScheduleSlot, conflict: ScheduleWithDetails): string => {
  const when = `${DAY_NAMES[conflict.day_of_week] ?? ''} ${formatScheduleTime(conflict.start_time)}–${formatScheduleTime(conflict.end_time)}`;
  if (conflict.teacher_user_id === slot.teacher_user_id) {
    return `Guru ${conflict.teacher_name} sudah memiliki jadwal ${conflict.subject_name} di kelas ${conflict.class_name} pada ${when}`;
  }
  return `Kelas ${conflict.class_name} sudah memiliki jadwal ${conflict.subject_name} pada ${when} (guru ${conflict.teacher_name})`;
};

export const schedulesPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const canViewFlag = userId ? canView(userId) : false;
  const permissions = {
    canView: canViewFlag,
    canCreate: userId ? canManage(userId) : false,
    canEdit: userId ? isAdmin(userId) : false,
    canDelete: userId ? isAdmin(userId) : false,
  };

  const schedules = canViewFlag
    ? (userId && isTeacherActor(userId) ? findSchedulesByTeacher(userId) : findAllSchedules())
    : [];
  const classes = canViewFlag ? findAllClasses() : [];
  const subjects = canViewFlag ? findAllSubjects() : [];
  const teachers = canViewFlag ? findTeacherUsersForSchedule() : [];
  const years = canViewFlag ? findAllAcademicYears() : [];

  return res.inertia('schedules', { permissions, schedules, classes, subjects, teachers, years });
};

export const listSchedules = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const classId = req.query.class_id as string | undefined;
  const teacherId = req.query.teacher_user_id as string | undefined;

  if (isTeacherActor(req.user.id)) {
    if (teacherId && teacherId !== req.user.id) return jsonError(res, 'Forbidden', 403);
    const ownSchedules = findSchedulesByTeacher(req.user.id);
    const data = classId ? ownSchedules.filter(schedule => schedule.class_id === classId) : ownSchedules;
    return jsonSuccess(res, 'OK', data);
  }

  const data = classId ? findSchedulesByClass(classId) : teacherId ? findSchedulesByTeacher(teacherId) : findAllSchedules();
  return jsonSuccess(res, 'OK', data);
};

export const scheduleData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);
  const item = findScheduleById(req.params.id || '');

  if (!item) return jsonError(res, 'Not found', 404);
  if (isTeacherActor(req.user.id) && item.teacher_user_id !== req.user.id) {
    return jsonError(res, 'Forbidden', 403);
  }
  return jsonSuccess(res, 'OK', item);
};

export const addSchedule = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const parsed = ScheduleSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const slot = parsed.data;
  if (slot.end_time <= slot.start_time) {
    return jsonError(res, 'Jam selesai harus setelah jam mulai', 400, 'INVALID_TIME_RANGE');
  }
  const conflict = findScheduleConflict(slot);
  if (conflict) {
    return jsonError(res, conflictMessage(slot, conflict), 409, 'SCHEDULE_CONFLICT');
  }

  try {
    const item = createSchedule(parsed.data);
    return jsonCreated(res, 'Schedule created', item);
  } catch (error: unknown) {
    Logger.error('Failed to create schedule', error as Error);
    return jsonServerError(res, 'Failed to create schedule');
  }
};

export const editSchedule = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const parsed = UpdateScheduleSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const existing = findScheduleById(id);
  if (!existing) return jsonError(res, 'Not found', 404);

  const slot: ScheduleSlot = {
    class_id: parsed.data.class_id ?? existing.class_id,
    teacher_user_id: parsed.data.teacher_user_id ?? existing.teacher_user_id,
    day_of_week: parsed.data.day_of_week ?? existing.day_of_week,
    start_time: parsed.data.start_time ?? existing.start_time,
    end_time: parsed.data.end_time ?? existing.end_time,
    academic_year_id: parsed.data.academic_year_id ?? existing.academic_year_id,
  };
  if (slot.end_time <= slot.start_time) {
    return jsonError(res, 'Jam selesai harus setelah jam mulai', 400, 'INVALID_TIME_RANGE');
  }
  const conflict = findScheduleConflict(slot, id);
  if (conflict) {
    return jsonError(res, conflictMessage(slot, conflict), 409, 'SCHEDULE_CONFLICT');
  }

  try {
    const item = updateSchedule(id, parsed.data);
    if (!item) return jsonError(res, 'Not found', 404);
    return jsonSuccess(res, 'Schedule updated', item);
  } catch (error: unknown) {
    Logger.error('Failed to update schedule', error as Error);
    return jsonServerError(res, 'Failed to update schedule');
  }
};

export const removeSchedule = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const ok = deleteSchedule(id);
  if (!ok) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'Schedule deleted');
};
