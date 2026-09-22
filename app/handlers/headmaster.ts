import type { NaraRequest, NaraResponse } from '@core';
import { jsonSuccess, jsonError } from '@core';
import { getDashboardStats } from '@queries/stats';
import {
  getTodaySessions,
  getMissedConfirmations,
  getJournalCompleteness,
  getGradeProgress,
  getClassOverview,
  getTeacherAttendanceOverview,
  getOutsideConfirmations,
  getTeacherAttendanceHistory,
  findClassGradeDetails,
} from '@queries/headmaster';
import { findActiveSchoolLocation } from '@queries/schoolLocations';
import { findAllTeacherConfirmations } from '@queries/teacherConfirmations';
import { findClassById } from '@queries/classes';
import { findTeacherByUserId } from '@queries/teachers';
import { hasPermission } from '@queries/users';

const isHeadmaster = (userId: string): boolean =>
  hasPermission(userId, 'headmaster.view');

export const headmasterDashboardPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!isHeadmaster(req.user.id)) return res.redirect('/dashboard');
  return res.inertia('headmaster/dashboard', { canView: true });
};

export const headmasterDashboardData = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isHeadmaster(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const today = getTodaySessions();
  return jsonSuccess(res, 'OK', {
    stats: getDashboardStats(),
    classOverview: getClassOverview(),
    teacherAttendance: getTeacherAttendanceOverview(),
    today,
    confirmedToday: today.filter(s => s.confirmed).length,
    missed: getMissedConfirmations(),
    journals: getJournalCompleteness(),
    progress: getGradeProgress(),
  });
};

export const headmasterReportsPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!isHeadmaster(req.user.id)) return res.redirect('/dashboard');
  return res.inertia('headmaster/reports', { canView: true });
};

export const headmasterClassGradesPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!isHeadmaster(req.user.id)) return res.redirect('/dashboard');

  const classId = req.params.classId;
  if (!classId) return res.redirect('/headmaster/dashboard');

  const classItem = findClassById(classId);
  if (!classItem) return res.redirect('/headmaster/dashboard');

  return res.inertia('headmaster/class-grades', {
    className: classItem.name,
    grade: classItem.grade,
    rows: findClassGradeDetails(classId),
  });
};

export const headmasterTeacherAttendancePage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');
  if (!isHeadmaster(req.user.id)) return res.redirect('/dashboard');

  const teacherUserId = req.params.teacherUserId;
  if (!teacherUserId) return res.redirect('/headmaster/dashboard');

  const teacher = findTeacherByUserId(teacherUserId);
  if (!teacher) return res.redirect('/headmaster/reports');

  const summary = getTeacherAttendanceOverview().find(item => item.teacher_user_id === teacherUserId);
  if (!summary) return res.redirect('/headmaster/reports');

  return res.inertia('headmaster/teacher-attendance', {
    summary,
    rows: getTeacherAttendanceHistory(teacherUserId),
  });
};

export const listOutsideConfirmations = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return jsonError(res, 'Unauthorized', 401);
  if (!isHeadmaster(req.user.id)) return jsonError(res, 'Forbidden', 403);

  const location = findActiveSchoolLocation();
  const all = findAllTeacherConfirmations();

  return jsonSuccess(res, 'OK', {
    activeLocation: location,
    total: all.length,
    outside: getOutsideConfirmations(),
  });
};
