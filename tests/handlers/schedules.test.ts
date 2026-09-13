import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/schedules', () => ({
  findAllSchedules: vi.fn(() => []),
  findScheduleById: vi.fn(),
  findSchedulesByClass: vi.fn(() => []),
  findSchedulesByTeacher: vi.fn(() => []),
  findSchedulesByYearAndDayWithDetails: vi.fn(() => []),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
}));
vi.mock('@queries/classes', () => ({ findAllClasses: vi.fn(() => []) }));
vi.mock('@queries/subjects', () => ({ findAllSubjects: vi.fn(() => []) }));
vi.mock('@queries/academicYears', () => ({ findAllAcademicYears: vi.fn(() => []) }));
vi.mock('@queries/teachers', () => ({ findTeacherUsersForSchedule: vi.fn(() => []) }));
vi.mock('@queries/teacherClassAssignments', () => ({ isTeacherUser: vi.fn(() => false) }));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => false),
  hasPermission: vi.fn(() => false),
}));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { schedulesPage, listSchedules, addSchedule, editSchedule } from '../../app/handlers/schedules';
import { findAllSchedules, findSchedulesByTeacher, findScheduleById, findSchedulesByYearAndDayWithDetails, createSchedule, updateSchedule } from '@queries/schedules';
import { findAllClasses } from '@queries/classes';
import { findAllSubjects } from '@queries/subjects';
import { findAllAcademicYears } from '@queries/academicYears';
import { findTeacherUsersForSchedule } from '@queries/teachers';
import { isTeacherUser } from '@queries/teacherClassAssignments';
import { isAdmin, hasPermission } from '@queries/users';

const schedule = {
  id: 'schedule-1',
  class_id: 'class-1',
  subject_id: 'subject-1',
  teacher_user_id: 'teacher-1',
  day_of_week: 1,
  start_time: 100,
  end_time: 200,
  academic_year_id: 'year-1',
};

describe('schedules role boundaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads schedule management data for an admin operator', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(findAllSchedules).mockReturnValue([schedule] as never);
    vi.mocked(findAllClasses).mockReturnValue([{ id: 'class-1', name: '10A' }] as never);
    vi.mocked(findAllSubjects).mockReturnValue([{ id: 'subject-1', name: 'Matematika' }] as never);
    vi.mocked(findAllAcademicYears).mockReturnValue([{ id: 'year-1', name: '2025/2026' }] as never);
    vi.mocked(findTeacherUsersForSchedule).mockReturnValue([{ id: 'teacher-1', name: 'Budi', username: 'budi' }]);
    const inertia = vi.fn();
    const req = mockRequest({ user: mockUser({ id: 'admin-1' }) });
    const res = mockResponse({ inertia });

    schedulesPage(req, res);

    expect(inertia).toHaveBeenCalledWith('schedules', expect.objectContaining({
      schedules: [schedule],
      classes: [{ id: 'class-1', name: '10A' }],
      subjects: [{ id: 'subject-1', name: 'Matematika' }],
      years: [{ id: 'year-1', name: '2025/2026' }],
      teachers: [{ id: 'teacher-1', name: 'Budi', username: 'budi' }],
      permissions: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    }));
  });

  it('keeps the headmaster read-only while showing schedules', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    const inertia = vi.fn();
    const req = mockRequest({ user: mockUser({ id: 'headmaster-1' }) });
    const res = mockResponse({ inertia });

    schedulesPage(req, res);

    expect(inertia).toHaveBeenCalledWith('schedules', expect.objectContaining({
      permissions: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    }));
  });

  it('scopes schedule API results to the authenticated teacher', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(findSchedulesByTeacher).mockReturnValue([
      schedule,
      { ...schedule, id: 'schedule-2', class_id: 'class-2' },
    ] as never);
    const req = mockRequest({
      query: { teacher_user_id: 'teacher-1', class_id: 'class-1' },
      user: mockUser({ id: 'teacher-1' }),
    });
    const res = mockResponse();

    listSchedules(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual(expect.objectContaining({ data: [schedule] }));
    expect(findSchedulesByTeacher).toHaveBeenCalledWith('teacher-1');
  });

  it('does not let a headmaster create a schedule', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    const req = mockRequest({ user: mockUser({ id: 'headmaster-1' }) });
    const res = mockResponse();

    addSchedule(req, res);

    expect(res._status).toBe(403);
  });
});

describe('schedules conflict validation', () => {
  const YEAR = '00000000-0000-4000-8000-000000000001';
  const CLASS_A = '00000000-0000-4000-8000-000000000002';
  const CLASS_B = '00000000-0000-4000-8000-000000000003';
  const TEACHER_A = '00000000-0000-4000-8000-000000000004';
  const TEACHER_B = '00000000-0000-4000-8000-000000000005';
  const SUBJECT = '00000000-0000-4000-8000-000000000006';

  const ts = (hours: number, minutes: number): number =>
    new Date(2026, 8, 14, hours, minutes).getTime();

  const existing = {
    id: 'schedule-9',
    class_id: CLASS_B,
    subject_id: SUBJECT,
    teacher_user_id: TEACHER_A,
    day_of_week: 1,
    start_time: ts(7, 30),
    end_time: ts(9, 0),
    academic_year_id: YEAR,
    class_name: '10B',
    subject_name: 'Matematika',
    teacher_name: 'Budi Santoso',
  };

  const validBody = {
    class_id: CLASS_A,
    subject_id: SUBJECT,
    teacher_user_id: TEACHER_A,
    day_of_week: 1,
    start_time: ts(8, 0),
    end_time: ts(9, 30),
    academic_year_id: YEAR,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(findSchedulesByYearAndDayWithDetails).mockReturnValue([]);
    vi.mocked(createSchedule).mockReturnValue({ id: 'new-schedule' } as never);
    vi.mocked(updateSchedule).mockReturnValue({ id: 'schedule-1' } as never);
  });

  it('rejects a teacher double-booked in overlapping hours', () => {
    vi.mocked(findSchedulesByYearAndDayWithDetails).mockReturnValue([existing] as never);
    const res = mockResponse();
    addSchedule(mockRequest({ user: mockUser(), body: validBody }), res);

    expect(res._status).toBe(409);
    expect(res._body).toMatchObject({ code: 'SCHEDULE_CONFLICT' });
    expect(res._body.message).toContain('Guru Budi Santoso sudah memiliki jadwal Matematika di kelas 10B pada Senin 07:30–09:00');
    expect(createSchedule).not.toHaveBeenCalled();
  });

  it('rejects a class double-booked in overlapping hours', () => {
    vi.mocked(findSchedulesByYearAndDayWithDetails).mockReturnValue([{ ...existing, class_id: CLASS_A, class_name: '10A' }] as never);
    const res = mockResponse();
    addSchedule(mockRequest({ user: mockUser(), body: { ...validBody, teacher_user_id: TEACHER_B } }), res);

    expect(res._status).toBe(409);
    expect(res._body.message).toContain('Kelas 10A sudah memiliki jadwal Matematika');
    expect(createSchedule).not.toHaveBeenCalled();
  });

  it('allows back-to-back slots that only touch at the edges', () => {
    vi.mocked(findSchedulesByYearAndDayWithDetails).mockReturnValue([existing] as never);
    const res = mockResponse();
    addSchedule(mockRequest({ user: mockUser(), body: { ...validBody, start_time: ts(9, 0), end_time: ts(10, 30) } }), res);

    expect(res._status).toBe(201);
    expect(createSchedule).toHaveBeenCalled();
  });

  it('rejects an end time that is not after the start time', () => {
    const res = mockResponse();
    addSchedule(mockRequest({ user: mockUser(), body: { ...validBody, start_time: ts(9, 0), end_time: ts(9, 0) } }), res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ code: 'INVALID_TIME_RANGE' });
    expect(createSchedule).not.toHaveBeenCalled();
  });

  it('returns 404 when editing a missing schedule', () => {
    vi.mocked(findScheduleById).mockReturnValue(undefined);
    const res = mockResponse();
    editSchedule(mockRequest({ user: mockUser(), params: { id: 'missing' }, body: { day_of_week: 2 } }), res);

    expect(res._status).toBe(404);
    expect(updateSchedule).not.toHaveBeenCalled();
  });

  it('ignores the edited schedule itself when checking conflicts', () => {
    vi.mocked(findScheduleById).mockReturnValue({ ...validBody, id: 'schedule-1' } as never);
    vi.mocked(findSchedulesByYearAndDayWithDetails).mockReturnValue([{ ...existing, id: 'schedule-1' }] as never);
    const res = mockResponse();
    editSchedule(mockRequest({ user: mockUser(), params: { id: 'schedule-1' }, body: { start_time: ts(7, 0), end_time: ts(8, 0) } }), res);

    expect(res._status).toBe(200);
    expect(updateSchedule).toHaveBeenCalled();
  });

  it('rejects an edit that overlaps another schedule', () => {
    vi.mocked(findScheduleById).mockReturnValue({ ...validBody, id: 'schedule-1' } as never);
    vi.mocked(findSchedulesByYearAndDayWithDetails).mockReturnValue([existing] as never);
    const res = mockResponse();
    editSchedule(mockRequest({ user: mockUser(), params: { id: 'schedule-1' }, body: { start_time: ts(8, 0), end_time: ts(9, 30) } }), res);

    expect(res._status).toBe(409);
    expect(updateSchedule).not.toHaveBeenCalled();
  });
});
