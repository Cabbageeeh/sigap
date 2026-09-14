import SQLite from '@services/SQLite';
import type { StudentAttendance } from '@types';
import { randomUUID } from 'crypto';

export const findAllStudentAttendance = (): StudentAttendance[] =>
  SQLite.many<StudentAttendance>`SELECT * FROM student_attendance ORDER BY created_at DESC`;

export const findStudentAttendanceById = (id: string): StudentAttendance | undefined =>
  SQLite.one<StudentAttendance>`SELECT * FROM student_attendance WHERE id = ${id}`;

export const findAttendanceByJournal = (journalId: string): StudentAttendance[] =>
  SQLite.many<StudentAttendance>`SELECT * FROM student_attendance WHERE journal_id = ${journalId} ORDER BY created_at`;

export const findAttendanceByStudent = (studentId: string): StudentAttendance[] =>
  SQLite.many<StudentAttendance>`SELECT * FROM student_attendance WHERE student_id = ${studentId} ORDER BY created_at DESC`;

export const findAttendanceBySchedule = (scheduleId: string): StudentAttendance[] =>
  SQLite.many<StudentAttendance>`SELECT * FROM student_attendance WHERE schedule_id = ${scheduleId} ORDER BY created_at`;

export const createStudentAttendance = (data: Omit<StudentAttendance, 'id' | 'created_at' | 'updated_at'>): StudentAttendance => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO student_attendance (id, student_id, schedule_id, journal_id, status, created_at, updated_at)
    VALUES (${id}, ${data.student_id}, ${data.schedule_id}, ${data.journal_id}, ${data.status}, ${now}, ${now})
  `;
  return findStudentAttendanceById(id)!;
};

export const upsertStudentAttendance = (data: Omit<StudentAttendance, 'id' | 'created_at' | 'updated_at'>): StudentAttendance => {
  const existing = SQLite.one<StudentAttendance>`
    SELECT * FROM student_attendance
    WHERE student_id = ${data.student_id} AND schedule_id = ${data.schedule_id} AND journal_id = ${data.journal_id}
  `;
  if (existing) {
    updateStudentAttendance(existing.id, { status: data.status });
    return findStudentAttendanceById(existing.id)!;
  }
  return createStudentAttendance(data);
};

export const updateStudentAttendance = (id: string, data: Partial<Omit<StudentAttendance, 'id' | 'created_at'>>): StudentAttendance | undefined => {
  SQLite.update('student_attendance', { id }, data);
  return findStudentAttendanceById(id);
};

export const deleteStudentAttendance = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM student_attendance WHERE id = ?', [id]);
  return result.changes > 0;
};

export const deleteAttendanceByJournal = (journalId: string): number => {
  const result = SQLite.run('DELETE FROM student_attendance WHERE journal_id = ?', [journalId]);
  return result.changes;
};

export interface AttendanceRecapRow {
  student_id: string;
  student_name: string;
  nis: string;
  present: number;
  sick: number;
  leave: number;
  absent: number;
  total: number;
}

export const getAttendanceRecap = (classId: string, from: number, to: number, teacherUserId?: string): AttendanceRecapRow[] =>
  SQLite.all<AttendanceRecapRow>(
    `SELECT st.id AS student_id, st.name AS student_name, st.nis,
       SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) AS present,
       SUM(CASE WHEN sa.status = 'sick' THEN 1 ELSE 0 END) AS sick,
       SUM(CASE WHEN sa.status = 'leave' THEN 1 ELSE 0 END) AS leave,
       SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) AS absent,
       COUNT(sa.id) AS total
     FROM students st
     LEFT JOIN student_attendance sa ON sa.student_id = st.id
     LEFT JOIN journals j ON j.id = sa.journal_id AND j.date >= ? AND j.date <= ?
     LEFT JOIN schedules sch ON sch.id = sa.schedule_id ${teacherUserId ? 'AND sch.teacher_user_id = ?' : ''}
     WHERE st.class_id = ?
       AND (sa.id IS NULL OR (j.id IS NOT NULL AND sch.id IS NOT NULL))
     GROUP BY st.id
     ORDER BY st.name`,
    teacherUserId ? [from, to, teacherUserId, classId] : [from, to, classId],
  );
