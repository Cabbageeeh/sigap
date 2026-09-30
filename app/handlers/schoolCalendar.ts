import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonError, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import {
  createSchoolHoliday,
  deleteSchoolHoliday,
  findSchoolHolidayByDate,
  findSchoolHolidays,
  isSaturdaySchoolDay,
  setSaturdaySchoolDay,
} from '@queries/schoolCalendar';
import { hasPermission } from '@queries/users';
import { SchoolCalendarSettingsSchema, SchoolHolidaySchema, zodToErrors } from '@validators';

const canView = (userId: string): boolean => hasPermission(userId, 'school_locations.view');
const canManage = (userId: string): boolean => hasPermission(userId, 'school_locations.edit');

const toDayStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const schoolCalendarPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const allowed = userId ? canView(userId) : false;

  return res.inertia('schoolCalendar', {
    permissions: { canEdit: !!userId && canManage(userId) },
    holidays: allowed ? findSchoolHolidays() : [],
    saturdayIsSchoolDay: isSaturdaySchoolDay(),
  });
};

export const addSchoolHoliday = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Kamu tidak memiliki akses untuk mengatur kalender sekolah', 403);

  const parsed = SchoolHolidaySchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Data libur tidak valid', zodToErrors(parsed.error));

  const date = toDayStart(parsed.data.date);
  try {
    if (findSchoolHolidayByDate(date)) {
      return jsonError(res, `${formatDate(date)} sudah tercatat sebagai libur`, 422, 'DUPLICATE_HOLIDAY');
    }
    const holiday = createSchoolHoliday(date, parsed.data.name);
    return jsonSuccess(res, `${formatDate(holiday.date)} tercatat sebagai hari libur`, holiday);
  } catch (error: unknown) {
    Logger.error('Failed to add school holiday', error as Error);
    return jsonError(res, 'Gagal menyimpan hari libur', 500);
  }
};

export const removeSchoolHoliday = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Kamu tidak memiliki akses untuk mengatur kalender sekolah', 403);

  try {
    if (!deleteSchoolHoliday(req.params.id || '')) return jsonError(res, 'Data libur tidak ditemukan', 404);
    return jsonSuccess(res, 'Hari libur dihapus');
  } catch (error: unknown) {
    Logger.error('Failed to delete school holiday', error as Error);
    return jsonError(res, 'Gagal menghapus hari libur', 500);
  }
};

export const saveSchoolCalendarSettings = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Kamu tidak memiliki akses untuk mengatur kalender sekolah', 403);

  const parsed = SchoolCalendarSettingsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Pengaturan tidak valid', zodToErrors(parsed.error));

  try {
    setSaturdaySchoolDay(parsed.data.saturday_is_school_day);
    return jsonSuccess(res, parsed.data.saturday_is_school_day
      ? 'Hari Sabtu dihitung sebagai hari efektif'
      : 'Hari Sabtu tidak dihitung sebagai hari efektif');
  } catch (error: unknown) {
    Logger.error('Failed to save school calendar settings', error as Error);
    return jsonError(res, 'Gagal menyimpan pengaturan kalender', 500);
  }
};
