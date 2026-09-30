import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonError, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import { generateQrCodeData } from '@services/QrCode';
import { findSettingNumber, findTeacherPresenceMode, isTeacherPresenceEnabled, upsertSetting } from '@queries/appSettings';
import { findActiveSchoolLocation } from '@queries/schoolLocations';
import { isAdmin } from '@queries/users';
import { TeacherPresenceSettingsSchema, zodToErrors } from '@validators';
import { QR, TEACHER_PRESENCE } from '@config/constants';

const canManage = (userId: string): boolean => isAdmin(userId);

const disabledError = (res: NaraResponse): NaraResponse =>
  jsonError(res, 'Absensi guru sedang dinonaktifkan di sekolah ini', 403, 'TEACHER_PRESENCE_DISABLED');

export const teacherPresencePage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const allowed = userId ? canManage(userId) : false;

  return res.inertia('teacherPresence', {
    permissions: { canEdit: allowed },
    mode: findTeacherPresenceMode(),
    qrRefreshInterval: findSettingNumber(QR.SETTING_KEY, QR.REFRESH_INTERVAL_DEFAULT),
    schoolName: findActiveSchoolLocation()?.name ?? null,
  });
};

export const saveTeacherPresenceSettings = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Kamu tidak memiliki akses untuk mengatur kehadiran guru', 403);

  const parsed = TeacherPresenceSettingsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Pengaturan tidak valid', zodToErrors(parsed.error));

  try {
    upsertSetting(TEACHER_PRESENCE.SETTING_KEY, parsed.data.mode);
    upsertSetting(QR.SETTING_KEY, String(parsed.data.qr_refresh_interval));
    return jsonSuccess(res, 'Pengaturan kehadiran guru disimpan');
  } catch (error: unknown) {
    Logger.error('Failed to save teacher presence settings', error as Error);
    return jsonError(res, 'Gagal menyimpan pengaturan kehadiran guru', 500);
  }
};

export const qrDisplayPage = (req: NaraRequest, res: NaraResponse) => {
  if (!isTeacherPresenceEnabled()) return res.redirect('/dashboard');
  const interval = findSettingNumber(QR.SETTING_KEY, QR.REFRESH_INTERVAL_DEFAULT);
  return res.inertia('qrDisplay', {
    qrRefreshInterval: interval,
    schoolName: findActiveSchoolLocation()?.name ?? 'Sekolah',
  });
};

export const qrCodeData = async (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!isTeacherPresenceEnabled()) return disabledError(res);
  const interval = findSettingNumber(QR.SETTING_KEY, QR.REFRESH_INTERVAL_DEFAULT);
  try {
    const data = await generateQrCodeData(interval);
    return jsonSuccess(res, 'OK', data);
  } catch (error: unknown) {
    Logger.error('Failed to generate QR code', error as Error);
    return jsonError(res, 'Gagal membuat QR code', 500);
  }
};
