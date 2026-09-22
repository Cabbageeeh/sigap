import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/stats', () => ({
  getDashboardStats: vi.fn(),
}));

vi.mock('@queries/headmaster', () => ({
  getTodaySessions: vi.fn(() => []),
  getMissedConfirmations: vi.fn(() => []),
  getJournalCompleteness: vi.fn(() => []),
  getGradeProgress: vi.fn(() => []),
  getClassOverview: vi.fn(() => []),
  getTeacherAttendanceOverview: vi.fn(() => []),
  getTeacherAttendanceHistory: vi.fn(() => []),
  findClassGradeDetails: vi.fn(() => []),
  getOutsideConfirmations: vi.fn(() => []),
}));

vi.mock('@queries/schoolLocations', () => ({
  findActiveSchoolLocation: vi.fn(),
}));

vi.mock('@queries/teacherConfirmations', () => ({
  findAllTeacherConfirmations: vi.fn(() => []),
}));

vi.mock('@queries/classes', () => ({
  findClassById: vi.fn(),
}));

vi.mock('@queries/teachers', () => ({
  findTeacherByUserId: vi.fn(),
}));

vi.mock('@queries/users', () => ({
  hasPermission: vi.fn(() => true),
}));

import {
  headmasterClassGradesPage,
  headmasterDashboardData,
  headmasterDashboardPage,
  headmasterTeacherAttendancePage,
} from '../../app/handlers/headmaster';
import {
  findClassGradeDetails,
  getClassOverview,
  getTeacherAttendanceHistory,
  getTeacherAttendanceOverview,
} from '@queries/headmaster';
import { findClassById } from '@queries/classes';
import { findTeacherByUserId } from '@queries/teachers';
import { hasPermission } from '@queries/users';

const classItem = {
  id: 'class-1',
  name: '10A',
  grade: '10',
  academic_year_id: 'year-1',
};

const classOverview = {
  class_id: 'class-1',
  class_name: '10A',
  total_students: 20,
  graded_students: 18,
  average_score: 82.5,
  attendance_rate: 95,
  needs_attention: false,
};

const teacherSummary = {
  teacher_user_id: 'teacher-user-1',
  teacher_name: 'Budi Santoso',
  expected_days: 20,
  confirmed_days: 19,
  attendance_rate: 95,
};

describe('headmaster dashboard access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(getClassOverview).mockReturnValue([classOverview]);
    vi.mocked(getTeacherAttendanceOverview).mockReturnValue([teacherSummary]);
  });

  it('redirects unauthenticated page requests to login', () => {
    const req = mockRequest({ user: undefined });
    const res = mockResponse({ inertia: vi.fn() });

    headmasterDashboardPage(req, res);

    expect(res._redirectUrl).toBe('/login');
    expect(res.inertia).not.toHaveBeenCalled();
  });

  it('redirects users without headmaster permission away from the page', () => {
    vi.mocked(hasPermission).mockReturnValue(false);
    const req = mockRequest({ user: mockUser() });
    const res = mockResponse({ inertia: vi.fn() });

    headmasterDashboardPage(req, res);

    expect(res._redirectUrl).toBe('/dashboard');
    expect(res.inertia).not.toHaveBeenCalled();
  });

  it('returns school-wide class and teacher summaries', () => {
    const req = mockRequest({ user: mockUser() });
    const res = mockResponse();

    headmasterDashboardData(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      success: true,
      data: {
        classOverview: [classOverview],
        teacherAttendance: [teacherSummary],
      },
    });
  });

  it('denies the dashboard data endpoint without headmaster permission', () => {
    vi.mocked(hasPermission).mockReturnValue(false);
    const req = mockRequest({ user: mockUser() });
    const res = mockResponse();

    headmasterDashboardData(req, res);

    expect(res._status).toBe(403);
    expect(getClassOverview).not.toHaveBeenCalled();
    expect(getTeacherAttendanceOverview).not.toHaveBeenCalled();
  });
});

describe('headmaster detail pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasPermission).mockReturnValue(true);
  });

  it('renders read-only grade details for a valid class', () => {
    const rows = [{
      id: 'grade-1',
      student_id: 'student-1',
      student_name: 'Ani',
      nis: '10001',
      subject_name: 'Matematika',
      type: 'final',
      score: 90,
      date: 1750000000000,
    }];
    vi.mocked(findClassById).mockReturnValue(classItem);
    vi.mocked(findClassGradeDetails).mockReturnValue(rows);
    const req = mockRequest({ user: mockUser(), params: { classId: classItem.id } });
    const res = mockResponse({ inertia: vi.fn() });

    headmasterClassGradesPage(req, res);

    expect(res.inertia).toHaveBeenCalledWith('headmaster/class-grades', {
      className: classItem.name,
      grade: classItem.grade,
      rows,
    });
  });

  it('renders read-only teacher attendance history for a valid teacher', () => {
    const records = [{
      teacher_user_id: teacherSummary.teacher_user_id,
      teacher_name: teacherSummary.teacher_name,
      date: 1750000000000,
      class_names: '10A',
      subject_names: 'Matematika',
      scheduled_sessions: 2,
      confirmed: true,
      confirmed_at: 1750000100000,
      is_inside_school: 1,
      distance_meters: 12,
    }];
    vi.mocked(findTeacherByUserId).mockReturnValue({
      id: 'teacher-1',
      user_id: teacherSummary.teacher_user_id,
      employee_id: 'EMP-1',
      phone: null,
    });
    vi.mocked(getTeacherAttendanceOverview).mockReturnValue([teacherSummary]);
    vi.mocked(getTeacherAttendanceHistory).mockReturnValue(records);
    const req = mockRequest({ user: mockUser(), params: { teacherUserId: teacherSummary.teacher_user_id } });
    const res = mockResponse({ inertia: vi.fn() });

    headmasterTeacherAttendancePage(req, res);

    expect(res.inertia).toHaveBeenCalledWith('headmaster/teacher-attendance', {
      summary: teacherSummary,
      rows: records,
    });
  });
});
