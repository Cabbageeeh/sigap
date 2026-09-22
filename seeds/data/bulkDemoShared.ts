import type SQLiteType from '../../app/services/SQLite';
import {
  ADULT_FEMALE,
  ADULT_MALE,
  AREA_SUFFIX,
  FEMALE_FIRST,
  STREETS,
} from './bulkDemoData';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HISTORY_DAYS = 30;
export const CLASS_SIZE = 32;
export const SLOT_TIMES: [number, number][] = [[7, 30], [9, 15], [12, 0], [13, 45]];
export const SLOT_COUNT = SLOT_TIMES.length;
export const SESSION_MINUTES = 90;
export const NIS_BASE = 20261001;
export const REFERENCE_MONDAY = new Date(2026, 8, 14).getTime();
export const SCHOOL = { latitude: -7.2284902, longitude: 112.7799139 };

export interface Ctx {
  SQLite: typeof SQLiteType;
  now: number;
  yearId: string;
  int: (max: number) => number;
  chance: (probability: number) => boolean;
}

export interface TeacherRef {
  id: string;
  userId: string;
  name: string;
}

/** Deterministic PRNG so repeated runs produce the same names and scores. */
export const createCtx = (SQLite: typeof SQLiteType): Ctx | null => {
  const year = SQLite.get<{ id: string }>('SELECT id FROM academic_years WHERE is_active = 1');
  if (!year) return null;

  let state = 0x9e3779b9;
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    SQLite,
    now: Date.now(),
    yearId: year.id,
    int: (max: number) => Math.floor(next() * max),
    chance: (probability: number) => next() < probability,
  };
};

/**
 * Stable 32-bit hash of a string. Used for decisions that must land on the same
 * rows every run — a seeded PRNG stream shifts when earlier rows already exist.
 */
export const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 1000;
};

export const startOfDay = (value: number): number => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const slotStart = (dayOfWeek: number, slotIndex: number): number => {
  const [hour, minute] = SLOT_TIMES[slotIndex];
  return REFERENCE_MONDAY + (dayOfWeek - 1) * DAY_MS + hour * 60 * 60 * 1000 + minute * 60 * 1000;
};

export const occurrencesOf = (dayOfWeek: number, startMs: number, endMs: number, from: number, to: number): number[] => {
  const template = new Date(startMs);
  const duration = endMs - startMs;
  const found: number[] = [];
  for (let day = from; day <= to; day += DAY_MS) {
    const date = new Date(day);
    if (date.getDay() !== dayOfWeek) continue;
    date.setHours(template.getHours(), template.getMinutes(), 0, 0);
    if (date.getTime() + duration <= to) found.push(date.getTime());
  }
  return found;
};

/** Most recent teaching day (Mon-Fri) at or before `timestamp`. */
export const lastWeekdayStart = (timestamp: number): number => {
  const day = new Date(startOfDay(timestamp));
  for (let back = 0; back < 10; back += 1) {
    if (day.getDay() >= 1 && day.getDay() <= 5) return day.getTime();
    day.setDate(day.getDate() - 1);
  }
  return day.getTime();
};

/**
 * Both demo seeds must agree on which teacher-days stay unconfirmed, otherwise
 * the seed that runs later silently refills the gap the headmaster alarm needs.
 */
export const confirmationAlarmDay = (now: number): number => lastWeekdayStart(now - 2 * DAY_MS);

export const isConfirmationGap = (teacherUserId: string, dayStart: number, alarmDay: number): boolean =>
  stableHash(`miss:${teacherUserId}:${dayStart}`) < 30
  || (dayStart === alarmDay && stableHash(`alarm:${teacherUserId}`) < 250);

export const employeeId = (name: string): string => {
  const parts = name.split(' ');
  return `T${(parts[0] ?? '').slice(0, 4).toUpperCase()}${(parts[parts.length - 1] ?? '').slice(0, 2).toUpperCase()}`;
};

export const addressFor = (c: Ctx): string =>
  `${STREETS[c.int(STREETS.length)]} No. ${1 + c.int(120)}, ${AREA_SUFFIX[c.int(AREA_SUFFIX.length)]}`;

export const phoneFor = (c: Ctx): string => `08${3 + c.int(6)}${1000000 + c.int(8999999)}`;

export const parentNameFor = (c: Ctx, childName: string): string => {
  const pool = FEMALE_FIRST.includes(childName.split(' ')[0]) ? ADULT_FEMALE : ADULT_MALE;
  const parent = pool[c.int(pool.length)];
  const family = childName.split(' ').slice(-1)[0];
  return c.chance(0.55) ? `${parent} ${family}` : parent;
};
