import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError, queryInt, queryString } from '@core';
import Logger from '@services/Logger';
import { findAllClasses, findClassById, createClass, updateClass, deleteClass, findClassesByAcademicYear, findClassesByGrade, findAllClassesWithHomeroom, findClassesByAcademicYearWithHomeroom } from '@queries/classes';
import { findAllAcademicYears } from '@queries/academicYears';
import { isAdmin, hasPermission } from '@queries/users';
import { ClassSchema, UpdateClassSchema, zodToErrors } from '@validators';

const canView = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'classes.view');
const canManage = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'classes.create');

export const classesPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const canViewFlag = userId ? canView(userId) : false;
  const academicYearId = queryString(req, 'academic_year_id');
  const permissions = {
    canView: canViewFlag,
    canCreate: userId ? canManage(userId) : false,
    canEdit: userId ? isAdmin(userId) || hasPermission(userId, 'classes.edit') : false,
    canDelete: userId ? isAdmin(userId) || hasPermission(userId, 'classes.delete') : false,
    canViewStudents: userId ? isAdmin(userId) || hasPermission(userId, 'students.view') : false,
  };
  const years = canViewFlag ? findAllAcademicYears() : [];
  const classes = canViewFlag
    ? (academicYearId ? findClassesByAcademicYearWithHomeroom(academicYearId) : findAllClassesWithHomeroom()).map(item => ({
      ...item,
      academic_year_name: years.find(year => year.id === item.academic_year_id)?.name ?? item.academic_year_id,
    }))
    : [];
  return res.inertia('classes', { permissions, classes, years });
};

export const listClasses = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const academicYearId = queryString(req, 'academic_year_id');
  const grade = queryString(req, 'grade');

  const data = academicYearId
    ? findClassesByAcademicYear(academicYearId)
    : grade
      ? findClassesByGrade(grade)
      : findAllClasses();

  return jsonSuccess(res, 'OK', data);
};

export const classData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const item = findClassById(req.params.id || '');
  if (!item) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'OK', item);
};

export const addClass = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const parsed = ClassSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  try {
    const item = createClass(parsed.data);
    return jsonCreated(res, 'Class created', item);
  } catch (error: unknown) {
    Logger.error('Failed to create class', error as Error);
    return jsonServerError(res, 'Failed to create class');
  }
};

export const editClass = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id) && !hasPermission(req.user.id, 'classes.edit')) {
    return jsonError(res, 'Forbidden', 403);
  }

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const parsed = UpdateClassSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  try {
    const item = updateClass(id, parsed.data);
    if (!item) return jsonError(res, 'Not found', 404);
    return jsonSuccess(res, 'Class updated', item);
  } catch (error: unknown) {
    Logger.error('Failed to update class', error as Error);
    return jsonServerError(res, 'Failed to update class');
  }
};

export const removeClass = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id) && !hasPermission(req.user.id, 'classes.delete')) {
    return jsonError(res, 'Forbidden', 403);
  }

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  try {
    const ok = deleteClass(id);
    if (!ok) return jsonError(res, 'Not found', 404);
    return jsonSuccess(res, 'Class deleted');
  } catch (error: unknown) {
    Logger.error('Failed to delete class', error as Error);
    return jsonServerError(res, 'Gagal menghapus kelas');
  }
};
