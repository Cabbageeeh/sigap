import type { NaraRequest, NaraResponse } from '@core';
import { jsonError, jsonSuccess, jsonValidationError } from '@core';
import { findLoginLockoutMinutes, LOGIN_LOCKOUT_MINUTES_KEY, upsertSetting } from '@queries/appSettings';
import { isAdmin } from '@queries/users';
import LoginThrottle from '@services/LoginThrottle';
import Logger from '@services/Logger';
import { LoginSecuritySettingsSchema, zodToErrors } from '@validators';

export const loginSecuritySettingsPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!isAdmin(req.user.id)) return res.redirect('/dashboard');

  return res.inertia('loginSecuritySettings', {
    loginLockoutMinutes: findLoginLockoutMinutes(),
  });
};

export const saveLoginSecuritySettings = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan.', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat mengatur keamanan login.', 403);

  const parsed = LoginSecuritySettingsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Pengaturan keamanan login tidak valid.', zodToErrors(parsed.error));

  try {
    const minutes = parsed.data.login_lockout_minutes;
    upsertSetting(LOGIN_LOCKOUT_MINUTES_KEY, String(minutes));
    const durationMs = minutes * 60_000;
    LoginThrottle.configure({ lockoutMs: durationMs, windowMs: durationMs });
    return jsonSuccess(res, 'Pengaturan keamanan login berhasil disimpan.');
  } catch (error: unknown) {
    Logger.error('Failed to save login security settings', error as Error);
    return jsonError(res, 'Pengaturan keamanan login gagal disimpan.', 500, 'LOGIN_SECURITY_SETTINGS_SAVE_FAILED');
  }
};
