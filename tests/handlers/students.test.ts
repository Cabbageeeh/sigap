import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NaraRequest } from '../../app/core/types';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/students', () => ({
  getStudentsPaginated: vi.fn(),
  findStudentById: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  findStudentsByClass: vi.fn(),
  findAllNisOwners: vi.fn(),
  importStudents: vi.fn(),
}));
vi.mock('@queries/classes', () => ({
  findAllClasses: vi.fn(() => []),
  findClassById: vi.fn(),
  findClassByName: vi.fn(),
}));
vi.mock('@queries/parents', () => ({
  createParentAccountForStudent: vi.fn(),
  findParentAccountOptions: vi.fn(() => []),
  findParentByUserId: vi.fn(),
  linkParentAccountToStudent: vi.fn(),
  removeParentAccountFromStudent: vi.fn(),
  updateParentAccountForStudent: vi.fn(),
}));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(() => false),
  hasPermission: vi.fn(() => true),
  hasRole: vi.fn(() => true),
}));
vi.mock('@services/Authenticate', () => ({
  hashPassword: vi.fn((password: string) => `hashed-${password}`),
}));
vi.mock('@services/StudentCsvParser', () => ({ parseStudentCsv: vi.fn() }));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { addStudent, addStudentParentAccount, classStudentsPage, editStudent, importStudentsFromCsv, listStudents, removeStudent, removeStudentParentAccount, studentData } from '../../app/handlers/students';
import { createStudent, deleteStudent, findAllNisOwners, findStudentById, getStudentsPaginated, importStudents, updateStudent } from '@queries/students';
import { findAllClasses, findClassById, findClassByName } from '@queries/classes';
import { createParentAccountForStudent, findParentByUserId, linkParentAccountToStudent, removeParentAccountFromStudent } from '@queries/parents';
import { hashPassword } from '@services/Authenticate';
import { parseStudentCsv } from '@services/StudentCsvParser';
import { hasRole, isAdmin } from '@queries/users';

const STUDENT_ID = '00000000-0000-4000-8000-000000000010';
const PARENT_USER_ID = '00000000-0000-4000-8000-000000000011';
const CLASS_UUID = '00000000-0000-4000-8000-000000000012';
const student = {
  id: STUDENT_ID,
  nis: '10001',
  name: 'Ani',
  class_id: 'class-1',
  parent_user_id: null,
  phone: null,
  address: null,
  created_at: 1,
  updated_at: 1,
};

const parentRequest = (overrides: Parameters<typeof mockRequest>[0] = {}) =>
  mockRequest({ user: mockUser({ id: 'parent-1', roles: ['parent'] }), ...overrides });

describe('parent student scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('denies the generic student list to parents', () => {
    const res = mockResponse();

    listStudents(parentRequest(), res);

    expect(res._status).toBe(403);
    expect(getStudentsPaginated).not.toHaveBeenCalled();
  });

  it('denies direct access to another student record', () => {
    const res = mockResponse();

    studentData(parentRequest({ params: { id: 'student-2' } }), res);

    expect(res._status).toBe(403);
    expect(findStudentById).not.toHaveBeenCalled();
  });

  it('denies student creation to parents', () => {
    const res = mockResponse();

    addStudent(parentRequest({ body: {
      nis: '10002',
      name: 'Siswa Baru',
      class_id: 'class-1',
    } }), res);

    expect(res._status).toBe(403);
    expect(createStudent).not.toHaveBeenCalled();
  });

  it('denies student updates to parents', () => {
    const res = mockResponse();

    editStudent(parentRequest({ params: { id: 'student-2' }, body: { name: 'Nama Baru' } }), res);

    expect(res._status).toBe(403);
    expect(updateStudent).not.toHaveBeenCalled();
  });

  it('denies student deletion to parents', () => {
    const res = mockResponse();

    removeStudent(parentRequest({ params: { id: 'student-2' } }), res);

    expect(res._status).toBe(403);
    expect(deleteStudent).not.toHaveBeenCalled();
  });
  it('renders a class-scoped student page', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasRole).mockReturnValue(false);
    vi.mocked(findClassById).mockReturnValue({
      id: 'class-1',
      name: '10A',
      grade: '10',
      academic_year_id: 'year-1',
    } as never);
    vi.mocked(getStudentsPaginated).mockReturnValue({ data: [], total: 0 });
    const res = mockResponse({ inertia: vi.fn() });

    classStudentsPage(
      mockRequest({ user: mockUser({ id: 'admin-1', roles: ['admin'] }), params: { id: 'class-1' } }),
      res,
    );

    expect(findClassById).toHaveBeenCalledWith('class-1');
    expect(getStudentsPaginated).toHaveBeenCalledWith(1, 10, '', 'class-1');
    expect(res.inertia).toHaveBeenCalledWith('students', expect.objectContaining({
      classId: 'class-1',
      classScoped: true,
      classContext: expect.objectContaining({ id: 'class-1', name: '10A' }),
    }));
  });
  it('imports rows into the selected class', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasRole).mockReturnValue(false);
    vi.mocked(findClassById).mockReturnValue({
      id: CLASS_UUID,
      name: '10A',
      grade: '10',
      academic_year_id: 'year-1',
    } as never);
    vi.mocked(findAllClasses).mockReturnValue([{
      id: CLASS_UUID,
      name: '10A',
      grade: '10',
      academic_year_id: 'year-1',
    }] as never);
    vi.mocked(findAllNisOwners).mockReturnValue([]);
    vi.mocked(importStudents).mockReturnValue([{ id: 'student-1', nis: '10011' }]);
    vi.mocked(parseStudentCsv).mockReturnValue({
      rows: [{ line: 2, nis: '10011', name: 'Andi', class_name: '10A', phone: null, address: null, parent_name: null, parent_phone: null, parent_address: null }],
      errors: [],
    });
    const req = mockRequest({
      user: mockUser({ id: 'admin-1', roles: ['admin'] }),
      body: { class_id: CLASS_UUID },
    }) as NaraRequest & { file: { buffer: Buffer } };
    req.file = { buffer: Buffer.from('10011,Andi,,') };

    importStudentsFromCsv(req, mockResponse());

    expect(parseStudentCsv).toHaveBeenCalledWith(expect.any(String), expect.any(Set), expect.any(Map), '10A');
    expect(importStudents).toHaveBeenCalledWith([{
      nis: '10011',
      name: 'Andi',
      class_id: CLASS_UUID,
      phone: null,
      address: null,
    }]);
    expect(findClassByName).not.toHaveBeenCalled();
    expect(createParentAccountForStudent).not.toHaveBeenCalled();
  });

  it('creates parent accounts with the shared initial password from the form', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasRole).mockReturnValue(false);
    vi.mocked(findAllClasses).mockReturnValue([{ id: 'class-1', name: '10A' }] as never);
    vi.mocked(findClassByName).mockReturnValue({ id: 'class-1', name: '10A' } as never);
    vi.mocked(findAllNisOwners).mockReturnValue([]);
    vi.mocked(importStudents).mockReturnValue([{ id: 'student-1', nis: '10011' }]);
    vi.mocked(parseStudentCsv).mockReturnValue({
      rows: [{
        line: 2,
        nis: '10011',
        name: 'Andi',
        class_name: '10A',
        phone: null,
        address: null,
        parent_name: 'Siti Saputra',
        parent_phone: '08123456781',
        parent_address: null,
      }],
      errors: [],
    });
    const req = mockRequest({
      user: mockUser({ id: 'admin-1', roles: ['admin'] }),
      body: { parent_password: 'rahasia123' },
    }) as NaraRequest & { file: { buffer: Buffer } };
    req.file = { buffer: Buffer.from('NIS,Nama Siswa,Kelas,Nama Orang Tua,Telepon Orang Tua\n10011,Andi,10A,Siti Saputra,08123456781') };

    const res = mockResponse();
    importStudentsFromCsv(req, res);

    expect(createParentAccountForStudent).toHaveBeenCalledWith({
      student_id: 'student-1',
      username: '10011',
      name: 'Siti Saputra',
      password_hash: 'hashed-rahasia123',
      phone: '08123456781',
      address: null,
    });
    expect((res._body as { data: { inserted: number; parents_created: number } }).data).toMatchObject({
      inserted: 1,
      parents_created: 1,
    });
  });

  it('rejects the import when parent rows arrive without an initial password', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasRole).mockReturnValue(false);
    vi.mocked(findAllClasses).mockReturnValue([{ id: 'class-1', name: '10A' }] as never);
    vi.mocked(findAllNisOwners).mockReturnValue([]);
    vi.mocked(parseStudentCsv).mockReturnValue({
      rows: [{
        line: 2,
        nis: '10011',
        name: 'Andi',
        class_name: '10A',
        phone: null,
        address: null,
        parent_name: 'Siti Saputra',
        parent_phone: null,
        parent_address: null,
      }],
      errors: [],
    });
    const req = mockRequest({
      user: mockUser({ id: 'admin-1', roles: ['admin'] }),
      body: {},
    }) as NaraRequest & { file: { buffer: Buffer } };
    req.file = { buffer: Buffer.from('NIS,Nama Siswa,Kelas,Nama Orang Tua\n10011,Andi,10A,Siti Saputra') };

    const res = mockResponse();
    importStudentsFromCsv(req, res);

    expect(res._status).toBe(422);
    expect((res._body as { errors: Record<string, string[]> }).errors).toHaveProperty('parent_password');
    expect(importStudents).not.toHaveBeenCalled();
    expect(createParentAccountForStudent).not.toHaveBeenCalled();
  });
});

describe('student parent account management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasRole).mockReturnValue(false);
  });

  it('creates a parent account from student detail using the student NIS as username', () => {
    vi.mocked(findStudentById).mockReturnValue(student as never);
    vi.mocked(createParentAccountForStudent).mockReturnValue({
      id: 'parent-profile-1',
      user_id: PARENT_USER_ID,
      name: 'Ibu Ani',
      username: '10001',
      phone: '08123456789',
      address: 'Jl. Melati',
      student_count: 1,
    });
    const req = mockRequest({
      user: mockUser({ id: 'admin-1', roles: ['admin'] }),
      params: { id: STUDENT_ID },
      body: {
        mode: 'new',
        name: 'Ibu Ani',
        password: 'parent123',
        phone: '08123456789',
        address: 'Jl. Melati',
      },
    });
    const res = mockResponse();

    addStudentParentAccount(req, res);

    expect(res._status).toBe(201);
    expect(hashPassword).toHaveBeenCalledWith('parent123');
    expect(createParentAccountForStudent).toHaveBeenCalledWith({
      student_id: STUDENT_ID,
      username: '10001',
      name: 'Ibu Ani',
      password_hash: 'hashed-parent123',
      phone: '08123456789',
      address: 'Jl. Melati',
    });
  });

  it('links an existing parent account to another student', () => {
    vi.mocked(findStudentById).mockReturnValue(student as never);
    vi.mocked(findParentByUserId).mockReturnValue({ id: 'parent-profile-1', user_id: PARENT_USER_ID } as never);
    vi.mocked(linkParentAccountToStudent).mockReturnValue({
      id: 'parent-profile-1',
      user_id: PARENT_USER_ID,
      name: 'Ibu Ani',
      username: '10001',
      phone: null,
      address: null,
      student_count: 2,
    });
    const req = mockRequest({
      user: mockUser({ id: 'admin-1', roles: ['admin'] }),
      params: { id: STUDENT_ID },
      body: { mode: 'existing', parent_user_id: PARENT_USER_ID },
    });
    const res = mockResponse();

    addStudentParentAccount(req, res);

    expect(res._status).toBe(201);
    expect(linkParentAccountToStudent).toHaveBeenCalledWith(STUDENT_ID, PARENT_USER_ID);
  });

  it('rejects adding another parent when the student is already linked', () => {
    vi.mocked(findStudentById).mockReturnValue({ ...student, parent_user_id: PARENT_USER_ID } as never);
    const req = mockRequest({
      user: mockUser({ id: 'admin-1', roles: ['admin'] }),
      params: { id: STUDENT_ID },
      body: { mode: 'new', name: 'Ibu Ani', password: 'parent123' },
    });
    const res = mockResponse();

    addStudentParentAccount(req, res);

    expect(res._status).toBe(409);
    expect(res._body).toMatchObject({ code: 'STUDENT_PARENT_EXISTS' });
    expect(createParentAccountForStudent).not.toHaveBeenCalled();
  });

  it('removes the parent relationship through student detail', () => {
    vi.mocked(findStudentById).mockReturnValue({ ...student, parent_user_id: PARENT_USER_ID } as never);
    vi.mocked(removeParentAccountFromStudent).mockReturnValue({ deletedAccount: false });
    const req = mockRequest({
      user: mockUser({ id: 'admin-1', roles: ['admin'] }),
      params: { id: STUDENT_ID },
    });
    const res = mockResponse();

    removeStudentParentAccount(req, res);

    expect(res._status).toBe(200);
    expect(removeParentAccountFromStudent).toHaveBeenCalledWith(STUDENT_ID);
  });
});
