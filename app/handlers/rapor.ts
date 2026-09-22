import type { NaraRequest, NaraResponse } from '@core';
import { findStudentById } from '@queries/students';
import { findStudentsByParent } from '@queries/students';
import { getStudentGradeSummaries, getStudentContext } from '@queries/grades';
import { findAttendanceByStudent } from '@queries/studentAttendance';
import { isTeacherHomeroomOfClass, isTeacherUser } from '@queries/teacherClassAssignments';
import { isAdmin, hasPermission, hasRole } from '@queries/users';

export const raporPage = (req: NaraRequest, res: NaraResponse) => {
  if (!req.user) return res.redirect('/login');

  const studentId = req.params.studentId;
  if (!studentId) return res.redirect('/dashboard');

  const student = findStudentById(studentId);
  if (!student) return res.redirect('/dashboard');

  const userId = req.user.id;
  const parentUser = hasRole(userId, 'parent');
  const staff = !isAdmin(userId) && !parentUser && hasPermission(userId, 'grades.view');
  const homeroomOfStudent = staff && isTeacherUser(userId) && isTeacherHomeroomOfClass(userId, student.class_id);
  const overseesGrades = staff && hasRole(userId, 'headmaster');
  const ownsChild = parentUser && findStudentsByParent(userId).some(child => child.id === studentId);

  if (!homeroomOfStudent && !overseesGrades && !ownsChild) return res.redirect('/dashboard');

  const isStaff = homeroomOfStudent || overseesGrades;

  const context = getStudentContext(studentId);
  const { published, summaries } = getStudentGradeSummaries(studentId);

  const attendance = findAttendanceByStudent(studentId);
  const attendanceCounts = {
    present: attendance.filter(a => a.status === 'present').length,
    sick: attendance.filter(a => a.status === 'sick').length,
    leave: attendance.filter(a => a.status === 'leave').length,
    absent: attendance.filter(a => a.status === 'absent').length,
  };

  return res.inertia('reports/rapor', {
    student: { name: student.name, nis: student.nis },
    className: context?.class_name ?? '',
    yearName: context?.year_name ?? '',
    isParent: parentUser,
    gradesPublished: published,
    summaries: isStaff || published ? summaries : [],
    attendanceCounts,
  });
};
