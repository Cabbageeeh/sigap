import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonError } from '@core';
import { findTeacherSchedulesByDay, findScheduleById } from '@queries/schedules';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { isTeacherPresenceEnabled } from '@queries/appSettings';
import { isAdmin, hasPermission } from '@queries/users';
import { isTeacherUser } from '@queries/teacherClassAssignments';

const isTeacherActor = (userId: string): boolean =>
  !isAdmin(userId) && isTeacherUser(userId) && hasPermission(userId, 'schedules.view');

const hasConfirmedToday = (userId: string): boolean =>
  !isTeacherPresenceEnabled() || !!findTodayConfirmationByTeacher(userId);

const confirmationRequired = (res: NaraResponse): NaraResponse =>
  jsonError(res, 'Konfirmasi kehadiran hari ini diperlukan sebelum membuka jadwal', 403, 'CONFIRMATION_REQUIRED');

export const teacherSchedulePage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const isTeacher = userId ? isTeacherActor(userId) : false;
  const confirmedToday = isTeacher && !!userId && hasConfirmedToday(userId);
  const schedules = confirmedToday && userId
    ? findTeacherSchedulesByDay(userId, new Date().getDay())
    : [];

  return res.inertia('teacher/schedule', { isTeacher, confirmedToday, schedules });
};

export const listTodaySchedules = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id)) return jsonError(res, 'Forbidden', 403);
  if (!hasConfirmedToday(req.user.id)) return confirmationRequired(res);

  const schedules = findTeacherSchedulesByDay(req.user.id, new Date().getDay());
  return jsonSuccess(res, 'OK', schedules.map(schedule => ({ ...schedule, confirmed: true })));
};

export const todayScheduleDetail = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const schedule = findScheduleById(req.params.id || '');
  if (!schedule) return jsonError(res, 'Not found', 404);

  if (!isTeacherActor(req.user.id) || schedule.teacher_user_id !== req.user.id) {
    return jsonError(res, 'Forbidden', 403);
  }
  if (!hasConfirmedToday(req.user.id)) return confirmationRequired(res);

  return jsonSuccess(res, 'OK', { schedule, confirmed: true, confirmedToday: true });
};
