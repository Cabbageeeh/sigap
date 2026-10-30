import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError } from '@core';
import Logger from '@services/Logger';
import { findAllAnnouncements, findLatestAnnouncements, findClassTaskAnnouncementsByTeacher, findAnnouncementById, createAnnouncement, createClassTaskAnnouncement, updateAnnouncement, deleteAnnouncement } from '@queries/announcements';
import { isAdmin } from '@queries/users';
import { findActiveClassesByTeacherUser } from '@queries/classes';
import { isTeacherAssignedToClass, isTeacherUser } from '@queries/teacherClassAssignments';
import { AnnouncementSchema, ClassTaskAnnouncementSchema, UpdateAnnouncementSchema, zodToErrors } from '@validators';

export const announcementsPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');

  const canManage = isAdmin(req.user.id);
  const canCreateClassTasks = !canManage && isTeacherUser(req.user.id);
  if (!canManage && !canCreateClassTasks) return res.redirect('/dashboard');
  return res.inertia('announcements', {
    canManage,
    canCreateClassTasks,
    classes: canCreateClassTasks ? findActiveClassesByTeacherUser(req.user.id) : [],
    announcements: canManage ? findAllAnnouncements() : findClassTaskAnnouncementsByTeacher(req.user.id),
  });
};

export const listAnnouncements = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  return jsonSuccess(res, 'OK', isAdmin(req.user.id) ? findAllAnnouncements() : findLatestAnnouncements(100));
};

export const latestAnnouncementsData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  return jsonSuccess(res, 'OK', findLatestAnnouncements(3));
};

export const addAnnouncement = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  const administrator = isAdmin(req.user.id);
  const teacher = !administrator && isTeacherUser(req.user.id);
  if (!administrator && !teacher) return jsonError(res, 'Anda tidak memiliki akses untuk membuat pengumuman.', 403);

  if (teacher) {
    const parsedTask = ClassTaskAnnouncementSchema.safeParse(req.body);
    if (!parsedTask.success) return jsonValidationError(res, 'Periksa kembali informasi tugas.', zodToErrors(parsedTask.error));
    const activeTeacherClass = findActiveClassesByTeacherUser(req.user.id).some(item => item.id === parsedTask.data.class_id);
    if (!activeTeacherClass || !isTeacherAssignedToClass(req.user.id, parsedTask.data.class_id)) {
      return jsonError(res, 'Anda hanya dapat memberikan tugas kepada kelas yang Anda ajar.', 403);
    }
    try {
      const item = createClassTaskAnnouncement({
        ...parsedTask.data,
        due_date: parsedTask.data.due_date || null,
        author_user_id: req.user.id,
      });
      return jsonCreated(res, 'Tugas berhasil dibagikan kepada orang tua siswa di kelas tersebut.', item);
    } catch (error: unknown) {
      Logger.error('Failed to create class task announcement', error as Error);
      return jsonServerError(res, 'Tugas tidak berhasil dibagikan. Silakan coba lagi.');
    }
  }

  const parsed = AnnouncementSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Periksa kembali informasi pengumuman.', zodToErrors(parsed.error));

  try {
    const item = createAnnouncement({ ...parsed.data, author_user_id: req.user.id });
    return jsonCreated(res, 'Pengumuman berhasil diterbitkan.', item);
  } catch (error: unknown) {
    Logger.error('Failed to create announcement', error as Error);
    return jsonServerError(res, 'Failed to create announcement');
  }
};

export const editAnnouncement = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const parsed = UpdateAnnouncementSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  try {
    const item = updateAnnouncement(id, parsed.data);
    if (!item) return jsonError(res, 'Not found', 404);
    return jsonSuccess(res, 'Announcement updated', item);
  } catch (error: unknown) {
    Logger.error('Failed to update announcement', error as Error);
    return jsonServerError(res, 'Failed to update announcement');
  }
};

export const removeAnnouncement = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isAdmin(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const id = req.params.id;
  if (!id) return jsonError(res, 'ID required', 400);

  const ok = deleteAnnouncement(id);
  if (!ok) return jsonError(res, 'Not found', 404);
  return jsonSuccess(res, 'Announcement deleted');
};
