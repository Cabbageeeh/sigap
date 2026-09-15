import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/grades', () => ({
  getGradesPaginated: vi.fn(),
  findGradeById: vi.fn(),
  findGradesByStudent: vi.fn(),
  findGradesByStudentForTeacher: vi.fn(),
  createGrade: vi.fn(),
  updateGrade: vi.fn(),
  deleteGrade: vi.fn(),
  getClassSubjectSummary: vi.fn(),
}));

vi.mock('@queries/teacherConfirmations', () => ({
  findTodayConfirmationByTeacher: vi.fn(() => ({ id: 'confirmation-1' })),
}));
vi.mock('@queries/gradeAuditLogs', () => ({
  logGradeChange: vi.fn(),
}));

vi.mock('@queries/students', () => ({
  findAllStudents: vi.fn(() => []),
  findStudentsByTeacherUser: vi.fn(() => []),
  findStudentById: vi.fn(() => ({ class_id: '00000000-0000-4000-8000-000000000003' })),
}));
vi.mock('@queries/subjects', () => ({ findAllSubjects: vi.fn(() => []) }));
vi.mock('@queries/classes', () => ({
  findAllClasses: vi.fn(() => []),
  findClassesByTeacherUser: vi.fn(() => []),
  findClassById: vi.fn(() => ({ id: '00000000-0000-4000-8000-000000000003', academic_year_id: 'year-1' })),
}));
vi.mock('@queries/gradeComponents', () => ({
  addGradeComponent: vi.fn(),
  findGradeComponent: vi.fn(() => ({ id: 'comp-1', type: 'task', name: 'Tugas' })),
  renameGradeComponent: vi.fn(),
  deleteGradeComponent: vi.fn(() => 2),
}));
vi.mock('@queries/academicYears', () => ({ findAllAcademicYears: vi.fn(() => []) }));

vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => false),
  hasPermission: vi.fn(() => false),
  hasRole: vi.fn(() => false),
}));
vi.mock('@queries/teacherClassAssignments', () => ({
  isTeacherUser: vi.fn(() => false),
  isTeacherAssignedToClass: vi.fn(() => false),
  isTeacherAssignedToStudent: vi.fn(() => false),
  isTeacherAssignedToClassSubject: vi.fn(() => false),
  isTeacherHomeroomOfClass: vi.fn(() => false),
}));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));


import { addGrade, editGrade, removeGrade, gradeData, renameGradeComponentType, removeGradeComponentType } from '../../app/handlers/grades';
import { createGrade, updateGrade, deleteGrade, findGradeById } from '@queries/grades';
import { findGradeComponent, renameGradeComponent, deleteGradeComponent } from '@queries/gradeComponents';
import { logGradeChange } from '@queries/gradeAuditLogs';
import { findTodayConfirmationByTeacher } from '@queries/teacherConfirmations';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import { isTeacherUser, isTeacherAssignedToClassSubject, isTeacherHomeroomOfClass } from '@queries/teacherClassAssignments';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const gradeBody = {
  student_id: uuid(1),
  subject_id: uuid(2),
  class_id: uuid(3),
  type: 'task',
  score: 90,
  date: 1750000000000,
  teacher_user_id: uuid(4),
};

describe('grades handler audit hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs a create action when a grade is added', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(true);
    vi.mocked(createGrade).mockReturnValue({ id: 'grade-1', ...gradeBody, created_at: 1, updated_at: 1 } as never);
    const req = mockRequest({ body: gradeBody, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse();

    addGrade(req, res);

    expect(logGradeChange).toHaveBeenCalledWith({
      grade_id: 'grade-1',
      student_id: gradeBody.student_id,
      subject_id: gradeBody.subject_id,
      class_id: gradeBody.class_id,
      type: 'task',
      action: 'create',
      old_score: null,
      new_score: 90,
      user_id: 'user-1',
    });
  });

  it('logs an update action with old and new scores', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(true);
    vi.mocked(findGradeById).mockReturnValue({ id: 'grade-1', ...gradeBody, score: 80, created_at: 1, updated_at: 1 } as never);
    vi.mocked(updateGrade).mockReturnValue({ id: 'grade-1', ...gradeBody, score: 90, created_at: 1, updated_at: 2 } as never);
    const req = mockRequest({ params: { id: 'grade-1' }, body: { score: 90 }, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse();

    editGrade(req, res);

    expect(logGradeChange).toHaveBeenCalledWith(expect.objectContaining({
      grade_id: 'grade-1',
      action: 'update',
      old_score: 80,
      new_score: 90,
      user_id: 'user-1',
    }));
  });

  it('logs a delete action with the old score', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(true);
    vi.mocked(findGradeById).mockReturnValue({ id: 'grade-1', ...gradeBody, score: 80, created_at: 1, updated_at: 1 } as never);
    vi.mocked(deleteGrade).mockReturnValue(true);
    const req = mockRequest({ params: { id: 'grade-1' }, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse();

    removeGrade(req, res);

    expect(logGradeChange).toHaveBeenCalledWith(expect.objectContaining({
      grade_id: 'grade-1',
      action: 'delete',
      old_score: 80,
      new_score: null,
      user_id: 'user-1',
    }));
  });

  it('does not log when the grade to delete does not exist', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(true);
    vi.mocked(findGradeById).mockReturnValue(undefined);
    vi.mocked(deleteGrade).mockReturnValue(false);
    const req = mockRequest({ params: { id: 'missing' }, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse();

    removeGrade(req, res);

    expect(logGradeChange).not.toHaveBeenCalled();
    expect(res._status).toBe(404);
  });
  it('denies admin grade entry even with grade permissions', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(false);
    const req = mockRequest({ body: gradeBody, user: mockUser({ id: 'admin-1' }) });
    const res = mockResponse();

    addGrade(req, res);

    expect(res._status).toBe(403);
    expect(createGrade).not.toHaveBeenCalled();
  });

  it('denies a teacher who is not assigned to the grade class', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(false);
    const req = mockRequest({ body: gradeBody, user: mockUser({ id: 'teacher-1' }) });
    const res = mockResponse();

    addGrade(req, res);

    expect(res._status).toBe(403);
    expect(createGrade).not.toHaveBeenCalled();
  });

  it('allows a homeroom teacher to view another subject in their class', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(true);
    vi.mocked(findGradeById).mockReturnValue({ id: 'grade-1', ...gradeBody, score: 80, created_at: 1, updated_at: 1 } as never);
    const req = mockRequest({ params: { id: 'grade-1' }, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse();

    gradeData(req, res);

    expect(res._status).toBe(200);
  });

  it('denies a teacher from viewing an unrelated subject in an assigned class', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherHomeroomOfClass).mockReturnValue(false);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(false);
    vi.mocked(findGradeById).mockReturnValue({ id: 'grade-1', ...gradeBody, score: 80, created_at: 1, updated_at: 1 } as never);
    const req = mockRequest({ params: { id: 'grade-1' }, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse();

    gradeData(req, res);

    expect(res._status).toBe(403);
  });

  it('denies parent access to the generic grade endpoint', () => {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasRole).mockReturnValue(true);
    vi.mocked(hasPermission).mockReturnValue(true);
    const req = mockRequest({ params: { id: 'grade-1' }, user: mockUser({ id: 'parent-1', roles: ['parent'] }) });
    const res = mockResponse();

    gradeData(req, res);

    expect(res._status).toBe(403);
    expect(findGradeById).not.toHaveBeenCalled();
  });

  it('requires the daily attendance confirmation before grade entry', () => {
    vi.mocked(hasRole).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(true);
    vi.mocked(findTodayConfirmationByTeacher).mockReturnValue(undefined);
    const req = mockRequest({ body: gradeBody, user: mockUser({ id: 'user-1' }) });
    const res = mockResponse();

    addGrade(req, res);

    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    expect(createGrade).not.toHaveBeenCalled();
  });
});

describe('grade component rename/delete', () => {
  const componentBody = {
    class_id: uuid(3),
    subject_id: uuid(2),
    name: 'Tugas 2',
  };

  function teacherReq(params: Record<string, string>, body: Record<string, unknown>) {
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(hasRole).mockReturnValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(findGradeComponent).mockReturnValue({ id: 'comp-1', type: 'task', name: 'Tugas' } as never);
    vi.mocked(isTeacherUser).mockReturnValue(true);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(true);
    vi.mocked(findTodayConfirmationByTeacher).mockReturnValue({ id: 'c1' } as never);
    return mockRequest({ params, body, user: mockUser({ id: 'teacher-1' }) });
  }

  beforeEach(() => vi.clearAllMocks());

  it('renames a component for the class academic year', () => {
    const req = teacherReq({ type: 'task' }, componentBody);
    const res = mockResponse();

    renameGradeComponentType(req, res);

    expect(renameGradeComponent).toHaveBeenCalledWith('year-1', 'task', 'Tugas 2');
    expect(res._status).toBe(200);
  });

  it('rejects rename for an unknown component type', () => {
    const req = teacherReq({ type: 'task' }, componentBody);
    vi.mocked(findGradeComponent).mockReturnValue(undefined);
    const res = mockResponse();

    renameGradeComponentType(req, res);

    expect(res._status).toBe(404);
    expect(renameGradeComponent).not.toHaveBeenCalled();
  });

  it('rejects rename when the teacher is not assigned to the class subject', () => {
    const req = teacherReq({ type: 'task' }, componentBody);
    vi.mocked(isTeacherAssignedToClassSubject).mockReturnValue(false);
    const res = mockResponse();

    renameGradeComponentType(req, res);

    expect(res._status).toBe(403);
    expect(renameGradeComponent).not.toHaveBeenCalled();
  });

  it('deletes a component and its grades', () => {
    const req = teacherReq({ type: 'task' }, { class_id: uuid(3), subject_id: uuid(2) });
    const res = mockResponse();

    removeGradeComponentType(req, res);

    expect(deleteGradeComponent).toHaveBeenCalledWith('year-1', 'task');
    expect(res._status).toBe(200);
  });

  it('rejects delete without grades.delete permission', () => {
    const req = teacherReq({ type: 'task' }, { class_id: uuid(3), subject_id: uuid(2) });
    vi.mocked(hasPermission).mockReturnValue(false);
    const res = mockResponse();

    removeGradeComponentType(req, res);

    expect(res._status).toBe(403);
    expect(deleteGradeComponent).not.toHaveBeenCalled();
  });

  it('rejects delete for an invalid type slug', () => {
    const req = teacherReq({ type: 'Tugas 1!' }, { class_id: uuid(3), subject_id: uuid(2) });
    const res = mockResponse();

    removeGradeComponentType(req, res);

    expect(res._status).toBe(422);
    expect(deleteGradeComponent).not.toHaveBeenCalled();
  });
});
