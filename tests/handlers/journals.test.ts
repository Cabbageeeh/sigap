import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/journals', () => ({
  findAllJournals: vi.fn(() => []),
  findJournalById: vi.fn(),
  findJournalsBySchedule: vi.fn(() => []),
  findJournalsByTeacher: vi.fn(() => []),
  findJournalByScheduleAndDate: vi.fn(),
  createJournal: vi.fn(() => ({ id: 'journal-1' })),
  updateJournal: vi.fn(),
  deleteJournal: vi.fn(),
}));
vi.mock('@queries/schedules', () => ({
  findScheduleById: vi.fn(),
  findTeacherSchedulesByDay: vi.fn(() => []),
}));
vi.mock('@queries/studentAttendance', () => ({
  findAttendanceByJournal: vi.fn(() => []),
  upsertStudentAttendance: vi.fn(),
}));
vi.mock('@queries/students', () => ({ findStudentsByClass: vi.fn(() => []) }));
vi.mock('@queries/teacherConfirmations', () => ({
  findConfirmationByTeacherOnDay: vi.fn(),
  findTodayConfirmationByTeacher: vi.fn(),
}));
vi.mock('@queries/schoolCalendar', () => ({
  isTeachingDay: vi.fn(() => true),
  findNonTeachingDays: vi.fn(() => new Set()),
}));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => false),
  hasPermission: vi.fn(() => true),
}));
vi.mock('@queries/teacherClassAssignments', () => ({ isTeacherUser: vi.fn(() => true) }));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { addJournal } from '../../app/handlers/journals';
import { findScheduleById } from '@queries/schedules';
import { createJournal, findJournalByScheduleAndDate } from '@queries/journals';
import { findConfirmationByTeacherOnDay } from '@queries/teacherConfirmations';
import { isTeachingDay } from '@queries/schoolCalendar';

const DAY_MS = 24 * 60 * 60 * 1000;
const TEACHER = 'teacher-1';
const today = new Date(); today.setHours(0, 0, 0, 0);
const todayStart = today.getTime();
const twoDaysAgo = todayStart - 2 * DAY_MS;
const nineDaysAgo = todayStart - 9 * DAY_MS;

// A 09:00–10:00 template time; only the clock part is read by the handler.
const templateStart = new Date(2026, 0, 1, 9, 0, 0).getTime();
const templateEnd = new Date(2026, 0, 1, 10, 0, 0).getTime();

const SCHEDULE_ID = '00000000-0000-4000-8000-0000000000a1';

const scheduleFor = (date: number) => ({
  id: SCHEDULE_ID,
  class_id: 'class-1',
  teacher_user_id: TEACHER,
  day_of_week: new Date(date).getDay(),
  start_time: templateStart,
  end_time: templateEnd,
});

const submit = (date?: number) => {
  const inertia = vi.fn();
  const req = mockRequest({
    user: mockUser({ id: TEACHER }),
    body: { schedule_id: SCHEDULE_ID, material: 'Materi sesi ini', ...(date ? { date } : {}) },
  });
  const res = mockResponse({ inertia });
  addJournal(req, res);
  return res;
};

describe('journal late entry window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTeachingDay).mockReturnValue(true);
    vi.mocked(findScheduleById).mockReturnValue(scheduleFor(twoDaysAgo) as never);
    vi.mocked(findConfirmationByTeacherOnDay).mockReturnValue({ id: 'confirmation-1' } as never);
    vi.mocked(findJournalByScheduleAndDate).mockReturnValue(undefined);
  });

  it('rejects a session older than the allowed window', () => {
    vi.mocked(findScheduleById).mockReturnValue(scheduleFor(nineDaysAgo) as never);
    const res = submit(nineDaysAgo);
    expect(res._status).toBe(422);
    expect(res._body).toMatchObject({ code: 'JOURNAL_OUT_OF_RANGE' });
    expect(createJournal).not.toHaveBeenCalled();
  });

  it('rejects a date that the school calendar marks as non-effective', () => {
    vi.mocked(isTeachingDay).mockReturnValue(false);
    const res = submit(twoDaysAgo);
    expect(res._body).toMatchObject({ code: 'JOURNAL_WRONG_DAY' });
    expect(createJournal).not.toHaveBeenCalled();
  });

  it('rejects a date that is not the schedule weekday', () => {
    const res = submit(todayStart - DAY_MS);
    expect(res._body).toMatchObject({ code: 'JOURNAL_WRONG_DAY' });
  });

  it('refuses a late entry when presence was not confirmed that day', () => {
    vi.mocked(findConfirmationByTeacherOnDay).mockReturnValue(undefined);
    const res = submit(twoDaysAgo);
    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    expect(createJournal).not.toHaveBeenCalled();
  });

  it('accepts a late entry for a confirmed day and stamps that day', () => {
    const res = submit(twoDaysAgo);
    expect(createJournal).toHaveBeenCalledWith(expect.objectContaining({
      schedule_id: SCHEDULE_ID,
      teacher_confirmation_id: 'confirmation-1',
      date: twoDaysAgo,
    }));
    expect(res._status).toBe(201);
  });
});
