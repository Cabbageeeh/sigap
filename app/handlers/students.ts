import type { NaraRequest, NaraResponse, NaraMiddleware } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError, jsonPaginated, queryInt, queryString, isUniqueConstraintError } from '@core';
import Logger from '@services/Logger';
import { hashPassword } from '@services/Authenticate';
import multer from 'multer';
import { getStudentsPaginated, findStudentById, createStudent, updateStudent, deleteStudent, findStudentsByClass, findAllNisOwners, importStudents } from '@queries/students';
import { findAllClasses, findClassById, findClassByName } from '@queries/classes';
import {
  createParentAccountForStudent,
  findParentAccountOptions,
  findParentByUserId,
  linkParentAccountToStudent,
  removeParentAccountFromStudent,
  updateParentAccountForStudent,
} from '@queries/parents';
import { parseStudentCsv } from '@services/StudentCsvParser';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import { StudentImportSchema, StudentParentAccountSchema, StudentSchema, UpdateStudentParentAccountSchema, UpdateStudentSchema, zodToErrors } from '@validators';

const canView = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'students.view'));
const canManage = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'students.create'));
const canEditStudent = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'students.edit'));
const canManageParent = (userId: string, action: 'create' | 'edit' | 'delete'): boolean =>
  canView(userId) && (isAdmin(userId) || hasPermission(userId, `parents.${action}`));

const renderStudentsPage = (req: NaraRequest, res: NaraResponse, classId?: string) => {
  const userId = req.user?.id;
  const permissions = {
    canView: userId ? canView(userId) : false,
    canCreate: userId ? canManage(userId) : false,
    canEdit: userId ? canEditStudent(userId) : false,
    canDelete: userId ? !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'students.delete')) : false,
  };
  const parentPermissions = {
    canCreate: userId ? canManageParent(userId, 'create') : false,
    canEdit: userId ? canManageParent(userId, 'edit') : false,
    canDelete: userId ? canManageParent(userId, 'delete') : false,
  };

  if (!permissions.canView) {
    return res.inertia('students', {
      permissions, parentPermissions, students: [], classes: [], parentAccounts: [], meta: undefined,
      search: '', classId: null, classContext: null, classScoped: false,
    });
  }

  const classContext = classId ? findClassById(classId) : undefined;
  if (classId && !classContext) return res.redirect('/classes');

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const search = queryString(req, 'search');
  const { data, total } = getStudentsPaginated(page, limit, search, classContext?.id);
  const totalPages = Math.ceil(total / limit);

  return res.inertia('students', {
    permissions,
    parentPermissions,
    students: data,
    classes: classContext ? [classContext] : findAllClasses(),
    parentAccounts: parentPermissions.canCreate ? findParentAccountOptions() : [],
    search,
    classId: classContext?.id ?? null,
    classContext: classContext ?? null,
    classScoped: Boolean(classContext),
    meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
};

export const studentsPage = (req: NaraRequest, res: NaraResponse) =>
  renderStudentsPage(req, res, queryString(req, 'class_id') || undefined);

export const classStudentsPage = (req: NaraRequest, res: NaraResponse) =>
  renderStudentsPage(req, res, req.params.id);

export const listStudents = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const search = queryString(req, 'search');
  const classId = queryString(req, 'class_id');

  const { data, total } = getStudentsPaginated(page, limit, search, classId || undefined);
  const totalPages = Math.ceil(total / limit);
  return jsonPaginated(res, 'OK', data, { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 });
};

export const studentsByClass = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const classId = req.params.id;
  if (!classId) return jsonError(res, 'Class ID required', 400);

  return jsonSuccess(res, 'OK', findStudentsByClass(classId));
};

export const studentData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const item = findStudentById(req.params.id || '');
  if (!item) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'OK', item);
};

export const addStudent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const parsed = StudentSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  try {
    const item = createStudent({
      nis: parsed.data.nis,
      name: parsed.data.name,
      class_id: parsed.data.class_id,
      parent_user_id: null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
    });
    return jsonCreated(res, 'Student created', item);
  } catch (error: unknown) {
    Logger.error('Failed to create student', error as Error);
    return jsonServerError(res, 'Failed to create student');
  }
};

export const editStudent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canEditStudent(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const parsed = UpdateStudentSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  try {
    const item = updateStudent(id, parsed.data);
    if (!item) return jsonError(res, 'Not found', 404);
    return jsonSuccess(res, 'Student updated', item);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return jsonError(res, 'NIS siswa sudah digunakan oleh siswa atau akun lain', 409, 'STUDENT_NIS_CONFLICT');
    }
    Logger.error('Failed to update student', error as Error);
    return jsonServerError(res, 'Failed to update student');
  }
};

export const addStudentParentAccount = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManageParent(req.user.id, 'create')) return jsonError(res, 'Forbidden', 403);

  const studentId = req.params.id;
  if (!studentId) return jsonError(res, 'ID siswa wajib diisi', 400);
  const student = findStudentById(studentId);
  if (!student) return jsonError(res, 'Siswa tidak ditemukan', 404, 'STUDENT_NOT_FOUND');
  if (student.parent_user_id) return jsonError(res, 'Siswa sudah memiliki akun orang tua', 409, 'STUDENT_PARENT_EXISTS');

  const parsed = StudentParentAccountSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Data orang tua tidak valid', zodToErrors(parsed.error));

  try {
    if (parsed.data.mode === 'existing') {
      const parent = findParentByUserId(parsed.data.parent_user_id);
      if (!parent) return jsonError(res, 'Akun orang tua tidak ditemukan', 404, 'PARENT_NOT_FOUND');
      const account = linkParentAccountToStudent(student.id, parent.user_id);
      return jsonCreated(res, 'Akun orang tua berhasil dihubungkan', account);
    }

    const account = createParentAccountForStudent({
      student_id: student.id,
      username: student.nis,
      name: parsed.data.name,
      password_hash: hashPassword(parsed.data.password),
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    });
    return jsonCreated(res, 'Akun orang tua berhasil dibuat', account);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return jsonError(res, 'NIS siswa sudah digunakan sebagai username akun lain', 409, 'PARENT_USERNAME_EXISTS');
    }
    Logger.error('Failed to create student parent account', error as Error);
    return jsonServerError(res, 'Gagal membuat akun orang tua');
  }
};

export const editStudentParentAccount = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManageParent(req.user.id, 'edit')) return jsonError(res, 'Forbidden', 403);

  const studentId = req.params.id;
  if (!studentId) return jsonError(res, 'ID siswa wajib diisi', 400);
  const student = findStudentById(studentId);
  if (!student) return jsonError(res, 'Siswa tidak ditemukan', 404, 'STUDENT_NOT_FOUND');
  if (!student.parent_user_id) return jsonError(res, 'Siswa belum memiliki akun orang tua', 404, 'PARENT_NOT_FOUND');

  const parsed = UpdateStudentParentAccountSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Data orang tua tidak valid', zodToErrors(parsed.error));

  try {
    const account = updateParentAccountForStudent(student.id, {
      name: parsed.data.name,
      password_hash: parsed.data.password ? hashPassword(parsed.data.password) : undefined,
      phone: parsed.data.phone === '' ? null : parsed.data.phone,
      address: parsed.data.address === '' ? null : parsed.data.address,
    });
    if (!account) return jsonError(res, 'Akun orang tua tidak ditemukan', 404, 'PARENT_NOT_FOUND');
    return jsonSuccess(res, 'Data orang tua berhasil diperbarui', account);
  } catch (error: unknown) {
    Logger.error('Failed to update student parent account', error as Error);
    return jsonServerError(res, 'Gagal memperbarui data orang tua');
  }
};

export const removeStudentParentAccount = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManageParent(req.user.id, 'delete')) return jsonError(res, 'Forbidden', 403);

  const studentId = req.params.id;
  if (!studentId) return jsonError(res, 'ID siswa wajib diisi', 400);
  if (!findStudentById(studentId)) return jsonError(res, 'Siswa tidak ditemukan', 404, 'STUDENT_NOT_FOUND');

  try {
    const result = removeParentAccountFromStudent(studentId);
    if (!result) return jsonError(res, 'Siswa belum memiliki akun orang tua', 404, 'PARENT_NOT_FOUND');
    return jsonSuccess(
      res,
      result.deletedAccount ? 'Akun orang tua berhasil dihapus' : 'Orang tua berhasil dilepas dari siswa',
      result,
    );
  } catch (error: unknown) {
    Logger.error('Failed to remove student parent account', error as Error);
    return jsonServerError(res, 'Gagal melepas akun orang tua');
  }
};

export const removeStudent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (hasRole(req.user.id, 'parent') || (!isAdmin(req.user.id) && !hasPermission(req.user.id, 'students.delete'))) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const ok = deleteStudent(id);
  if (!ok) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'Student deleted');
};

const studentCsvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.mimetype) && !file.originalname.endsWith('.csv')) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

export const importStudentsMiddleware = studentCsvUpload.single('file') as unknown as NaraMiddleware;

export const importStudentsFromCsv = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const file = (req as NaraRequest & { file?: { buffer: Buffer } }).file;
  if (!file) return jsonError(res, 'CSV file is required', 400, 'FILE_REQUIRED');

  const form = StudentImportSchema.safeParse(req.body);
  if (!form.success) return jsonValidationError(res, 'Data import tidak valid', zodToErrors(form.error));

  try {
    const csv = file.buffer.toString('utf-8');
    const requestedClassId = form.data.class_id || undefined;
    const parentPassword = form.data.parent_password || '';
    const targetClass = requestedClassId ? findClassById(requestedClassId) : undefined;
    if (requestedClassId && !targetClass) return jsonError(res, 'Kelas tidak ditemukan', 404, 'CLASS_NOT_FOUND');

    const classNames = new Set(findAllClasses().map(c => c.name));
    const existingNis = new Map(findAllNisOwners().map(row => [row.nis, `${row.name} — kelas ${row.class_name ?? 'belum ada kelas'}`]));
    const parsed = parseStudentCsv(csv, classNames, existingNis, targetClass?.name);
    const parentRows = parsed.rows.filter(row => row.parent_name !== null);

    if (parentRows.length > 0 && !parentPassword) {
      return jsonValidationError(res, 'Data import tidak valid', {
        parent_password: ['Isi kata sandi awal minimal 8 karakter karena file memuat data orang tua'],
      });
    }

    const created = parsed.rows.length > 0
      ? importStudents(parsed.rows.map(row => ({
        nis: row.nis,
        name: row.name,
        class_id: targetClass?.id ?? findClassByName(row.class_name)!.id,
        phone: row.phone,
        address: row.address,
      })))
      : [];

    let parentsCreated = 0;
    if (parentRows.length > 0) {
      const studentIdByNis = new Map(created.map(student => [student.nis, student.id]));
      // One initial password shared by every account in this import, so bcrypt runs once instead of per row.
      const passwordHash = hashPassword(parentPassword);

      for (const row of parsed.rows) {
        const parentName = row.parent_name;
        const studentId = studentIdByNis.get(row.nis);
        if (!parentName || !studentId) continue;

        try {
          createParentAccountForStudent({
            student_id: studentId,
            username: row.nis,
            name: parentName,
            password_hash: passwordHash,
            phone: row.parent_phone,
            address: row.parent_address,
          });
          parentsCreated++;
        } catch (error: unknown) {
          Logger.warn('Failed to create parent account during student import', { nis: row.nis });
          parsed.errors.push({
            line: row.line,
            message: isUniqueConstraintError(error)
              ? `Akun orang tua dilewati: username ${row.nis} sudah dipakai akun lain`
              : `Akun orang tua gagal dibuat untuk NIS ${row.nis}`,
          });
        }
      }
      parsed.errors.sort((a, b) => a.line - b.line);
    }

    return jsonSuccess(res, 'Import finished', {
      inserted: created.length,
      parents_created: parentsCreated,
      errors: parsed.errors,
    });
  } catch (error: unknown) {
    Logger.error('Failed to import students', error as Error);
    return jsonServerError(res, 'Failed to import students');
  }
};
