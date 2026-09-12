import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError, jsonPaginated, queryInt, queryString, isUniqueConstraintError } from '@core';
import Logger from '@services/Logger';
import { hashPassword } from '@services/Authenticate';
import { getTeachersPaginated, findTeacherById, findTeacherByUserId, findTeacherByEmployeeId, createTeacher, updateTeacher, deleteTeacher, getTeacherSubjects, syncTeacherSubjects } from '@queries/teachers';
import { findAllSubjects } from '@queries/subjects';
import { findActiveAcademicYear } from '@queries/academicYears';
import { findRoleBySlug } from '@queries/roles';
import { isAdmin, hasPermission, createUser, updateUser, usernameExists, assignRole } from '@queries/users';
import { TeacherSchema, UpdateTeacherSchema, zodToErrors } from '@validators';
import { randomUUID } from 'crypto';

const canView = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'teachers.view');
const canManage = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'teachers.create');
const TEACHER_DEFAULT_PASSWORD = 'guru123';
const TEACHER_USERNAME_PREFIX = 'guru';

const buildTeacherUsername = (nip: string): string | null => {
  const suffix = nip.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toLowerCase() || 'guru';
  const base = `${TEACHER_USERNAME_PREFIX}_${suffix}`;
  if (!usernameExists(base)) return base;
  for (let counter = 2; counter <= 100; counter++) {
    const candidate = `${base}_${counter}`;
    if (!usernameExists(candidate)) return candidate;
  }
  return null;
};

const resolveSubjectIds = (subjectIds: string[]): string | null => {
  const activeYear = findActiveAcademicYear();
  if (!activeYear) return null;
  const validIds = new Set(findAllSubjects().map(subject => subject.id));
  if (!subjectIds.every(id => validIds.has(id))) return null;
  return activeYear.id;
};

export const teachersPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const canViewFlag = userId ? canView(userId) : false;
  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const search = queryString(req, 'search');
  const result = canViewFlag ? getTeachersPaginated(page, limit, search) : { data: [], total: 0 };
  const totalPages = Math.ceil(result.total / limit);
  const permissions = {
    canView: canViewFlag,
    canCreate: userId ? canManage(userId) : false,
    canEdit: userId ? isAdmin(userId) || hasPermission(userId, 'teachers.edit') : false,
    canDelete: userId ? isAdmin(userId) || hasPermission(userId, 'teachers.delete') : false,
  };
  return res.inertia('teachers', {
    permissions,
    teachers: result.data,
    subjects: canViewFlag ? findAllSubjects() : [],
    search,
    meta: { total: result.total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
};

export const listTeachers = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const search = queryString(req, 'search');

  const { data, total } = getTeachersPaginated(page, limit, search);
  const totalPages = Math.ceil(total / limit);
  return jsonPaginated(res, 'OK', data, { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 });
};

export const teacherData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const item = findTeacherById(req.params.id || '');
  if (!item) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'OK', { ...item, subjects: getTeacherSubjects(item.id) });
};

export const teacherByUser = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  const item = findTeacherByUserId(req.params.userId || '');
  if (!item) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'OK', { ...item, subjects: getTeacherSubjects(item.id) });
};

export const addTeacher = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const parsed = TeacherSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Data guru tidak valid', zodToErrors(parsed.error));

  const { nip, name, subject_ids: subjectIds } = parsed.data;

  if (findTeacherByEmployeeId(nip)) {
    return jsonError(res, 'NIP sudah terdaftar', 409, 'DUPLICATE_NIP');
  }

  const teacherRole = findRoleBySlug('teacher');
  if (!teacherRole) {
    return jsonServerError(res, 'Role guru belum dikonfigurasi');
  }

  let activeYearId: string | undefined;
  if (subjectIds.length > 0) {
    const resolved = resolveSubjectIds(subjectIds);
    if (!resolved) {
      return jsonError(res, 'Mata pelajaran tidak valid atau tidak ada tahun ajaran aktif', 400, 'INVALID_SUBJECTS');
    }
    activeYearId = resolved;
  }

  const username = buildTeacherUsername(nip);
  if (!username) {
    return jsonError(res, 'Tidak dapat membuat username unik untuk NIP ini', 409, 'USERNAME_EXHAUSTED');
  }

  try {
    const user = createUser({
      id: randomUUID(),
      name,
      username,
      password: hashPassword(TEACHER_DEFAULT_PASSWORD),
    });
    assignRole(user.id, teacherRole.id);
    const teacher = createTeacher({ user_id: user.id, employee_id: nip, phone: null });
    if (activeYearId) {
      syncTeacherSubjects(teacher.id, subjectIds, activeYearId);
    }
    return jsonCreated(res, `Guru berhasil ditambahkan. Akun login: ${username} / ${TEACHER_DEFAULT_PASSWORD}`, { teacher, username });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return jsonError(res, 'NIP atau username sudah digunakan', 409, 'DUPLICATE_TEACHER');
    }
    Logger.error('Failed to create teacher', error as Error);
    return jsonServerError(res, 'Gagal menambahkan guru');
  }
};

export const editTeacher = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id) && !hasPermission(req.user.id, 'teachers.edit')) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID wajib diisi', 400);

  const parsed = UpdateTeacherSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Data guru tidak valid', zodToErrors(parsed.error));

  const existing = findTeacherById(id);
  if (!existing) return jsonError(res, 'Guru tidak ditemukan', 404);

  const { nip, name, subject_ids: subjectIds } = parsed.data;

  if (nip !== undefined) {
    const holder = findTeacherByEmployeeId(nip);
    if (holder && holder.id !== id) {
      return jsonError(res, 'NIP sudah digunakan guru lain', 409, 'DUPLICATE_NIP');
    }
  }

  let activeYearId: string | undefined;
  if (subjectIds !== undefined) {
    if (subjectIds.length === 0) {
      const activeYear = findActiveAcademicYear();
      if (!activeYear) {
        return jsonError(res, 'Tidak ada tahun ajaran aktif untuk menyimpan kompetensi mapel', 400, 'NO_ACTIVE_YEAR');
      }
      activeYearId = activeYear.id;
    } else {
      const resolved = resolveSubjectIds(subjectIds);
      if (!resolved) {
        return jsonError(res, 'Mata pelajaran tidak valid atau tidak ada tahun ajaran aktif', 400, 'INVALID_SUBJECTS');
      }
      activeYearId = resolved;
    }
  }

  try {
    if (nip !== undefined) updateTeacher(id, { employee_id: nip });
    if (name !== undefined) updateUser(existing.user_id, { name });
    if (subjectIds !== undefined && activeYearId) {
      syncTeacherSubjects(id, subjectIds, activeYearId);
    }
    const item = findTeacherById(id);
    return jsonSuccess(res, 'Guru berhasil diperbarui', item);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return jsonError(res, 'NIP sudah digunakan', 409, 'DUPLICATE_NIP');
    }
    Logger.error('Failed to update teacher', error as Error);
    return jsonServerError(res, 'Gagal memperbarui guru');
  }
};

export const removeTeacher = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id) && !hasPermission(req.user.id, 'teachers.delete')) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const ok = deleteTeacher(id);
  if (!ok) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'Teacher deleted');
};

export const assignTeacherSubjects = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id) && !hasPermission(req.user.id, 'teachers.edit')) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  const { subject_ids: subjectIds, academic_year_id: academicYearId } = req.body || {};
  if (!id || !Array.isArray(subjectIds) || !academicYearId) {
    return jsonError(res, 'Teacher ID, subject IDs, and academic year ID are required', 400);
  }

  try {
    syncTeacherSubjects(id, subjectIds as string[], academicYearId as string);
    return jsonSuccess(res, 'Subjects assigned');
  } catch (error: unknown) {
    Logger.error('Failed to assign subjects', error as Error);
    return jsonServerError(res, 'Failed to assign subjects');
  }
};
