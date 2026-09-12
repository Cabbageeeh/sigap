import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonError, jsonServerError, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import { findActiveSchoolLocation, createSchoolLocation, updateSchoolLocation } from '@queries/schoolLocations';
import { isAdmin, hasPermission } from '@queries/users';
import { SchoolProfileSchema, zodToErrors } from '@validators';

const canView = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'school_locations.view');
const canEdit = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'school_locations.edit');

export const schoolLocationsPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const canViewFlag = userId ? canView(userId) : false;
  return res.inertia('schoolLocations', {
    permissions: {
      canView: canViewFlag,
      canEdit: userId ? canEdit(userId) : false,
    },
    profile: canViewFlag ? findActiveSchoolLocation() ?? null : null,
  });
};

export const saveSchoolProfile = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canEdit(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const parsed = SchoolProfileSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Data profil sekolah tidak valid', zodToErrors(parsed.error));

  const data = {
    name: parsed.data.name,
    npsn: parsed.data.npsn ?? null,
    headmaster_name: parsed.data.headmaster_name ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email ?? null,
    address: parsed.data.address ?? null,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    radius_meters: parsed.data.radius_meters ?? null,
  };

  try {
    const existing = findActiveSchoolLocation();
    const saved = existing
      ? updateSchoolLocation(existing.id, data)
      : createSchoolLocation({ ...data, is_active: 1 });
    return jsonSuccess(res, 'Profil sekolah berhasil disimpan', saved);
  } catch (error: unknown) {
    Logger.error('Failed to save school profile', error as Error);
    return jsonServerError(res, 'Gagal menyimpan profil sekolah');
  }
};
