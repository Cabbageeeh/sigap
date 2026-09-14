import type { NaraRequest, NaraResponse } from '@core';
import { getDashboardStats, getDashboardCharts } from '@queries/stats';
import { findAllAcademicYears, findActiveAcademicYear } from '@queries/academicYears';
import { findAllClasses } from '@queries/classes';
import { findAllSubjects } from '@queries/subjects';
import { isAdmin, hasPermission } from '@queries/users';

export const dashboardPage = (req: NaraRequest, res: NaraResponse) => {
  const userId = req.user?.id;
  const roles = req.user?.roles ?? [];

  if (roles.includes('parent')) return res.redirect('/parent/dashboard');
  if (roles.includes('headmaster')) return res.redirect('/headmaster/dashboard');
  if (roles.includes('teacher')) return res.redirect('/teacher/schedule');

  const canViewStudents = userId ? isAdmin(userId) || hasPermission(userId, 'students.view') : false;
  const canViewTeachers = userId ? isAdmin(userId) || hasPermission(userId, 'teachers.view') : false;

  const stats = canViewStudents ? getDashboardStats() : undefined;
  const charts = canViewStudents ? getDashboardCharts() : undefined;

  return res.inertia('dashboard', {
    stats,
    years: findAllAcademicYears(),
    activeYear: findActiveAcademicYear(),
    charts,
    classes: canViewStudents ? findAllClasses() : [],
    subjects: canViewTeachers ? findAllSubjects() : [],
  });
};
