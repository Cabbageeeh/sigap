import type { NaraRequest, NaraResponse } from '@core';
import { findStudentById } from '@queries/students';
import { findStudentsByParent, findStudentsByClass } from '@queries/students';
import { getStudentGradeSummaries, getStudentContext } from '@queries/grades';
import { findAttendanceByStudent } from '@queries/studentAttendance';
import { isTeacherHomeroomOfClass, isTeacherUser } from '@queries/teacherClassAssignments';
import { isAdmin, hasPermission, hasRole } from '@queries/users';
import type { Student } from '@types';

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

  // Neighbours are scoped to what this actor may open: a parent only moves
  // between their own children, staff between the classmates.
  const peers = (parentUser ? findStudentsByParent(userId) : findStudentsByClass(student.class_id))
    .slice()
    .sort((a: Student, b: Student) => a.nis.localeCompare(b.nis));
  const peerIndex = peers.findIndex(peer => peer.id === studentId);
  const asTarget = (peer?: Student) => (peer ? { id: peer.id, name: peer.name, nis: peer.nis } : null);

  const back = ownsChild
    ? { href: `/parent/child/${studentId}/grades`, label: 'Kembali ke Nilai Anak' }
    : overseesGrades
      ? { href: `/headmaster/classes/${student.class_id}/grades`, label: 'Kembali ke Nilai Kelas' }
      : { href: `/attendance?class_id=${student.class_id}`, label: 'Kembali ke Rekap Absensi' };

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
    backHref: back.href,
    backLabel: back.label,
    previousStudent: asTarget(peerIndex > 0 ? peers[peerIndex - 1] : undefined),
    nextStudent: asTarget(peerIndex >= 0 ? peers[peerIndex + 1] : undefined),
    studentPosition: peerIndex >= 0 ? peerIndex + 1 : 0,
    studentTotal: peers.length,
  });
};
