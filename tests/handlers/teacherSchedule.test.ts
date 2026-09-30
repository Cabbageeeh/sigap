import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/schedules', () => ({
  findTeacherSchedulesByDay: vi.fn(() => []),
  findScheduleById: vi.fn(),
}));
vi.mock('@queries/teacherConfirmations', () => ({
  findTodayConfirmationByTeacher: vi.fn(),
}));
vi.mock('@queries/appSettings', () => ({
  isTeacherPresenceEnabled: vi.fn(() => true),
}));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => false),
  hasPermission: vi.fn(() => true),
}));
vi.mock('@queries/teacherClassAssignments', () => ({
  isTeacherUser: vi.fn(() => true),
}));

import { teacherSchedulePage, listTodaySchedules, todayScheduleDetail } from '../../app/handlers/teacherSchedule';
import { findTeacherSchedulesByDay, findScheduleById } from '@queries/schedules';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';

const schedule = {
  id: '00000000-0000-4000-8000-000000000001',
  class_id: '00000000-0000-4000-8000-000000000002',
  subject_id: '00000000-0000-4000-8000-000000000003',
  teacher_user_id: 'teacher-1',
  academic_year_id: '00000000-0000-4000-8000-000000000004',
  day_of_week: new Date().getDay(),
  start_time: Date.now(),
  end_time: Date.now() + 3600000,
  class_name: '10A',
  subject_name: 'Matematika',
};

const teacher = mockUser({ id: 'teacher-1', roles: ['teacher'] });

const pageResponse = () => {
  const inertia = vi.fn();
  return { res: mockResponse({ inertia }), inertia };
};

describe('teacher daily schedule workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findTodayConfirmationByTeacher).mockReturnValue(undefined);
    vi.mocked(findTeacherSchedulesByDay).mockReturnValue([]);
    vi.mocked(findScheduleById).mockReturnValue(undefined);
  });

  it('hides today classes until the teacher confirms attendance', () => {
    const { res, inertia } = pageResponse();

    teacherSchedulePage(mockRequest({ user: teacher }), res);

    expect(findTeacherSchedulesByDay).not.toHaveBeenCalled();
    expect(inertia).toHaveBeenCalledWith('teacher/schedule', {
      isTeacher: true,
      confirmedToday: false,
      schedules: [],
    });
  });

  it('loads named classes only after one daily confirmation exists', () => {
    vi.mocked(findTodayConfirmationByTeacher).mockReturnValue({ id: 'confirmation-1' } as never);
    vi.mocked(findTeacherSchedulesByDay).mockReturnValue([schedule] as never);
    const { res, inertia } = pageResponse();

    teacherSchedulePage(mockRequest({ user: teacher }), res);

    expect(findTeacherSchedulesByDay).toHaveBeenCalledWith('teacher-1', expect.any(Number));
    expect(inertia).toHaveBeenCalledWith('teacher/schedule', {
      isTeacher: true,
      confirmedToday: true,
      schedules: [schedule],
    });
  });

  it('rejects the today schedule API before attendance confirmation', () => {
    const res = mockResponse();

    listTodaySchedules(mockRequest({ user: teacher }), res);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    expect(findTeacherSchedulesByDay).not.toHaveBeenCalled();
  });

  it('returns today classes with a confirmed status after attendance', () => {
    vi.mocked(findTodayConfirmationByTeacher).mockReturnValue({ id: 'confirmation-1' } as never);
    vi.mocked(findTeacherSchedulesByDay).mockReturnValue([schedule] as never);
    const res = mockResponse();

    listTodaySchedules(mockRequest({ user: teacher }), res);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ success: true, data: [{ ...schedule, confirmed: true }] });
  });

  it('rejects a schedule detail before attendance confirmation', () => {
    vi.mocked(findScheduleById).mockReturnValue(schedule as never);
    const res = mockResponse();

    todayScheduleDetail(mockRequest({ params: { id: schedule.id }, user: teacher }), res);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
  });
});
