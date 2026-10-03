import type { NaraRequest, NaraResponse } from '@core';
import { jsonError, jsonSuccess, jsonValidationError } from '@core';
import { saveEraporTeacherMappingAccess as persistTeacherMappingAccess } from '@queries/eraporGrades';
import { isAdmin } from '@queries/users';
import { EraporTeacherMappingAccessSchema, zodToErrors } from '@validators';
import Logger from '@services/Logger';

export const saveEraporTeacherMappingAccess = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Sesi login diperlukan', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat mengatur akses pemetaan guru', 403, 'ADMIN_REQUIRED');
  const parsed = EraporTeacherMappingAccessSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Pengaturan akses pemetaan tidak valid', zodToErrors(parsed.error));

  try {
    persistTeacherMappingAccess(parsed.data.enabled, req.user.id, req.user.name ?? req.user.username);
    return jsonSuccess(res, parsed.data.enabled ? 'Guru diizinkan mengatur pemetaan e-Rapor' : 'Akses pemetaan e-Rapor untuk guru dinonaktifkan', { enabled: parsed.data.enabled });
  } catch (error: unknown) {
    Logger.error('Failed to save teacher e-Rapor mapping access', error as Error);
    return jsonError(res, 'Pengaturan akses pemetaan gagal disimpan', 500, 'ERAPOR_MAPPING_ACCESS_SAVE_FAILED');
  }
};
