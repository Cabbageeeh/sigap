import { randomUUID } from 'crypto';
import type SQLiteType from '../app/services/SQLite';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Weekday anchors so a holiday always lands on a day that would otherwise have
// lessons — that is the only case where the calendar changes what SIGAP asks.
const weekdayOffset = (base: number, weeks: number, weekday: number): number => {
  const start = startOfDay(base + weeks * 7 * DAY_MS);
  const date = new Date(start);
  const forward = (weekday - date.getDay() + 7) % 7;
  return start + forward * DAY_MS;
};

interface Holiday {
  date: number;
  name: string;
}

export function run(SQLite: typeof SQLiteType): void {
  const now = Date.now();
  const holidays: Holiday[] = [
    { date: weekdayOffset(now, -4, 2), name: 'Libur Nasional Isra Mikraj' },
    { date: weekdayOffset(now, -2, 4), name: 'Cuti Bersama Nasional' },
    { date: weekdayOffset(now, 1, 2), name: 'Kegiatan Tengah Semester' },
    { date: weekdayOffset(now, 3, 4), name: 'Libur Awal Ramadan' },
  ];

  for (const holiday of holidays) {
    const existing = SQLite.get<{ id: string }>('SELECT id FROM school_holidays WHERE date = ?', [holiday.date]);
    if (existing) continue;
    SQLite.run(
      'INSERT INTO school_holidays (id, date, name, created_at) VALUES (?, ?, ?, ?)',
      [randomUUID(), holiday.date, holiday.name, now],
    );
  }

  const saturday = SQLite.get<{ key: string }>('SELECT key FROM app_settings WHERE key = ?', ['saturday_is_school_day']);
  if (!saturday) {
    SQLite.run('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)', ['saturday_is_school_day', '1', now]);
  }
}
