import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

const CLASS_ID = 'class-1';
const OTHER_CLASS_ID = 'class-2';

vi.mock('@services/Pdf', () => ({
  renderTablePdf: vi.fn(() => Buffer.from('%PDF-mock')),
}));
vi.mock('@queries/schoolLocations', () => ({
  findActiveSchoolLocation: vi.fn(() => ({ name: 'SMA Uji', start_time: '07:00' })),
}));
vi.mock('@queries/classes', () => ({
  findClassById: vi.fn((id: string) => ({ id, name: id === CLASS_ID ? '10A' : '11B', grade: 10 })),
  findClassesByTeacherUser: vi.fn(() => [{ id: CLASS_ID, name: '10A' }]),
}));
vi.mock('@queries/students', () => ({
  findClassRoster: vi.fn(() => [
    { id: 'st-1', name: 'Ahmad Fauzi', nis: '10001', parent_name: 'Rahmat Fauzi', parent_username: null, parent_phone: '0812', parent_address: 'Jl. Kenanga 1', phone: null, address: null },
  ]),
}));
vi.mock('@queries/subjects', () => ({
  findAllSubjects: vi.fn(() => [
    { id: 'sub-mat', name: 'Matematika' },
    { id: 'sub-bio', name: 'Biologi' },
  ]),
}));
vi.mock('@queries/schedules', () => ({
  findSchedulesByTeacher: vi.fn(() => [{ class_id: CLASS_ID, subject_id: 'sub-mat' }]),
}));
vi.mock('@queries/teacherClassAssignments', () => ({
  isTeacherUser: vi.fn(() => false),
  isTeacherHomeroomOfClass: vi.fn(() => false),
}));
vi.mock('@queries/studentAttendance', () => ({
  getAttendanceRecap: vi.fn(() => [
    { student_id: 'st-1', student_name: 'Ahmad Fauzi', nis: '10001', present: 12, sick: 1, leave: 0, absent: 2, total: 15 },
  ]),
}));
vi.mock('@queries/headmaster', () => ({
  findClassGradeDetails: vi.fn(() => [
    { id: 'g1', student_id: 'st-1', student_name: 'Ahmad Fauzi', nis: '10001', subject_name: 'Matematika', type: 'task', score: 80, date: 1 },
    { id: 'g2', student_id: 'st-1', student_name: 'Ahmad Fauzi', nis: '10001', subject_name: 'Matematika', type: 'midterm', score: 90, date: 2 },
    { id: 'g3', student_id: 'st-1', student_name: 'Ahmad Fauzi', nis: '10001', subject_name: 'Biologi', type: 'task', score: 70, date: 3 },
  ]),
}));
vi.mock('@queries/teacherConfirmations', () => ({
  findConfirmationReportRows: vi.fn(() => [
    { teacher_name: 'Budi Santoso', confirmation_date: 1, confirmed_at: 1, distance_meters: 40, is_inside_school: 1 },
  ]),
}));
vi.mock('@queries/journals', () => ({
  findJournalReportRows: vi.fn(() => [
    { id: 'j1', date: 1, material: 'Persamaan kuadrat', class_name: '10A', subject_name: 'Matematika', teacher_name: 'Budi Santoso', start_time: 1, end_time: 2 },
  ]),
}));
vi.mock('@queries/appSettings', () => ({
  isTeacherPresenceEnabled: vi.fn(() => true),
}));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => false),
  hasRole: vi.fn(() => false),
  hasPermission: vi.fn(() => true),
}));

import { renderTablePdf } from '@services/Pdf';
import { findConfirmationReportRows } from '@queries/teacherConfirmations';
import { findJournalReportRows } from '@queries/journals';
import { getAttendanceRecap } from '@queries/studentAttendance';
import { isTeacherHomeroomOfClass, isTeacherUser } from '@queries/teacherClassAssignments';
import { hasPermission, hasRole, isAdmin } from '@queries/users';
import {
  exportClassAttendancePdf,
  exportClassGradesPdf,
  exportClassRosterPdf,
  exportJournalLogPdf,
  exportTeacherPresencePdf,
} from '../../app/handlers/reportExports';

type Report = Parameters<typeof renderTablePdf>[0];
const lastReport = (): Report => vi.mocked(renderTablePdf).mock.calls.at(-1)?.[0] as Report;

const teacherUser = mockUser({ id: 'teacher-1', name: 'Budi Santoso', roles: ['teacher'] });
const headmasterUser = mockUser({ id: 'kepsek-1', name: 'Kepala', roles: ['headmaster'] });
const adminUser = mockUser({ id: 'admin-1', name: 'Admin', roles: ['admin'] });
const parentUser = mockUser({ id: 'ortu-1', name: 'Orang Tua', roles: ['parent'] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(renderTablePdf).mockReturnValue(Buffer.from('%PDF-mock'));
  vi.mocked(isAdmin).mockImplementation((id?: unknown) => id === 'admin-1');
  vi.mocked(hasRole).mockImplementation((id?: unknown, role?: unknown) => role === 'parent' && id === 'ortu-1');
  vi.mocked(hasPermission).mockImplementation(() => true);
  vi.mocked(isTeacherUser).mockImplementation((id?: unknown) => id === 'teacher-1');
  vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(false);
});

describe('exportClassAttendancePdf', () => {
  it('rejects an anonymous request', () => {
    const res = mockResponse();
    exportClassAttendancePdf(mockRequest({ params: { classId: CLASS_ID } }), res);
    expect(res._status).toBe(401);
  });

  it('rejects a teacher documenting a class they do not teach', () => {
    const res = mockResponse();
    exportClassAttendancePdf(mockRequest({ user: teacherUser, params: { classId: OTHER_CLASS_ID } }), res);
    expect(res._status).toBe(403);
    expect(renderTablePdf).not.toHaveBeenCalled();
  });

  it('limits a teacher to their own classes and names the file after the class and period', () => {
    const res = mockResponse();
    const from = new Date(2026, 8, 1).getTime();
    const to = new Date(2026, 8, 23, 23, 59, 59).getTime();
    exportClassAttendancePdf(mockRequest({ user: teacherUser, params: { classId: CLASS_ID }, query: { from: String(from), to: String(to) } }), res);

    expect(getAttendanceRecap).toHaveBeenCalledWith(CLASS_ID, from, to, 'teacher-1');
    expect(res._headers['Content-Type']).toBe('application/pdf');
    expect(res._headers['Content-Disposition']).toContain('rekap-absensi-10a-20260901-20260923.pdf');
    expect(lastReport().rows.at(-1)).toEqual(['', 'JUMLAH KESELURUHAN', '', 12, 1, 0, 2, 15, '80%']);
  });

  it('lets the school office document every class', () => {
    const res = mockResponse();
    exportClassAttendancePdf(mockRequest({ user: headmasterUser, params: { classId: CLASS_ID } }), res);
    expect(res._status).toBe(200);
    expect(getAttendanceRecap).toHaveBeenCalledWith(CLASS_ID, expect.any(Number), expect.any(Number), undefined);
  });
});

describe('exportClassRosterPdf', () => {
  it('refuses parents', () => {
    const res = mockResponse();
    exportClassRosterPdf(mockRequest({ user: parentUser, params: { classId: CLASS_ID } }), res);
    expect(res._status).toBe(403);
  });

  it('prints guardian contact next to each student', () => {
    const res = mockResponse();
    exportClassRosterPdf(mockRequest({ user: adminUser, params: { classId: CLASS_ID } }), res);
    expect(isAdmin).toHaveBeenCalledWith('admin-1');
    expect(lastReport().rows[0]).toEqual([1, 'Ahmad Fauzi', '10001', 'Rahmat Fauzi', '0812', 'Jl. Kenanga 1']);
  });
});

describe('exportClassGradesPdf', () => {
  it('keeps administrators out of grade documents, like the grades screen', () => {
    const res = mockResponse();
    exportClassGradesPdf(mockRequest({ user: adminUser, params: { classId: CLASS_ID } }), res);
    expect(res._status).toBe(403);
  });

  it('shows a subject teacher only the subject they teach', () => {
    const res = mockResponse();
    exportClassGradesPdf(mockRequest({ user: teacherUser, params: { classId: CLASS_ID } }), res);
    const report = lastReport();
    expect(report.columns.map(column => column.label)).toEqual(['No', 'Nama Siswa', 'NIS', 'Matematika', 'Rata-rata']);
    expect(report.rows[0]).toEqual([1, 'Ahmad Fauzi', '10001', '85.00', '85.00']);
  });

  it('shows the homeroom teacher every subject of the class', () => {
    vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(true);
    const res = mockResponse();
    exportClassGradesPdf(mockRequest({ user: teacherUser, params: { classId: CLASS_ID } }), res);
    expect(lastReport().columns.map(column => column.label)).toEqual(['No', 'Nama Siswa', 'NIS', 'Biologi', 'Matematika', 'Rata-rata']);
  });
});

describe('exportTeacherPresencePdf', () => {
  it('refuses a role without confirmation access', () => {
    vi.mocked(hasPermission).mockReturnValue(false);
    const res = mockResponse();
    exportTeacherPresencePdf(mockRequest({ user: parentUser }), res);
    expect(res._status).toBe(403);
  });

  it('narrows a teacher to their own scans', () => {
    exportTeacherPresencePdf(mockRequest({ user: teacherUser }), mockResponse());
    expect(findConfirmationReportRows).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'teacher-1');
  });

  it('reports on-time and outside-radius status for the office', () => {
    const res = mockResponse();
    exportTeacherPresencePdf(mockRequest({ user: headmasterUser }), res);
    expect(findConfirmationReportRows).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), undefined);
    expect(lastReport().footnotes?.[0]).toContain('pindai QR');
  });
});

describe('exportJournalLogPdf', () => {
  it('refuses administrators, matching the journals screen', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    const res = mockResponse();
    exportJournalLogPdf(mockRequest({ user: adminUser }), res);
    expect(res._status).toBe(403);
  });

  it('limits a teacher to their own journals', () => {
    const res = mockResponse();
    exportJournalLogPdf(mockRequest({ user: teacherUser }), res);
    expect(findJournalReportRows).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'teacher-1');
    expect(lastReport().landscape).toBe(true);
    expect(lastReport().rows[0]?.[6]).toBe('Persamaan kuadrat');
  });

  it('lists every teacher for the headmaster', () => {
    exportJournalLogPdf(mockRequest({ user: headmasterUser }), mockResponse());
    expect(findJournalReportRows).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), undefined);
  });
});
