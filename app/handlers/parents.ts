import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonError, jsonPaginated, queryInt, queryString } from '@core';
import { getParentsPaginated, findParentById, findParentByUserId } from '@queries/parents';
import { findStudentsByParent } from '@queries/students';
import { isAdmin, hasPermission, hasRole } from '@queries/users';

const canView = (userId: string): boolean => !hasRole(userId, 'parent') && (isAdmin(userId) || hasPermission(userId, 'parents.view'));

export const parentsPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const canViewFlag = userId ? canView(userId) : false;
  const permissions = { canView: canViewFlag };
  if (!canViewFlag) {
    return res.inertia('parents', {
      permissions,
      parents: [],
      meta: undefined,
    });
  }

  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 10);
  const search = queryString(req, 'search');
  const { data, total } = getParentsPaginated(page, limit, search);
  const totalPages = Math.ceil(total / limit);

  return res.inertia('parents', {
    permissions,
    parents: data,
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
