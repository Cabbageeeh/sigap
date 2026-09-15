import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError, jsonPaginated, queryInt, queryString } from '@core';
import Logger from '@services/Logger';
import { getParentsPaginated, findParentById, findParentByUserId, createParent, updateParent, deleteParent } from '@queries/parents';
import { findStudentsByParent, findStudentsForParentSelect, syncStudentsForParent } from '@queries/students';
import { findUsersForParentSelect, isAdmin, hasPermission, hasRole } from '@queries/users';
import { ParentSchema, UpdateParentSchema, zodToErrors } from '@validators';

const canView = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'parents.view'));
const canManage = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'parents.create'));
const canEdit = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'parents.edit'));
const canDelete = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'parents.delete'));

export const parentsPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const canViewFlag = userId ? canView(userId) : false;
  const permissions = {
    canView: canViewFlag,
    canCreate: userId ? canManage(userId) : false,
    canEdit: userId ? canEdit(userId) : false,
    canDelete: userId ? canDelete(userId) : false,
  };
  if (!canViewFlag) {
    return res.inertia('parents', {
      permissions,
      parents: [],
      users: [],
      meta: undefined,
    });
  }

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const search = queryString(req, 'search');
  const { data, total } = getParentsPaginated(page, limit, search);
  const totalPages = Math.ceil(total / limit);
  const users = permissions.canCreate ? findUsersForParentSelect() : [];
  const students = permissions.canCreate || permissions.canEdit ? findStudentsForParentSelect() : [];

  return res.inertia('parents', {
    permissions,
    parents: data,
    users,
    students,
    meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
};

export const listParents = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const search = queryString(req, 'search');

  const { data, total } = getParentsPaginated(page, limit, search);
  const totalPages = Math.ceil(total / limit);
  return jsonPaginated(res, 'OK', data, { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 });
};

export const parentData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const item = findParentById(req.params.id || '');
  if (!item) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'OK', { ...item, children: findStudentsByParent(item.user_id) });
};

export const parentByUser = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);
  const item = findParentByUserId(req.params.userId || '');
  if (!item) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'OK', { ...item, children: findStudentsByParent(item.user_id) });
};

export const addParent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canManage(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const parsed = ParentSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));
  if (findParentByUserId(parsed.data.user_id)) {
    return jsonError(res, 'Profil orang tua sudah terdaftar', 409, 'PARENT_EXISTS');
  }

  try {
    const item = createParent({
      user_id: parsed.data.user_id,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
    });
    if (parsed.data.student_ids?.length) syncStudentsForParent(item.user_id, parsed.data.student_ids);
    return jsonCreated(res, 'Parent created', item);
  } catch (error: unknown) {
    Logger.error('Failed to create parent', error as Error);
    return jsonServerError(res, 'Failed to create parent');
  }
};

export const editParent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canEdit(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const parsed = UpdateParentSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  try {
    const { student_ids, ...fields } = parsed.data;
    const item = updateParent(id, fields);
    if (!item) return jsonError(res, 'Not found', 404);
    if (student_ids !== undefined) syncStudentsForParent(item.user_id, student_ids);
    return jsonSuccess(res, 'Parent updated', item);
  } catch (error: unknown) {
    Logger.error('Failed to update parent', error as Error);
    return jsonServerError(res, 'Failed to update parent');
  }
};

export const removeParent = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canDelete(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const ok = deleteParent(id);
  if (!ok) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'Parent deleted');
};
