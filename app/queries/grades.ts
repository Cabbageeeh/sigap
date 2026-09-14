import SQLite from '@services/SQLite';
import type { Grade } from '@types';
import type { GradeSummaryRow, SubjectGradeSummary, GradeSummaryComponent, ClassSubjectSummary, StudentGradeProgression } from '../types/shared';
import { computeFinalScore, predikatOf, isPassed } from '@services/GradeCalculator';
import { randomUUID } from 'crypto';

export const findAllGrades = (): Grade[] =>
  SQLite.many<Grade>`SELECT * FROM grades ORDER BY created_at DESC`;

export const findGradeById = (id: string): Grade | undefined =>
  SQLite.one<Grade>`SELECT * FROM grades WHERE id = ${id}`;

export const findGradesByStudent = (studentId: string): Grade[] =>
  SQLite.many<Grade>`SELECT * FROM grades WHERE student_id = ${studentId} ORDER BY date DESC`;

const teacherGradeScopeSql = (alias: string): string => `(
  EXISTS (
    SELECT 1
    FROM teacher_class_assignments tca
    INNER JOIN teachers homeroom_teacher ON homeroom_teacher.id = tca.teacher_id
    INNER JOIN classes homeroom_class
      ON homeroom_class.id = tca.class_id AND homeroom_class.academic_year_id = tca.academic_year_id
    WHERE homeroom_teacher.user_id = ?
      AND tca.class_id = ${alias}.class_id
      AND tca.is_homeroom = 1
  )
  OR EXISTS (
    SELECT 1
    FROM schedules schedule_assignment
    INNER JOIN classes scheduled_class
      ON scheduled_class.id = schedule_assignment.class_id
      AND scheduled_class.academic_year_id = schedule_assignment.academic_year_id
    WHERE schedule_assignment.teacher_user_id = ?
      AND schedule_assignment.class_id = ${alias}.class_id
      AND schedule_assignment.subject_id = ${alias}.subject_id
  )
  OR EXISTS (
    SELECT 1
    FROM class_subjects class_subject_assignment
    INNER JOIN teachers class_subject_teacher ON class_subject_teacher.id = class_subject_assignment.teacher_id
    INNER JOIN classes assigned_class
      ON assigned_class.id = class_subject_assignment.class_id
      AND assigned_class.academic_year_id = class_subject_assignment.academic_year_id
    WHERE class_subject_teacher.user_id = ?
      AND class_subject_assignment.class_id = ${alias}.class_id
      AND class_subject_assignment.subject_id = ${alias}.subject_id
  )
)`;

export const findGradesByStudentForTeacher = (studentId: string, teacherUserId: string): Grade[] =>
  SQLite.all<Grade>(
    `SELECT g.*
     FROM grades g
     WHERE g.student_id = ? AND ${teacherGradeScopeSql('g')}
     ORDER BY g.date DESC`,
    [studentId, teacherUserId, teacherUserId, teacherUserId],
  );

export const findGradesByClassSubject = (classId: string, subjectId: string): Grade[] =>
  SQLite.many<Grade>`SELECT * FROM grades WHERE class_id = ${classId} AND subject_id = ${subjectId} ORDER BY date DESC`;

export const findGradesByTeacher = (teacherUserId: string): Grade[] =>
  SQLite.many<Grade>`SELECT * FROM grades WHERE teacher_user_id = ${teacherUserId} ORDER BY date DESC`;

export const findGradeByUniqueKey = (studentId: string, subjectId: string, classId: string, type: string): Grade | undefined =>
  SQLite.one<Grade>`SELECT * FROM grades WHERE student_id = ${studentId} AND subject_id = ${subjectId} AND class_id = ${classId} AND type = ${type}`;

export interface BulkGradeEntry {
  student_id: string;
  score: number;
}

export interface BulkGradeResult {
  grade_id: string;
  student_id: string;
  action: 'create' | 'update';
  old_score: number | null;
  new_score: number;
}

export const upsertGradesBulk = (
  classId: string,
  subjectId: string,
  type: Grade['type'],
  entries: BulkGradeEntry[],
  teacherUserId: string,
): BulkGradeResult[] => {
  const now = Date.now();
  return SQLite.transaction(() => {
    const results: BulkGradeResult[] = [];
    for (const entry of entries) {
      const existing = findGradeByUniqueKey(entry.student_id, subjectId, classId, type);
      if (existing) {
        if (existing.score === entry.score) continue;
        updateGrade(existing.id, { score: entry.score });
        results.push({ grade_id: existing.id, student_id: entry.student_id, action: 'update', old_score: existing.score, new_score: entry.score });
      } else {
        const item = createGrade({ student_id: entry.student_id, subject_id: subjectId, class_id: classId, type, score: entry.score, date: now, teacher_user_id: teacherUserId });
        results.push({ grade_id: item.id, student_id: entry.student_id, action: 'create', old_score: null, new_score: entry.score });
      }
    }
    return results;
  });
};

export interface GradeWithNames extends Grade {
  student_name: string;
  subject_name: string;
  class_name: string;
}

export const getGradesPaginated = (
  page: number,
  limit: number,
  studentId?: string,
  classId?: string,
  subjectId?: string,
  teacherUserId?: string,
): { data: GradeWithNames[]; total: number } => {
  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (studentId) {
    conditions.push('g.student_id = ?');
    params.push(studentId);
  }
  if (classId) {
    conditions.push('g.class_id = ?');
    params.push(classId);
  }
  if (subjectId) {
    conditions.push('g.subject_id = ?');
    params.push(subjectId);
  }
  if (teacherUserId) {
    conditions.push(teacherGradeScopeSql('g'));
    params.push(teacherUserId, teacherUserId, teacherUserId);
  }

  const where = conditions.join(' AND ');
  const countRow = SQLite.get<{ count: number }>(`SELECT COUNT(*) as count FROM grades g WHERE ${where}`, params);
  const data = SQLite.all<GradeWithNames>(
    `SELECT g.*, st.name AS student_name, sub.name AS subject_name, c.name AS class_name
     FROM grades g
     JOIN students st ON st.id = g.student_id
     JOIN subjects sub ON sub.id = g.subject_id
     JOIN classes c ON c.id = g.class_id
     WHERE ${where} ORDER BY g.date DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );

  return { data, total: countRow?.count ?? 0 };
};

export const createGrade = (data: Omit<Grade, 'id' | 'created_at' | 'updated_at'>): Grade => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO grades (id, student_id, subject_id, class_id, type, score, date, teacher_user_id, created_at, updated_at)
    VALUES (${id}, ${data.student_id}, ${data.subject_id}, ${data.class_id}, ${data.type}, ${data.score}, ${data.date}, ${data.teacher_user_id}, ${now}, ${now})
  `;
  return findGradeById(id)!;
};

export const updateGrade = (id: string, data: Partial<Omit<Grade, 'id' | 'created_at'>>): Grade | undefined => {
  SQLite.update('grades', { id }, data);
  return findGradeById(id);
};

export const deleteGrade = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM grades WHERE id = ?', [id]);
  return result.changes > 0;
};

export const deleteGrades = (ids: string[]): number => {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = SQLite.run(`DELETE FROM grades WHERE id IN (${placeholders})`, ids);
  return result.changes;
};

const findComponentsByYear = (academicYearId: string): GradeSummaryComponent[] =>
  SQLite.many<GradeSummaryComponent>`
    SELECT type, name, weight FROM grade_components WHERE academic_year_id = ${academicYearId} ORDER BY weight DESC, type
  `;

export const getGradesPublicationForStudent = (studentId: string): boolean => {
  const row = SQLite.get<{ published: number }>(
    `SELECT ay.is_grades_published AS published
     FROM students st
     JOIN classes c ON c.id = st.class_id
     JOIN academic_years ay ON ay.id = c.academic_year_id
     WHERE st.id = ?`,
    [studentId]
  );
  return (row?.published ?? 0) === 1;
};

export const getClassSubjectSummary = (classId: string, subjectId: string): ClassSubjectSummary | null => {
  const meta = SQLite.get<{ className: string; subjectName: string; kkm: number; yearId: string }>(
    `SELECT c.name AS className, s.name AS subjectName, s.kkm AS kkm, c.academic_year_id AS yearId
     FROM classes c
     JOIN subjects s ON s.id = ?
     WHERE c.id = ?`,
    [subjectId, classId]
  );
  if (!meta) return null;

  const gradeRows = SQLite.all<{ student_id: string; type: string; score: number; grade_id: string }>(
    `SELECT g.student_id, g.type, g.score, g.id AS grade_id
     FROM grades g
     WHERE g.class_id = ? AND g.subject_id = ?`,
    [classId, subjectId]
  );

  const allStudents = SQLite.all<{ id: string; name: string; nis: string }>(
    'SELECT id, name, nis FROM students WHERE class_id = ? ORDER BY name',
    [classId],
  );

  const byStudent = new Map<string, { student_id: string; student_name: string; nis: string; scores: Record<string, number | null>; grade_ids: Record<string, string> }>();
  for (const st of allStudents) {
    byStudent.set(st.id, { student_id: st.id, student_name: st.name, nis: st.nis, scores: {}, grade_ids: {} });
  }
  for (const row of gradeRows) {
    const entry = byStudent.get(row.student_id);
    if (!entry) continue;
    entry.scores[row.type] = row.score;
    entry.grade_ids[row.type] = row.grade_id;
  }

  const components = findComponentsByYear(meta.yearId);
  const rows: GradeSummaryRow[] = [...byStudent.values()].map(entry => {
    const finalScore = computeFinalScore(entry.scores, components);
    return {
      student_id: entry.student_id,
      student_name: entry.student_name,
      nis: entry.nis,
      scores: entry.scores,
      grade_ids: entry.grade_ids,
      final_score: finalScore,
      kkm: meta.kkm,
      predikat: predikatOf(finalScore, meta.kkm),
      is_passed: isPassed(finalScore, meta.kkm),
    };
  });

  return { className: meta.className, subjectName: meta.subjectName, kkm: meta.kkm, components, rows };
};

export const getStudentGradeSummaries = (studentId: string): { published: boolean; summaries: SubjectGradeSummary[] } => {
  const published = getGradesPublicationForStudent(studentId);

  const meta = SQLite.get<{ yearId: string }>(
    `SELECT c.academic_year_id AS yearId FROM students st JOIN classes c ON c.id = st.class_id WHERE st.id = ? `,
    [studentId]
  );
  if (!meta) return { published, summaries: [] };

  const gradeRows = SQLite.all<{ subject_id: string; subject_name: string; kkm: number; type: string; score: number }>(
    `SELECT g.subject_id, s.name AS subject_name, s.kkm AS kkm, g.type, g.score
     FROM grades g
     JOIN subjects s ON s.id = g.subject_id
     WHERE g.student_id = ?
  ORDER BY s.name`,
    [studentId]
  );

  const components = findComponentsByYear(meta.yearId);
  const bySubject = new Map<string, SubjectGradeSummary>();
  for (const row of gradeRows) {
    let entry = bySubject.get(row.subject_id);
    if (!entry) {
      entry = {
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        kkm: row.kkm,
        scores: {},
        final_score: null,
        predikat: null,
        is_passed: null,
      };
      bySubject.set(row.subject_id, entry);
    }
    entry.scores[row.type] = row.score;
  }
  for (const entry of bySubject.values()) {
    entry.final_score = computeFinalScore(entry.scores, components);
    entry.predikat = predikatOf(entry.final_score, entry.kkm);
    entry.is_passed = isPassed(entry.final_score, entry.kkm);
  }

  return { published, summaries: [...bySubject.values()] };
};

export const findGradeProgressionByStudent = (studentId: string): StudentGradeProgression[] =>
  SQLite.many<StudentGradeProgression>`
    SELECT g.id, g.subject_id, s.name AS subject_name, g.type, g.score, g.date
    FROM grades g
    INNER JOIN subjects s ON s.id = g.subject_id
    WHERE g.student_id = ${studentId}
    ORDER BY g.date ASC, s.name ASC, g.type ASC, g.id ASC
  `;

export const getStudentContext = (studentId: string): { class_name: string; year_name: string } | null => {
  const row = SQLite.get<{ class_name: string; year_name: string }>(
    `SELECT c.name AS class_name, ay.name AS year_name
     FROM students st
     JOIN classes c ON c.id = st.class_id
     JOIN academic_years ay ON ay.id = c.academic_year_id
     WHERE st.id = ? `,
    [studentId]
  );
  return row ?? null;
};
