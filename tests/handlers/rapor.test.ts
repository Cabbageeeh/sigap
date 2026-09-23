import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/students', () => ({
  findStudentById: vi.fn(),
  findStudentsByParent: vi.fn(),
  findStudentsByClass: vi.fn(),
}));
vi.mock('@queries/grades', () => ({
  getStudentGradeSummaries: vi.fn(),
  getStudentContext: vi.fn(),
}));
vi.mock('@queries/studentAttendance', () => ({ findAttendanceByStudent: vi.fn() }));
vi.mock('@queries/teacherClassAssignments', () => ({
  isTeacherUser: vi.fn(() => false),
  isTeacherHomeroomOfClass: vi.fn(() => false),
}));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => false),
  hasPermission: vi.fn(() => true),
  hasRole: vi.fn(() => false),
}));

import { raporPage } from '../../app/handlers/rapor';
import { findStudentById, findStudentsByParent, findStudentsByClass } from '@queries/students';
import { isTeacherHomeroomOfClass, isTeacherUser } from '@queries/teacherClassAssignments';
import { getStudentGradeSummaries, getStudentContext } from '@queries/grades';
import { findAttendanceByStudent } from '@queries/studentAttendance';
import { hasRole, isAdmin, hasPermission } from '@queries/users';

const STUDENT_ID = 'student-1';
const CLASS_ID = 'class-1';

const openRapor = (userId: string, roles: string[]) => {
  const inertia = vi.fn();
  const req = mockRequest({ user: mockUser({ id: userId, roles }), params: { studentId: STUDENT_ID } });
  const res = mockResponse({ inertia });
  vi.mocked(hasRole).mockImplementation((_id: string, slug: string) => roles.includes(slug));
  raporPage(req, res);
  return { res, inertia };
};

describe('rapor page scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findStudentById).mockReturnValue({ id: STUDENT_ID, class_id: CLASS_ID, name: 'Ani', nis: '10001' } as never);
    vi.mocked(getStudentContext).mockReturnValue({ class_name: '10A', year_name: '2025/2026' } as never);
    vi.mocked(getStudentGradeSummaries).mockReturnValue({ published: true, summaries: [] } as never);
    vi.mocked(findAttendanceByStudent).mockReturnValue([]);
    vi.mocked(findStudentsByClass).mockReturnValue([]);
    vi.mocked(findStudentsByParent).mockReturnValue([]);
  });

  it('lets a parent open their own child', () => {
    vi.mocked(findStudentsByParent).mockReturnValue([{ id: STUDENT_ID }] as never);
    const { inertia, res } = openRapor('parent-1', ['parent']);
    expect(res._redirectUrl).toBeNull();
    expect(inertia).toHaveBeenCalledWith('reports/rapor', expect.objectContaining({ isParent: true }));
  });

  it('redirects when a parent requests another student', () => {
    vi.mocked(findStudentsByParent).mockReturnValue([{ id: 'other-student' }] as never);
    const { inertia, res } = openRapor('parent-1', ['parent']);
    expect(res._redirectUrl).toBe('/dashboard');
    expect(inertia).not.toHaveBeenCalled();
  });

  it('lets the homeroom teacher of the student class open it', () => {
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(true);
    const { inertia } = openRapor('teacher-1', ['teacher']);
    expect(inertia).toHaveBeenCalledWith('reports/rapor', expect.objectContaining({ isParent: false }));
    expect(isTeacherHomeroomOfClass).toHaveBeenCalledWith('teacher-1', CLASS_ID);
  });

  it('redirects a teacher who is not the homeroom teacher', () => {
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(false);
    const { inertia, res } = openRapor('teacher-2', ['teacher']);
    expect(res._redirectUrl).toBe('/dashboard');
    expect(inertia).not.toHaveBeenCalled();
  });

  it('lets the headmaster oversee any student', () => {
    const { inertia } = openRapor('kepala-1', ['headmaster']);
    expect(inertia).toHaveBeenCalled();
  });

  it('keeps administrators out', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(true);
    const { inertia, res } = openRapor('admin-1', ['admin']);
    expect(res._redirectUrl).toBe('/dashboard');
    expect(inertia).not.toHaveBeenCalled();
  });

  it('hides grades from a parent until the school publishes them', () => {
    vi.mocked(findStudentsByParent).mockReturnValue([{ id: STUDENT_ID }] as never);
    vi.mocked(getStudentGradeSummaries).mockReturnValue({
      published: false,
      summaries: [{ subject_name: 'Mathematics' }],
    } as never);

    const { inertia } = openRapor('parent-1', ['parent']);

    expect(inertia).toHaveBeenCalledWith('reports/rapor', expect.objectContaining({
      gradesPublished: false,
      summaries: [],
    }));
  });

  it('moves a parent only between their own children', () => {
    vi.mocked(findStudentsByParent).mockReturnValue([
      { id: 'sibling-0', name: 'Kakak', nis: '10000' },
      { id: STUDENT_ID, name: 'Ani', nis: '10001' },
      { id: 'sibling-2', name: 'Adik', nis: '10002' },
    ] as never);
    vi.mocked(findStudentsByClass).mockReturnValue([{ id: 'stranger', name: 'Bukan anak', nis: '10009' }] as never);

    const { inertia } = openRapor('parent-1', ['parent']);

    expect(inertia).toHaveBeenCalledWith('reports/rapor', expect.objectContaining({
      previousStudent: { id: 'sibling-0', name: 'Kakak', nis: '10000' },
      nextStudent: { id: 'sibling-2', name: 'Adik', nis: '10002' },
      studentPosition: 2,
      studentTotal: 3,
      backHref: `/parent/child/${STUDENT_ID}/grades`,
    }));
    expect(findStudentsByClass).not.toHaveBeenCalled();
  });

  it('walks the homeroom teacher through the class roster', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(true);
    vi.mocked(findStudentsByClass).mockReturnValue([
      { id: STUDENT_ID, name: 'Ani', nis: '10001' },
      { id: 'student-2', name: 'Budi', nis: '10002' },
    ] as never);

    const { inertia } = openRapor('teacher-1', ['teacher']);

    expect(inertia).toHaveBeenCalledWith('reports/rapor', expect.objectContaining({
      previousStudent: null,
      nextStudent: { id: 'student-2', name: 'Budi', nis: '10002' },
      studentPosition: 1,
      studentTotal: 2,
      backHref: `/attendance?class_id=${CLASS_ID}`,
    }));
  });
});
