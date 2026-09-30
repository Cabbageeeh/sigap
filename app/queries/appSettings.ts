import SQLite from '@services/SQLite';
import { TEACHER_PRESENCE } from '@config/constants';
import type { AppSetting, TeacherPresenceMode } from '@types';

export const findSetting = (key: string): string | undefined => {
  const row = SQLite.one<AppSetting>`SELECT * FROM app_settings WHERE key = ${key}`;
  return row?.value;
};

export const findSettingNumber = (key: string, defaultValue: number): number => {
  const value = findSetting(key);
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const upsertSetting = (key: string, value: string): void => {
  const now = Date.now();
  const existing = SQLite.one<{ key: string }>`SELECT key FROM app_settings WHERE key = ${key}`;
  if (existing) {
    SQLite.exec`UPDATE app_settings SET value = ${value}, updated_at = ${now} WHERE key = ${key}`;
  } else {
    SQLite.exec`INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${value}, ${now})`;
  }
};

// An unconfigured school keeps the QR flow, so the flag only ever opts out.
export const findTeacherPresenceMode = (): TeacherPresenceMode =>
  findSetting(TEACHER_PRESENCE.SETTING_KEY) === TEACHER_PRESENCE.MODE_OFF ? 'off' : 'qr';

export const isTeacherPresenceEnabled = (): boolean => findTeacherPresenceMode() !== TEACHER_PRESENCE.MODE_OFF;
