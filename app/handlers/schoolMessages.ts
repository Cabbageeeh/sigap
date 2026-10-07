import type { NaraRequest, NaraResponse } from '@core';
import { jsonError, jsonSuccess, jsonValidationError, queryString, queryInt } from '@core';
import { hasRole, isAdmin, findUserById } from '@queries/users';
import { findSetting, upsertSetting } from '@queries/appSettings';
import * as messages from '@queries/schoolMessages';
import * as schemas from '@validators/schoolMessages';
import { zodToErrors } from '@validators';
import Logger from '@services/Logger';
import type { SchoolConversation } from '@types';

const canUseSchoolMessages = (userId: string): boolean => hasRole(userId, 'parent') || hasRole(userId, 'teacher');
const communicationSettings = () => ({
  enabled: findSetting('school_communication_enabled') !== 'false',
  service_hours: findSetting('school_communication_hours') ?? 'Hari sekolah pukul 07.00–15.00 (waktu setempat sekolah)',
});
const canContinueSchoolConversation = (conversation: SchoolConversation): boolean =>
  messages.findSchoolContacts(conversation.parent_user_id).some(contact =>
    contact.student_id === conversation.student_id && contact.teacher_user_id === conversation.teacher_user_id);

const schoolMessageMutationError = (res: NaraResponse, error: unknown) => {
  if (error instanceof Error && error.message === 'MESSAGE_RATE_LIMIT') {
    return jsonError(res, 'Batas 5 pesan dalam 10 menit tercapai. Tunggu sebelum mengirim lagi.', 429);
  }
  Logger.error('School communication mutation failed', error as Error);
  return jsonError(res, 'Perubahan komunikasi belum berhasil disimpan.', 500);
};

export const schoolMessagesPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!canUseSchoolMessages(req.user.id)) return res.redirect('/dashboard');
  return res.inertia('schoolMessages', { userId: req.user.id, isParent: hasRole(req.user.id, 'parent') });
};

export const schoolMessagesData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Silakan masuk terlebih dahulu.', 401);
  if (!canUseSchoolMessages(req.user.id)) return jsonError(res, 'Anda tidak memiliki akses komunikasi.', 403);
  const userId = req.user.id;
  const selectedId = queryString(req, 'conversation_id');
  const conversation = selectedId ? messages.findSchoolConversation(selectedId, userId) : undefined;
  if (selectedId && !conversation) return jsonError(res, 'Percakapan tidak ditemukan.', 404);
  const messagePage = queryInt(req, 'message_page');
  if (conversation && messagePage === 1) messages.markSchoolConversationRead(conversation, userId);
  return jsonSuccess(res, 'Pesan dimuat.', {
    settings: communicationSettings(), restriction: messages.findSchoolCommunicationRestriction(userId) ?? null,
    contacts: hasRole(userId, 'parent') ? messages.findSchoolContacts(userId) : [],
    conversations: messages.findSchoolConversations(userId, 50, (queryInt(req, 'page') - 1) * 50),
    conversation: conversation ?? null,
    messages: conversation ? messages.findSchoolMessages(conversation.id, (messagePage - 1) * 100) : [],
    canReply: !!conversation && canContinueSchoolConversation(conversation),
  });
};

export const startSchoolConversation = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Silakan masuk terlebih dahulu.', 401);
  if (!hasRole(req.user.id, 'parent')) return jsonError(res, 'Percakapan baru dimulai oleh orang tua.', 403);
  if (!communicationSettings().enabled) return jsonError(res, 'Komunikasi sedang dinonaktifkan oleh sekolah.', 403);
  if (messages.findSchoolCommunicationRestriction(req.user.id)) return jsonError(res, 'Akses komunikasi Anda sedang dibatasi. Hubungi sekolah.', 403);
  const parsed = schemas.StartSchoolConversationSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Periksa isian percakapan.', zodToErrors(parsed.error));
  if (!messages.findSchoolContacts(req.user.id).some(contact => contact.student_id === parsed.data.student_id && contact.teacher_user_id === parsed.data.teacher_user_id)) {
    return jsonError(res, 'Pilih wali kelas atau guru yang mengajar anak Anda pada tahun ajaran aktif.', 403);
  }
  try {
    const id = messages.createSchoolConversation({ ...parsed.data, parent_user_id: req.user.id });
    return jsonSuccess(res, 'Pesan berhasil dikirim.', { id });
  } catch (error: unknown) { return schoolMessageMutationError(res, error); }
};

export const sendSchoolMessage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Silakan masuk terlebih dahulu.', 401);
  if (!canUseSchoolMessages(req.user.id)) return jsonError(res, 'Anda tidak memiliki akses komunikasi.', 403);
  const conversation = messages.findSchoolConversation(req.params.id, req.user.id);
  if (!conversation) return jsonError(res, 'Percakapan tidak ditemukan.', 404);
  if (!communicationSettings().enabled || messages.findSchoolCommunicationRestriction(req.user.id)) return jsonError(res, 'Pengiriman pesan sedang dibatasi.', 403);
  if (!canContinueSchoolConversation(conversation)) return jsonError(res, 'Penugasan guru atau hubungan orang tua dengan siswa sudah berubah. Mulai percakapan dengan guru yang tersedia.', 403);
  if (conversation.status === 'closed') return jsonError(res, 'Percakapan sudah selesai. Mulai topik baru jika diperlukan.', 409);
  const parsed = schemas.SendSchoolMessageSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Periksa isi pesan.', zodToErrors(parsed.error));
  try {
    messages.createSchoolMessage(conversation, req.user.id, parsed.data.body);
    return jsonSuccess(res, 'Pesan berhasil dikirim.');
  } catch (error: unknown) { return schoolMessageMutationError(res, error); }
};

export const changeSchoolConversationStatus = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Silakan masuk terlebih dahulu.', 401);
  const conversation = messages.findSchoolConversation(req.params.id, req.user.id);
  if (!conversation || conversation.teacher_user_id !== req.user.id || !hasRole(req.user.id, 'teacher')) return jsonError(res, 'Hanya guru penerima yang dapat mengubah status.', 403);
  if (!canContinueSchoolConversation(conversation)) return jsonError(res, 'Penugasan guru sudah berubah.', 403);
  const parsed = schemas.SchoolConversationStatusSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Status tidak valid.', zodToErrors(parsed.error));
  try {
    messages.updateSchoolConversationStatus(conversation.id, parsed.data.status);
    return jsonSuccess(res, parsed.data.status === 'closed' ? 'Percakapan ditandai selesai.' : 'Percakapan dibuka kembali.');
  } catch (error: unknown) { return schoolMessageMutationError(res, error); }
};

export const reportSchoolMessage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Silakan masuk terlebih dahulu.', 401);
  if (!canUseSchoolMessages(req.user.id)) return jsonError(res, 'Anda tidak memiliki akses komunikasi.', 403);
  const conversation = messages.findSchoolConversation(req.params.id, req.user.id);
  if (!conversation) return jsonError(res, 'Percakapan tidak ditemukan.', 404);
  const parsed = schemas.ReportSchoolMessageSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Isi alasan laporan.', zodToErrors(parsed.error));
  try {
    if (!messages.createSchoolMessageReport(req.params.messageId, conversation.id, req.user.id, parsed.data.reason)) return jsonError(res, 'Pesan tidak ditemukan atau merupakan pesan Anda sendiri.', 404);
    return jsonSuccess(res, 'Pesan dilaporkan kepada admin sekolah.');
  } catch (error: unknown) { return schoolMessageMutationError(res, error); }
};

export const schoolCommunicationAdminPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!isAdmin(req.user.id)) return res.redirect('/dashboard');
  return res.inertia('schoolCommunicationAdmin');
};

export const schoolCommunicationAdminData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user || !isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat mengelola komunikasi.', 403);
  return jsonSuccess(res, 'Pengaturan dimuat.', {
    settings: communicationSettings(), reports: messages.findSchoolMessageReports(), restrictions: messages.findSchoolCommunicationRestrictions(),
  });
};

export const saveSchoolCommunicationSettings = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user || !isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat mengelola komunikasi.', 403);
  const parsed = schemas.SchoolCommunicationSettingsSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Periksa pengaturan.', zodToErrors(parsed.error));
  try {
    upsertSetting('school_communication_enabled', String(parsed.data.enabled));
    upsertSetting('school_communication_hours', parsed.data.service_hours);
    return jsonSuccess(res, 'Pengaturan komunikasi disimpan.');
  } catch (error: unknown) { return schoolMessageMutationError(res, error); }
};

export const saveSchoolCommunicationRestriction = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user || !isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat membatasi komunikasi.', 403);
  const parsed = schemas.SchoolCommunicationRestrictionSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Periksa pembatasan.', zodToErrors(parsed.error));
  if (!findUserById(parsed.data.user_id)) return jsonError(res, 'Pengguna tidak ditemukan.', 404);
  try {
    messages.saveSchoolCommunicationRestriction(parsed.data.user_id, req.user.id, parsed.data.restricted, parsed.data.reason);
    return jsonSuccess(res, parsed.data.restricted ? 'Pengiriman pesan pengguna dibatasi.' : 'Akses komunikasi dipulihkan.');
  } catch (error: unknown) { return schoolMessageMutationError(res, error); }
};

export const reviewSchoolMessageReport = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user || !isAdmin(req.user.id)) return jsonError(res, 'Hanya admin yang dapat memeriksa laporan.', 403);
  try {
    messages.reviewSchoolMessageReport(req.params.id, req.user.id);
    return jsonSuccess(res, 'Laporan ditandai sudah diperiksa.');
  } catch (error: unknown) { return schoolMessageMutationError(res, error); }
};
