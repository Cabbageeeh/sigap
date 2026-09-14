import type { NaraRequest, NaraResponse } from '@core';
import type { Journal } from '@types';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import { findAllJournals, findJournalById, findJournalsBySchedule, findJournalsByTeacher, findJournalByScheduleAndDate, createJournal, updateJournal, deleteJournal } from '@queries/journals';
import { findScheduleById, findTeacherSchedulesByDay } from '@queries/schedules';
import { findAttendanceByJournal, upsertStudentAttendance } from '@queries/studentAttendance';
import { findStudentsByClass } from '@queries/students';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { isAdmin, hasPermission } from '@queries/users';
import { isTeacherUser } from '@queries/teacherClassAssignments';
import { JournalSchema, UpdateJournalSchema, zodToErrors } from '@validators';

const dayBounds = (): { start: number; end: number } => {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime(),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime(),
  };
};

const isTeacherActor = (userId: string): boolean => !isAdmin(userId) && isTeacherUser(userId);
const canView = (userId: string): boolean => !isAdmin(userId) && hasPermission(userId, 'journals.view');
const canManage = (userId: string, permission: string): boolean =>
  isTeacherActor(userId) && hasPermission(userId, permission);

export const journalsPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const permissions = {
    canView: userId ? canView(userId) : false,
    canCreate: userId ? canManage(userId, 'journals.create') : false,
    canEdit: userId ? canManage(userId, 'journals.edit') : false,
    canDelete: userId ? canManage(userId, 'journals.delete') : false,
  };

  const teacherActor = userId ? isTeacherActor(userId) : false;
  const today = new Date().getDay();
  const { start, end } = dayBounds();

  const journals = userId
    ? teacherActor ? findJournalsByTeacher(userId) : canView(userId) ? findAllJournals() : []
    : [];
  const todaySchedules = teacherActor && userId ? findTeacherSchedulesByDay(userId, today) : [];
  const todayJournalBySchedule = new Map(
    journals
      .filter(j => j.date >= start && j.date <= end)
      .map(j => [j.schedule_id, j] as const),
  );

  const rosterByClass: Record<string, { id: string; name: string; nis: string }[]> = {};
  const attendanceByJournal: Record<string, { student_id: string; status: string }[]> = {};
  for (const s of todaySchedules) {
    if (!rosterByClass[s.class_id]) {
      rosterByClass[s.class_id] = findStudentsByClass(s.class_id).map(st => ({ id: st.id, name: st.name, nis: st.nis }));
    }
    const j = todayJournalBySchedule.get(s.id);
    if (j) {
      attendanceByJournal[j.id] = findAttendanceByJournal(j.id).map(a => ({ student_id: a.student_id, status: a.status }));
    }
  }

  return res.inertia('journals', {
    permissions,
    journals,
    todaySchedules,
    todayJournalIds: Object.fromEntries([...todayJournalBySchedule].map(([sid, j]) => [sid, j.id])),
    confirmedToday: teacherActor && userId ? !!findTodayConfirmationByTeacher(userId) : true,
    rosterByClass,
    attendanceByJournal,
  });
};

export const listJournals = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const userId = req.user.id;
  const scheduleId = req.query.schedule_id as string | undefined;
  let data: Journal[] = [];

  if (scheduleId) {
    const schedule = findScheduleById(scheduleId);
    if (!schedule) return jsonError(res, 'Schedule not found', 404);
    if (isTeacherActor(userId) && schedule.teacher_user_id !== userId) {
      return jsonError(res, 'Forbidden', 403);
    }
    if (!canView(userId)) return jsonError(res, 'Forbidden', 403);
    data = findJournalsBySchedule(scheduleId);
  } else if (canView(userId) && !isTeacherUser(userId)) {
    data = findAllJournals();
  } else if (isTeacherActor(userId) && canView(userId)) {
    data = findJournalsByTeacher(userId);
  } else {
    return jsonError(res, 'Forbidden', 403);
  }

  return jsonSuccess(res, 'OK', data);
};

export const journalData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const item = findJournalById(req.params.id || '');
  if (!item) return jsonError(res, 'Not found', 404);

  const schedule = findScheduleById(item.schedule_id);
  if ((!canView(req.user.id) || isTeacherActor(req.user.id)) && schedule?.teacher_user_id !== req.user.id) {
    return jsonError(res, 'Forbidden', 403);
  }

  return jsonSuccess(res, 'OK', { ...item, attendance: findAttendanceByJournal(item.id) });
};

export const addJournal = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const parsed = JournalSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const schedule = findScheduleById(parsed.data.schedule_id);
  if (!schedule) return jsonError(res, 'Schedule not found', 404);

  const canCreate = canManage(req.user.id, 'journals.create') && schedule.teacher_user_id === req.user.id;
  if (!canCreate) return jsonError(res, 'Forbidden', 403);

  if (schedule.day_of_week !== new Date().getDay()) {
    return jsonError(res, 'Jurnal hanya bisa dibuat untuk jadwal hari ini', 422, 'JOURNAL_WRONG_DAY');
  }

  const confirmation = findTodayConfirmationByTeacher(req.user.id);
  if (!confirmation) {
    return jsonError(res, 'Anda belum konfirmasi kehadiran hari ini', 403, 'CONFIRMATION_REQUIRED');
  }

  const { start, end } = dayBounds();
  const existing = findJournalByScheduleAndDate(schedule.id, start, end);

  const attendance = parsed.data.attendance ?? [];
  const roster = new Set(findStudentsByClass(schedule.class_id).map(st => st.id));
  for (const a of attendance) {
    if (!roster.has(a.student_id)) {
      return jsonError(res, 'Siswa tidak berada di kelas jadwal ini', 422, 'INVALID_STUDENT_CLASS');
    }
  }

  try {
    const journal = existing
      ? updateJournal(existing.id, { material: parsed.data.material, teacher_confirmation_id: confirmation.id })!
      : createJournal({
        schedule_id: schedule.id,
        teacher_confirmation_id: confirmation.id,
        date: start,
        material: parsed.data.material,
      });

    for (const a of attendance) {
      upsertStudentAttendance({
        student_id: a.student_id,
        schedule_id: schedule.id,
        journal_id: journal.id,
        status: a.status,
      });
    }

    return existing
      ? jsonSuccess(res, 'Journal updated', journal)
      : jsonCreated(res, 'Journal created', journal);
  } catch (error: unknown) {
    Logger.error('Failed to create journal', error as Error);
    return jsonServerError(res, 'Failed to create journal');
  }
};

export const editJournal = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const existing = findJournalById(id);
  if (!existing) return jsonError(res, 'Not found', 404);

  const schedule = findScheduleById(existing.schedule_id);
  const canEdit = canManage(req.user.id, 'journals.edit') && schedule?.teacher_user_id === req.user.id;
  if (!canEdit) return jsonError(res, 'Forbidden', 403);

  const parsed = UpdateJournalSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const attendance = parsed.data.attendance ?? [];
  if (schedule) {
    const roster = new Set(findStudentsByClass(schedule.class_id).map(st => st.id));
    for (const a of attendance) {
      if (!roster.has(a.student_id)) {
        return jsonError(res, 'Siswa tidak berada di kelas jadwal ini', 422, 'INVALID_STUDENT_CLASS');
      }
    }
  }

  try {
    const item = updateJournal(id, { material: parsed.data.material });
    if (!item) return jsonError(res, 'Not found', 404);
    for (const a of attendance) {
      upsertStudentAttendance({
        student_id: a.student_id,
        schedule_id: existing.schedule_id,
        journal_id: id,
        status: a.status,
      });
    }
    return jsonSuccess(res, 'Journal updated', item);
  } catch (error: unknown) {
    Logger.error('Failed to update journal', error as Error);
    return jsonServerError(res, 'Failed to update journal');
  }
};

export const removeJournal = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const existing = findJournalById(id);
  if (!existing) return jsonError(res, 'Not found', 404);

  const schedule = findScheduleById(existing.schedule_id);
  const canDelete = canManage(req.user.id, 'journals.delete') && schedule?.teacher_user_id === req.user.id;
  if (!canDelete) return jsonError(res, 'Forbidden', 403);

  try {
    const ok = deleteJournal(id);
    if (!ok) return jsonError(res, 'Not found', 404);
    return jsonSuccess(res, 'Journal deleted');
  } catch (error: unknown) {
    Logger.error('Failed to delete journal', error as Error);
    return jsonServerError(res, 'Failed to delete journal');
  }
};
