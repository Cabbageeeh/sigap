import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/teachers', () => ({
  getTeachersPaginated: vi.fn(() => ({ data: [], total: 0 })),
  findTeacherById: vi.fn(),
  findTeacherByUserId: vi.fn(),
  findTeacherByEmployeeId: vi.fn(),
  createTeacher: vi.fn(),
  updateTeacher: vi.fn(),
  deleteTeacher: vi.fn(),
  getTeacherSubjects: vi.fn(() => []),
  syncTeacherSubjects: vi.fn(),
}));
vi.mock('@queries/subjects', () => ({ findAllSubjects: vi.fn(() => []) }));
vi.mock('@queries/academicYears', () => ({ findActiveAcademicYear: vi.fn() }));
vi.mock('@queries/roles', () => ({ findRoleBySlug: vi.fn() }));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(),
  hasPermission: vi.fn(() => false),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  usernameExists: vi.fn(() => false),
  assignRole: vi.fn(),
}));
vi.mock('@services/Authenticate', () => ({
  hashPassword: vi.fn((password: string) => `hashed-${password}`),
  comparePassword: vi.fn(),
}));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { addTeacher, editTeacher } from '../../app/handlers/teachers';
import { findTeacherById, findTeacherByEmployeeId, createTeacher, updateTeacher, syncTeacherSubjects } from '@queries/teachers';
import { findAllSubjects } from '@queries/subjects';
import { findActiveAcademicYear } from '@queries/academicYears';
import { findRoleBySlug } from '@queries/roles';
import { isAdmin, hasPermission, createUser, updateUser, usernameExists, assignRole } from '@queries/users';
import { hashPassword } from '@services/Authenticate';

const teacherId = '00000000-0000-4000-8000-000000000001';
const yearId = '00000000-0000-4000-8000-000000000002';
const subjectId = '00000000-0000-4000-8000-000000000003';
const roleId = '00000000-0000-4000-8000-000000000004';
const userId = '00000000-0000-4000-8000-000000000005';

const validBody = { nip: '198501012010011234', name: 'Budi Santoso', subject_ids: [subjectId] };

const uniqueError = () => Object.assign(new Error('UNIQUE constraint failed'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });

describe('teachers handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasPermission).mockReturnValue(false);
    vi.mocked(findTeacherByEmployeeId).mockReturnValue(undefined);
    vi.mocked(findRoleBySlug).mockReturnValue({ id: roleId, slug: 'teacher' } as never);
    vi.mocked(findActiveAcademicYear).mockReturnValue({ id: yearId } as never);
    vi.mocked(findAllSubjects).mockReturnValue([{ id: subjectId }] as never);
    vi.mocked(usernameExists).mockReturnValue(false);
    vi.mocked(createUser).mockReturnValue({ id: userId, username: 'guru_1234' } as never);
    vi.mocked(createTeacher).mockReturnValue({ id: teacherId, user_id: userId } as never);
    vi.mocked(findTeacherById).mockReturnValue({ id: teacherId, user_id: userId } as never);
  });

  describe('addTeacher', () => {
    it('returns 401 when unauthenticated', () => {
      const res = mockResponse();
      addTeacher(mockRequest({ body: validBody }), res);
      expect(res._status).toBe(401);
      expect(createUser).not.toHaveBeenCalled();
    });

    it('returns 403 when user cannot manage teachers', () => {
      vi.mocked(isAdmin).mockReturnValue(false);
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: validBody }), res);
      expect(res._status).toBe(403);
      expect(createUser).not.toHaveBeenCalled();
    });

    it('returns 422 for an invalid body', () => {
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: { nip: '12', name: '', subject_ids: ['not-a-uuid'] } }), res);
      expect(res._status).toBe(422);
      expect(res._body.errors).toHaveProperty('nip');
      expect(createUser).not.toHaveBeenCalled();
    });

    it('returns 409 when the NIP is already registered', () => {
      vi.mocked(findTeacherByEmployeeId).mockReturnValue({ id: teacherId } as never);
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: validBody }), res);
      expect(res._status).toBe(409);
      expect(res._body).toMatchObject({ code: 'DUPLICATE_NIP' });
      expect(createUser).not.toHaveBeenCalled();
    });

    it('returns 500 when the teacher role is missing', () => {
      vi.mocked(findRoleBySlug).mockReturnValue(undefined);
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: validBody }), res);
      expect(res._status).toBe(500);
      expect(createUser).not.toHaveBeenCalled();
    });

    it('returns 400 when subjects are given without an active academic year', () => {
      vi.mocked(findActiveAcademicYear).mockReturnValue(null as never);
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: validBody }), res);
      expect(res._status).toBe(400);
      expect(createUser).not.toHaveBeenCalled();
    });

    it('creates a login account with guru_ username and default password', () => {
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: validBody }), res);

      expect(res._status).toBe(201);
      expect(hashPassword).toHaveBeenCalledWith('guru123');
      expect(createUser).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Budi Santoso',
        username: 'guru_1234',
        password: 'hashed-guru123',
      }));
      expect(assignRole).toHaveBeenCalledWith(userId, roleId);
      expect(createTeacher).toHaveBeenCalledWith({ user_id: userId, employee_id: validBody.nip, phone: null });
      expect(syncTeacherSubjects).toHaveBeenCalledWith(teacherId, [subjectId], yearId);
      expect(res._body.data).toMatchObject({ username: 'guru_1234' });
    });

    it('suffixes the username when the base is taken', () => {
      vi.mocked(usernameExists).mockImplementation((username: string) => username === 'guru_1234');
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: validBody }), res);

      expect(res._status).toBe(201);
      expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'guru_1234_2' }));
    });

    it('returns 409 on a unique-constraint race', () => {
      vi.mocked(createUser).mockImplementation(() => { throw uniqueError(); });
      const res = mockResponse();
      addTeacher(mockRequest({ user: mockUser(), body: validBody }), res);
      expect(res._status).toBe(409);
      expect(res._body).toMatchObject({ code: 'DUPLICATE_TEACHER' });
    });
  });

  describe('editTeacher', () => {
    it('returns 404 for an unknown teacher', () => {
      vi.mocked(findTeacherById).mockReturnValue(undefined);
      const res = mockResponse();
      editTeacher(mockRequest({ user: mockUser(), params: { id: teacherId }, body: { name: 'Baru' } }), res);
      expect(res._status).toBe(404);
      expect(updateTeacher).not.toHaveBeenCalled();
    });

    it('returns 409 when the NIP belongs to another teacher', () => {
      vi.mocked(findTeacherByEmployeeId).mockReturnValue({ id: 'other-teacher' } as never);
      const res = mockResponse();
      editTeacher(mockRequest({ user: mockUser(), params: { id: teacherId }, body: { nip: '99999999' } }), res);
      expect(res._status).toBe(409);
      expect(updateTeacher).not.toHaveBeenCalled();
    });

    it('updates NIP, name, and subjects on the happy path', () => {
      const res = mockResponse();
      editTeacher(mockRequest({
        user: mockUser(),
        params: { id: teacherId },
        body: { nip: '198501012010015678', name: 'Budi Baru', subject_ids: [subjectId] },
      }), res);

      expect(res._status).toBe(200);
      expect(updateTeacher).toHaveBeenCalledWith(teacherId, { employee_id: '198501012010015678' });
      expect(updateUser).toHaveBeenCalledWith(userId, { name: 'Budi Baru' });
      expect(syncTeacherSubjects).toHaveBeenCalledWith(teacherId, [subjectId], yearId);
    });
  });
});
