import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/parents', () => ({
  findParentByUserId: vi.fn(),
}));

vi.mock('@queries/students', () => ({
  findStudentsByParent: vi.fn(),
  findStudentById: vi.fn(),
}));

vi.mock('@queries/grades', () => ({
  findGradesByStudent: vi.fn(),
  getStudentGradeSummaries: vi.fn(),
  getGradesPublicationForStudent: vi.fn(),
  findGradeProgressionByStudent: vi.fn(() => []),
}));

vi.mock('@queries/studentAttendance', () => ({
  findAttendanceByStudent: vi.fn(),
}));
vi.mock('@queries/users', () => ({
  hasRole: vi.fn(() => true),
}));

import { childAttendancePage, parentGradesPage } from '../../app/handlers/parent';
import { findParentByUserId } from '@queries/parents';
import { findStudentsByParent, findStudentById } from '@queries/students';
import { getStudentGradeSummaries } from '@queries/grades';
import { findAttendanceByStudent } from '@queries/studentAttendance';

const parent = { id: 'parent-1', user_id: 'user-1', phone: '0812', address: 'Jl. Test' };
describe('childAttendancePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the owned child attendance as an Inertia page', () => {
    vi.mocked(findParentByUserId).mockReturnValue(parent as never);
    vi.mocked(findStudentsByParent).mockReturnValue([child] as never);
    vi.mocked(findStudentById).mockReturnValue(child as never);
    vi.mocked(findAttendanceByStudent).mockReturnValue([{ id: 'attendance-1' }] as never);
    const req = mockRequest({ params: { studentId: 'student-1' }, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse({ inertia: vi.fn() });

    childAttendancePage(req, res);

    expect(res.inertia).toHaveBeenCalledWith('parent/attendance', {
      studentName: 'Ani',
      records: [{ id: 'attendance-1' }],
    });
  });

  it('redirects when the requested student is not owned', () => {
    vi.mocked(findParentByUserId).mockReturnValue(parent as never);
    vi.mocked(findStudentsByParent).mockReturnValue([] as never);
    const req = mockRequest({ params: { studentId: 'student-2' }, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse({ inertia: vi.fn() });

    childAttendancePage(req, res);

    expect(res._redirectUrl).toBe('/parent/dashboard');
    expect(findAttendanceByStudent).not.toHaveBeenCalled();
  });
});

const child = { id: 'student-1', nis: '12345', name: 'Ani', class_id: 'class-1', parent_user_id: 'user-1', phone: null, address: null };
const summary = {
  subject_id: 'subject-1',
  subject_name: 'Matematika',
  kkm: 75,
  scores: { task: 80 },
  final_score: 80,
  predikat: 'B',
  is_passed: true,
};

describe('parentGradesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to login when unauthenticated', () => {
    const req = mockRequest({ params: { studentId: 'student-1' }, user: undefined });
    const res = mockResponse({ inertia: vi.fn() });

    parentGradesPage(req, res);

    expect(res._redirectUrl).toBe('/login');
  });

  it('redirects to dashboard when parent profile is missing', () => {
    vi.mocked(findParentByUserId).mockReturnValue(undefined);
    const req = mockRequest({ params: { studentId: 'student-1' }, user: mockUser() });
    const res = mockResponse({ inertia: vi.fn() });

    parentGradesPage(req, res);

    expect(res._redirectUrl).toBe('/parent/dashboard');
  });

  it('redirects to dashboard when the student is not the parent\'s child', () => {
    vi.mocked(findParentByUserId).mockReturnValue(parent as never);
    vi.mocked(findStudentsByParent).mockReturnValue([] as never);
    const req = mockRequest({ params: { studentId: 'student-1' }, user: mockUser() });
    const res = mockResponse({ inertia: vi.fn() });

    parentGradesPage(req, res);

    expect(res._redirectUrl).toBe('/parent/dashboard');
  });

  it('renders the page with summaries when grades are published', () => {
    vi.mocked(findParentByUserId).mockReturnValue(parent as never);
    vi.mocked(findStudentsByParent).mockReturnValue([child] as never);
    vi.mocked(findStudentById).mockReturnValue(child as never);
    vi.mocked(getStudentGradeSummaries).mockReturnValue({ published: true, summaries: [summary] } as never);
    const req = mockRequest({ params: { studentId: 'student-1' }, user: mockUser() });
    const res = mockResponse({ inertia: vi.fn() });

    parentGradesPage(req, res);

    expect(res.inertia).toHaveBeenCalledWith('parent/grades', {
      studentId: 'student-1',
      studentName: 'Ani',
      gradesPublished: true,
      summaries: [summary],
      progression: [],
    });
  });

  it('hides summaries when grades are not published', () => {
    vi.mocked(findParentByUserId).mockReturnValue(parent as never);
    vi.mocked(findStudentsByParent).mockReturnValue([child] as never);
    vi.mocked(findStudentById).mockReturnValue(child as never);
    vi.mocked(getStudentGradeSummaries).mockReturnValue({ published: false, summaries: [summary] } as never);
    const req = mockRequest({ params: { studentId: 'student-1' }, user: mockUser() });
    const res = mockResponse({ inertia: vi.fn() });

    parentGradesPage(req, res);

    expect(res.inertia).toHaveBeenCalledWith('parent/grades', {
      studentId: 'student-1',
      studentName: 'Ani',
      gradesPublished: false,
      summaries: [],
      progression: [],
    });
  });
});
