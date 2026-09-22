import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@services/SQLite', () => ({
  default: {
    all: vi.fn(),
    many: vi.fn(),
    one: vi.fn(),
    get: vi.fn(),
  },
}));

import SQLite from '@services/SQLite';
import {
  findClassGradeDetails,
  getClassOverview,
  getMissedConfirmations,
  getTeacherAttendanceHistory,
  getTeacherAttendanceOverview,
} from '../../app/queries/headmaster';

const now = new Date('2026-09-02T12:00:00').getTime();
const dayOfWeek = new Date(now).getDay();
const dayStart = new Date('2026-09-02T00:00:00').getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const schedule = (overrides: Record<string, unknown> = {}) => ({
  id: 'schedule-1',
  day_of_week: dayOfWeek,
  start_time: new Date('2026-09-02T08:00:00').getTime(),
  end_time: new Date('2026-09-02T09:00:00').getTime(),
  class_name: '10A',
  subject_name: 'Matematika',
  teacher_name: 'Budi Santoso',
  teacher_user_id: 'teacher-user-1',
  ...overrides,
});

describe('headmaster class overview queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps averages, attendance rates, and attention status', () => {
    vi.mocked(SQLite.all).mockReturnValue([{
      class_id: 'class-1',
      class_name: '10A',
      total_students: 10,
      graded_students: 8,
      average_score: 74.345,
      attendance_present: 8,
      attendance_total: 10,
    }] as never);

    expect(getClassOverview()).toEqual([{
      class_id: 'class-1',
      class_name: '10A',
      total_students: 10,
      graded_students: 8,
      average_score: 74.35,
      attendance_rate: 80,
      needs_attention: true,
    }]);
  });

  it('returns detailed grade rows for a class without mutation queries', () => {
    const rows = [{
      id: 'grade-1',
      student_id: 'student-1',
      student_name: 'Ani',
      nis: '10001',
      subject_name: 'Matematika',
      type: 'final',
      score: 90,
      date: now,
    }];
    vi.mocked(SQLite.many).mockReturnValue(rows as never);

    expect(findClassGradeDetails('class-1')).toEqual(rows);
    expect(SQLite.many).toHaveBeenCalledTimes(1);
    expect(SQLite.all).not.toHaveBeenCalled();
  });
});

describe('headmaster teacher attendance queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('counts one QR confirmation per scheduled day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(SQLite.many)
      .mockReturnValueOnce([schedule()] as never)
      .mockReturnValueOnce([{
        teacher_user_id: 'teacher-user-1',
        teacher_name: 'Budi Santoso',
      }] as never);
    vi.mocked(SQLite.all).mockReturnValue([{
      teacher_user_id: 'teacher-user-1',
      confirmation_date: dayStart,
      confirmed_at: new Date('2026-09-02T07:00:00').getTime(),
      is_inside_school: 1,
      distance_meters: 15,
    }] as never);

    try {
      expect(getTeacherAttendanceOverview(1)).toEqual([{
        teacher_user_id: 'teacher-user-1',
        teacher_name: 'Budi Santoso',
        expected_days: 1,
        confirmed_days: 1,
        attendance_rate: 100,
      }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('groups multiple scheduled sessions into one daily history row', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(SQLite.many).mockReturnValue([schedule(), schedule({
      id: 'schedule-2',
      start_time: new Date('2026-09-02T10:00:00').getTime(),
      end_time: new Date('2026-09-02T11:00:00').getTime(),
      class_name: '10B',
      subject_name: 'Biologi',
    })] as never);
    vi.mocked(SQLite.all).mockReturnValue([{
      teacher_user_id: 'teacher-user-1',
      confirmation_date: dayStart,
      confirmed_at: new Date('2026-09-02T07:00:00').getTime(),
      is_inside_school: 1,
      distance_meters: 15,
    }] as never);

    try {
      expect(getTeacherAttendanceHistory('teacher-user-1', 1)).toEqual([{
        teacher_user_id: 'teacher-user-1',
        teacher_name: 'Budi Santoso',
        date: dayStart,
        class_names: '10A, 10B',
        subject_names: 'Matematika, Biologi',
        scheduled_sessions: 2,
        confirmed: true,
        confirmed_at: new Date('2026-09-02T07:00:00').getTime(),
        is_inside_school: 1,
        distance_meters: 15,
      }]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('headmaster missed confirmation alarm', () => {
  beforeEach(() => vi.clearAllMocks());

  const twoSessionsToday = [
    schedule(),
    schedule({
      id: 'schedule-2',
      start_time: new Date('2026-09-02T10:00:00').getTime(),
      end_time: new Date('2026-09-02T11:00:00').getTime(),
      class_name: '10B',
      subject_name: 'Biologi',
    }),
  ];

  const scannedDay = (day: number) => [{
    teacher_user_id: 'teacher-user-1',
    confirmation_date: day,
    confirmed_at: day + 7 * 60 * 60 * 1000,
    is_inside_school: 1,
    distance_meters: 15,
  }];
  const gapRow = (day: number) => ({
    teacher_user_id: 'teacher-user-1',
    teacher_name: 'Budi Santoso',
    date: day,
    scheduled_sessions: 2,
    class_names: '10A, 10B',
    subject_names: 'Matematika, Biologi',
  });

  // The seven-day window holds the same weekday twice: today and a week earlier.
  it('reports one row per teacher per day, listing every session of that day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(SQLite.all).mockReturnValue([] as never);
    vi.mocked(SQLite.many).mockReturnValue(twoSessionsToday as never);

    try {
      expect(getMissedConfirmations()).toEqual([gapRow(dayStart - WEEK_MS), gapRow(dayStart)]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the alarm once the teacher has scanned that day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(SQLite.all).mockReturnValue([...scannedDay(dayStart - WEEK_MS), ...scannedDay(dayStart)] as never);
    vi.mocked(SQLite.many).mockReturnValue(twoSessionsToday as never);

    try {
      expect(getMissedConfirmations()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
