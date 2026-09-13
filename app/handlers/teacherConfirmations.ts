import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonCreated, jsonError, jsonServerError, jsonValidationError, queryInt, queryString, isUniqueConstraintError } from '@core';
import Logger from '@services/Logger';
import { findTeacherConfirmationById, findAllTeacherConfirmations, findConfirmationsByTeacher, createTeacherConfirmation, findTodayConfirmationByTeacher, getConfirmationLogsPaginated, countTeachersConfirmedOn } from '@queries/teacherConfirmations';
import { findScheduleById } from '@queries/schedules';
import { findActiveSchoolLocation } from '@queries/schoolLocations';
import { findAllTeachersForAssignment, countActiveTeachers } from '@queries/teachers';
import { haversineDistance, validateCoordinates } from '@services/Geolocation';
import { verifyQrToken } from '@services/QrCode';
import { isAdmin, hasPermission } from '@queries/users';
import { isTeacherUser } from '@queries/teacherClassAssignments';
import { TeacherConfirmationSchema, zodToErrors } from '@validators';
import type { TeacherConfirmation } from '@types';

const isTeacherActor = (userId: string): boolean => !isAdmin(userId) && isTeacherUser(userId);
const canView = (userId: string): boolean => isAdmin(userId) || hasPermission(userId, 'confirmations.view');

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDateParam = (value: string): number | null => {
  if (!DATE_PARAM_PATTERN.test(value)) return null;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const startOfToday = (): number => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
};

export const teacherConfirmationsPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  const userId = req.user.id;
  const allowed = canView(userId);
  const ownView = allowed && isTeacherActor(userId);
  const page = queryInt(req, 'page', 1);
  const limit = queryInt(req, 'limit', 20);
  const startDate = queryString(req, 'start_date');
  const endDate = queryString(req, 'end_date');
  const teacherFilter = queryString(req, 'teacher_id');
  const startMs = parseDateParam(startDate);
  const endDayMs = parseDateParam(endDate);
  const result = allowed
    ? getConfirmationLogsPaginated({
      page,
      limit,
      startMs: startMs ?? undefined,
      endMs: endDayMs !== null ? endDayMs + 86400000 : undefined,
      teacherUserId: ownView ? userId : (teacherFilter || undefined),
    })
    : { data: [], total: 0 };
  const totalPages = Math.ceil(result.total / limit);
  return res.inertia('teacherConfirmations', {
    permissions: { canView: allowed },
    records: result.data,
    meta: { total: result.total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    filters: { start_date: startDate, end_date: endDate, teacher_id: teacherFilter },
    summary: allowed && !ownView ? { confirmed: countTeachersConfirmedOn(startOfToday()), total: countActiveTeachers() } : null,
    schoolStartTime: allowed ? findActiveSchoolLocation()?.start_time ?? null : null,
    teachers: allowed && !ownView ? findAllTeachersForAssignment() : [],
    isOwnView: ownView,
  });
};

export const confirmPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'confirmations.create')) {
    return res.redirect('/dashboard');
  }

  const scheduleId = typeof req.query.schedule_id === 'string' ? req.query.schedule_id : undefined;
  const schedule = scheduleId ? findScheduleById(scheduleId) : null;
  if (schedule && schedule.teacher_user_id !== req.user.id) return res.redirect('/dashboard');

  const qrToken = typeof req.query.qr_token === 'string' ? req.query.qr_token : null;
  const qrStatus = qrToken ? verifyQrToken(qrToken) : null;
  const school = findActiveSchoolLocation();
  const geofenceRequired = !!school && school.latitude !== null && school.longitude !== null && school.radius_meters !== null;
  return res.inertia('teacher/confirm', {
    scheduleId: scheduleId || null,
    schedule,
    qrToken,
    qrTokenValid: !!qrStatus?.valid && !qrStatus.expired,
    qrTokenExpired: !!qrStatus?.expired,
    alreadyConfirmed: !!findTodayConfirmationByTeacher(req.user.id),
    geofenceRequired,
  });
};

export const listTeacherConfirmations = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const teacherId = queryString(req, 'teacher_user_id');
  const isOversight = canView(req.user.id) && !isTeacherActor(req.user.id);
  const isOwn = isTeacherActor(req.user.id) && teacherId === req.user.id;
  if (!isOversight && !isOwn) return jsonError(res, 'Forbidden', 403);

  const data = teacherId ? findConfirmationsByTeacher(teacherId) : findAllTeacherConfirmations();
  return jsonSuccess(res, 'OK', data);
};

export const teacherConfirmationData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);

  const item = findTeacherConfirmationById(req.params.id || '');
  if (!item) return jsonError(res, 'Not found', 404);
  const isOversight = canView(req.user.id) && !isTeacherActor(req.user.id);
  const isOwn = isTeacherActor(req.user.id) && item.teacher_user_id === req.user.id;
  if (!isOversight && !isOwn) return jsonError(res, 'Forbidden', 403);

  return jsonSuccess(res, 'OK', item);
};

export const submitTeacherConfirmation = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isTeacherActor(req.user.id) || !hasPermission(req.user.id, 'confirmations.create')) {
    return jsonError(res, 'Forbidden', 403);
  }

  const parsed = TeacherConfirmationSchema.safeParse(req.body);
  if (!parsed.success) return jsonValidationError(res, 'Validation failed', zodToErrors(parsed.error));

  const qrToken = parsed.data.qr_token;
  if (!qrToken) return jsonError(res, 'Silakan scan QR absen sekolah terlebih dahulu', 403, 'QR_TOKEN_REQUIRED');
  const qrStatus = verifyQrToken(qrToken);
  if (!qrStatus.valid) return jsonError(res, 'QR absen tidak valid', 403, 'INVALID_QR_TOKEN');
  if (qrStatus.expired) return jsonError(res, 'QR absen sudah kedaluwarsa', 403, 'EXPIRED_QR_TOKEN');

  const existingToday = findTodayConfirmationByTeacher(req.user.id);
  if (existingToday) {
    return jsonError(res, 'Anda sudah konfirmasi kehadiran hari ini', 409, 'DUPLICATE_CONFIRMATION');
  }

  const scheduleId = parsed.data.schedule_id ?? null;
  if (scheduleId) {
    const schedule = findScheduleById(scheduleId);
    if (!schedule) return jsonError(res, 'Schedule not found', 404);
    if (schedule.teacher_user_id !== req.user.id) return jsonError(res, 'Forbidden', 403);
  }

  const location = findActiveSchoolLocation();
  const geofence = location && location.latitude !== null && location.longitude !== null && location.radius_meters !== null
    ? { latitude: location.latitude, longitude: location.longitude, radius: location.radius_meters }
    : null;

  const requestLatitude: number | null = parsed.data.latitude ?? null;
  const requestLongitude: number | null = parsed.data.longitude ?? null;
  const coords = requestLatitude !== null && requestLongitude !== null && validateCoordinates(requestLatitude, requestLongitude)
    ? { latitude: requestLatitude, longitude: requestLongitude }
    : null;

  if (geofence && !coords) {
    return jsonError(res, 'Bagikan lokasi Anda untuk mencatat konfirmasi', 403, 'LOCATION_REQUIRED');
  }

  let distanceMeters: number | null = null;
  let isInside = false;
  if (geofence && coords) {
    distanceMeters = Math.round(haversineDistance(coords, { latitude: geofence.latitude, longitude: geofence.longitude }));
    isInside = distanceMeters <= geofence.radius;
    if (!isInside) {
      return jsonError(res, `Anda berada di luar area sekolah (${distanceMeters} m dari sekolah)`, 403, 'OUTSIDE_SCHOOL');
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const data: Omit<TeacherConfirmation, 'id' | 'created_at'> = {
    schedule_id: scheduleId,
    teacher_user_id: req.user.id,
    photo_url: null,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    distance_meters: distanceMeters,
    is_inside_school: isInside ? 1 : 0,
    confirmation_date: startOfDay.getTime(),
    confirmed_at: Date.now(),
  };

  try {
    const item = createTeacherConfirmation(data);
    return jsonCreated(res, 'Konfirmasi kehadiran tercatat', item);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return jsonError(res, 'Anda sudah konfirmasi kehadiran hari ini', 409, 'DUPLICATE_CONFIRMATION');
    }
    Logger.error('Failed to create teacher confirmation', error as Error);
    return jsonServerError(res, 'Failed to create confirmation');
  }
};

export const outsideConfirmationsData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!canView(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const teacherId = queryString(req, 'teacher_user_id');
  if (isTeacherActor(req.user.id) && teacherId && teacherId !== req.user.id) {
    return jsonError(res, 'Forbidden', 403);
  }
  const data = (isTeacherActor(req.user.id)
    ? findConfirmationsByTeacher(req.user.id)
    : teacherId ? findConfirmationsByTeacher(teacherId) : findAllTeacherConfirmations())
    .filter(c => c.is_inside_school === 0);
  return jsonSuccess(res, 'OK', data);
};
