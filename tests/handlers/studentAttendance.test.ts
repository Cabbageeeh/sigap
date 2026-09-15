import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/studentAttendance', () => ({
  findAttendanceByJournal: vi.fn(),
  findAttendanceByStudent: vi.fn(),
  findStudentAttendanceById: vi.fn(),
  upsertStudentAttendance: vi.fn(),
  deleteStudentAttendance: vi.fn(),
  getAttendanceRecap: vi.fn(() => []),
}));
vi.mock('@queries/journals', () => ({ findJournalById: vi.fn() }));
vi.mock('@queries/schedules', () => ({ findScheduleById: vi.fn() }));
vi.mock('@queries/classes', () => ({
  findAllClasses: vi.fn(() => [{ id: 'class-1', name: '10A' }]),
  findClassesByTeacherUser: vi.fn(() => []),
}));
vi.mock('@queries/teacherClassAssignments', () => ({ isTeacherUser: vi.fn(() => false) }));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => true),
  hasPermission: vi.fn(() => true),
  hasRole: vi.fn(() => true),
}));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { listAttendanceByJournal, listAttendanceByStudent, studentAttendancePage } from '../../app/handlers/studentAttendance';
import { findAttendanceByJournal, findAttendanceByStudent } from '@queries/studentAttendance';
import { findJournalById } from '@queries/journals';

const parentRequest = (overrides: Parameters<typeof mockRequest>[0] = {}) =>
  mockRequest({ user: mockUser({ id: 'parent-1', roles: ['parent'] }), ...overrides });

describe('parent attendance scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('denies direct attendance access for another student', () => {
    const res = mockResponse();

    listAttendanceByStudent(parentRequest({ params: { studentId: 'student-2' } }), res);

    expect(res._status).toBe(403);
    expect(findAttendanceByStudent).not.toHaveBeenCalled();
  });

  it('denies journal attendance access to parents', () => {
    const res = mockResponse();

    vi.mocked(findJournalById).mockReturnValue({ id: 'journal-2', schedule_id: 'schedule-2' } as never);
    listAttendanceByJournal(parentRequest({ params: { journalId: 'journal-2' } }), res);

    expect(res._status).toBe(403);
    expect(findJournalById).toHaveBeenCalledWith('journal-2');
    expect(findAttendanceByJournal).not.toHaveBeenCalled();
  });
});

describe('studentAttendancePage date filter defaults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults from/to to today when query params are absent', () => {
    const inertia = vi.fn();
    const res = mockResponse({ inertia });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = startOfToday.getTime() + 86399999;

    studentAttendancePage(mockRequest({ user: mockUser({ id: 'admin-1', roles: ['admin'] }) }), res);

    expect(inertia).toHaveBeenCalledTimes(1);
    const props = inertia.mock.calls[0][1] as { filters: { from: number; to: number } };
    expect(props.filters.from).toBe(startOfToday.getTime());
    expect(props.filters.to).toBe(endOfToday);
  });
});
