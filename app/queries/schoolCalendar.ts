import SQLite from '@services/SQLite';
import { randomUUID } from 'crypto';
import { findSetting, upsertSetting } from './appSettings';

export interface SchoolHoliday {
  id: string;
  date: number;
  name: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SATURDAY_SCHOOL_DAY_KEY = 'saturday_is_school_day';

const dayStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const findSchoolHolidays = (): SchoolHoliday[] =>
  SQLite.many<SchoolHoliday>`SELECT id, date, name FROM school_holidays ORDER BY date`;

export const findSchoolHolidayByDate = (date: number): SchoolHoliday | undefined =>
  SQLite.one<SchoolHoliday>`SELECT id, date, name FROM school_holidays WHERE date = ${date}`;

export const createSchoolHoliday = (date: number, name: string): SchoolHoliday => {
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO school_holidays (id, date, name, created_at)
    VALUES (${id}, ${date}, ${name}, ${Date.now()})
  `;
  return { id, date, name };
};

export const deleteSchoolHoliday = (id: string): boolean =>
  SQLite.run('DELETE FROM school_holidays WHERE id = ?', [id]).changes > 0;

export const isSaturdaySchoolDay = (): boolean => findSetting(SATURDAY_SCHOOL_DAY_KEY) !== '0';

export const setSaturdaySchoolDay = (enabled: boolean): void =>
  upsertSetting(SATURDAY_SCHOOL_DAY_KEY, enabled ? '1' : '0');

const isWeekendOff = (weekday: number): boolean =>
  weekday === 0 || (weekday === 6 && !isSaturdaySchoolDay());

export const isTeachingDay = (timestamp: number): boolean => {
  const start = dayStart(timestamp);
  return !isWeekendOff(new Date(start).getDay()) && !findSchoolHolidayByDate(start);
};

// Day-starts inside a window that carry no lessons. Oversight queries use this
// so a holiday never shows up as a teacher who failed to confirm.
export const findNonTeachingDays = (from: number, to: number): Set<number> => {
  const holidays = new Set(findSchoolHolidays().map(holiday => holiday.date));
  const blocked = new Set<number>();
  for (let day = dayStart(from); day <= to; day += DAY_MS) {
    if (isWeekendOff(new Date(day).getDay()) || holidays.has(day)) blocked.add(day);
  }
  return blocked;
};
