import type { NaraRequest, NaraResponse } from '@core';
import type { Journal } from '@types';
import type { JournalSlotView } from '../types/shared';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import { findAllJournals, findJournalById, findJournalsBySchedule, findJournalsByTeacher, findJournalByScheduleAndDate, createJournal, updateJournal, deleteJournal } from '@queries/journals';
import { findScheduleById, findTeacherSchedulesByDay } from '@queries/schedules';
import { findAttendanceByJournal, upsertStudentAttendance } from '@queries/studentAttendance';
import { findStudentsByClass } from '@queries/students';
import { findConfirmationByTeacherOnDay, findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { isTeachingDay } from '@queries/schoolCalendar';
import { isAdmin, hasPermission } from '@queries/users';
import { isTeacherUser } from '@queries/teacherClassAssignments';
import { JournalSchema, UpdateJournalSchema, zodToErrors } from '@validators';
import { JOURNAL_LATE_DAYS } from '@config/constants';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDayMs = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const minutesOf = (timestamp: number): number => {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
};

const clockOf = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const isTeacherActor = (userId: string): boolean => !isAdmin(userId) && isTeacherUser(userId);
const canView = (userId: string): boolean => !isAdmin(userId) && hasPermission(userId, 'journals.view');
const canManage = (userId: string, permission: string): boolean =>
  isTeacherActor(userId) && hasPermission(userId, permission);

// Sessions the teacher still owes a journal for: today's finished lessons plus
// late entries, which additionally require that presence was confirmed that day.
const buildJournalSlots = (userId: string, journals: Journal[], now: number): JournalSlotView[] => {
  const slots: JournalSlotView[] = [];

  for (let back = 0; back <= JOURNAL_LATE_DAYS; back += 1) {
    const day = startOfDayMs(now - back * DAY_MS);
    if (!isTeachingDay(day)) continue;
    const confirmed = !!findConfirmationByTeacherOnDay(userId, day);

    for (const schedule of findTeacherSchedulesByDay(userId, new Date(day).getDay())) {
      if (day + minutesOf(schedule.end_time) * 60000 > now) continue;
      const journal = journals.find(j => j.schedule_id === schedule.id && j.date >= day && j.date < day + DAY_MS);
      if (journal && back > 0) continue;
      if (!journal && !confirmed) continue;

      slots.push({
        schedule_id: schedule.id,
        class_id: schedule.class_id,
        class_name: schedule.class_name ?? '',
        subject_name: schedule.subject_name ?? '',
        time: `${clockOf(schedule.start_time)}–${clockOf(schedule.end_time)}`,
        date: day,
        is_late: back > 0,
        journal_id: journal?.id ?? null,
      });
    }
  }

  return slots;
};

export const journalsPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const permissions = {
    canView: userId ? canView(userId) : false,
    canCreate: userId ? canManage(userId, 'journals.create') : false,
    canEdit: userId ? canManage(userId, 'journals.edit') : false,
    canDelete: userId ? canManage(userId, 'journals.delete') : false,
  };

  const teacherActor = userId ? isTeacherActor(userId) : false;
  const journals = userId
    ? teacherActor ? findJournalsByTeacher(userId) : canView(userId) ? findAllJournals() : []
    : [];
  const slots = teacherActor && userId ? buildJournalSlots(userId, journals, Date.now()) : [];

  const rosterByClass: Record<string, { id: string; name: string; nis: string }[]> = {};
  const attendanceByJournal: Record<string, { student_id: string; status: string }[]> = {};
  for (const slot of slots) {
    if (!rosterByClass[slot.class_id]) {
      rosterByClass[slot.class_id] = findStudentsByClass(slot.class_id).map(st => ({ id: st.id, name: st.name, nis: st.nis }));
    }
    if (slot.journal_id) {
      attendanceByJournal[slot.journal_id] = findAttendanceByJournal(slot.journal_id).map(a => ({ student_id: a.student_id, status: a.status }));
    }
  }

  return res.inertia('journals', {
    permissions,
    journals,
    journalSlots: slots,
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

  const now = Date.now();
  const todayStart = startOfDayMs(now);
  const day = parsed.data.date ? startOfDayMs(parsed.data.date) : todayStart;

  if (day > todayStart || day < todayStart - JOURNAL_LATE_DAYS * DAY_MS) {
    return jsonError(res, `Jurnal hanya bisa diisi untuk ${JOURNAL_LATE_DAYS} hari terakhir`, 422, 'JOURNAL_OUT_OF_RANGE');
  }
  if (!isTeachingDay(day) || new Date(day).getDay() !== schedule.day_of_week) {
    return jsonError(res, 'Tanggal itu bukan hari efektif dengan jadwal tersebut', 422, 'JOURNAL_WRONG_DAY');
  }
  if (day + minutesOf(schedule.end_time) * 60000 > now) {
    return jsonError(res, 'Sesi pada tanggal itu belum berlangsung', 422, 'JOURNAL_TOO_EARLY');
  }

  const confirmation = findConfirmationByTeacherOnDay(req.user.id, day);
  if (!confirmation) {
    return jsonError(res, day === todayStart
      ? 'Anda belum konfirmasi kehadiran hari ini'
      : 'Anda tidak tercatat hadir pada tanggal itu', 403, 'CONFIRMATION_REQUIRED');
  }

  const existing = findJournalByScheduleAndDate(schedule.id, day, day + DAY_MS - 1);

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
        date: day,
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
