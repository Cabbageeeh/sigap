import SQLite from '@services/SQLite';
import type { EraporColumnMapping, EraporGradeTemplate, EraporStudentMapping, Grade } from '@types';
import { randomUUID } from 'crypto';

export interface EraporTemplateSetup {
  academic_year_id: string;
  class_id: string;
  subject_id: string;
  semester: 1 | 2;
  mapel_id: string;
  template_html: string;
  source_file_name: string;
  created_by: string;
  mappings: Array<{ student_id: string; external_member_id: string }>;
}

export const findEraporGradeTemplate = (classId: string, subjectId: string, semester: number): EraporGradeTemplate | undefined =>
  SQLite.one<EraporGradeTemplate>`
    SELECT * FROM erapor_grade_templates
    WHERE class_id = ${classId} AND subject_id = ${subjectId} AND semester = ${semester}
  `;

export const findEraporStudentMappings = (classId: string): EraporStudentMapping[] =>
  SQLite.many<EraporStudentMapping>`SELECT * FROM erapor_student_mappings WHERE class_id = ${classId}`;

export const findEraporGradeTemplatesByClass = (classId: string): EraporGradeTemplate[] =>
  SQLite.many<EraporGradeTemplate>`SELECT * FROM erapor_grade_templates WHERE class_id = ${classId} ORDER BY subject_id, semester`;

export const findEraporColumnMappings = (templateId: string): EraporColumnMapping[] =>
  SQLite.many<EraporColumnMapping>`SELECT * FROM erapor_column_mappings WHERE template_id = ${templateId}`;

export const findEraporColumnMappingsByClassSubject = (classId: string, subjectId: string): Array<{ semester: number; source_component_type: string | null }> =>
  SQLite.many<{ semester: number; source_component_type: string | null }>`
    SELECT t.semester, m.source_component_type
    FROM erapor_column_mappings m
    JOIN erapor_grade_templates t ON t.id = m.template_id
    WHERE t.class_id = ${classId} AND t.subject_id = ${subjectId}
  `;

export const saveEraporTemplateSetup = (data: EraporTemplateSetup): EraporGradeTemplate => SQLite.transaction(() => {
  const now = Date.now();
  const existing = findEraporGradeTemplate(data.class_id, data.subject_id, data.semester);
  const id = existing?.id ?? randomUUID();
  if (existing) {
    SQLite.run(
      `UPDATE erapor_grade_templates
       SET academic_year_id = ?, mapel_id = ?, template_html = ?, source_file_name = ?, created_by = ?, updated_at = ?
       WHERE id = ?`,
      [data.academic_year_id, data.mapel_id, data.template_html, data.source_file_name, data.created_by, now, id],
    );
  } else {
    SQLite.run(
      `INSERT INTO erapor_grade_templates
       (id, academic_year_id, class_id, subject_id, semester, mapel_id, template_html, source_file_name, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.academic_year_id, data.class_id, data.subject_id, data.semester, data.mapel_id, data.template_html, data.source_file_name, data.created_by, now, now],
    );
  }

  SQLite.run('DELETE FROM erapor_student_mappings WHERE class_id = ?', [data.class_id]);
  for (const mapping of data.mappings) {
    SQLite.run(
      `INSERT INTO erapor_student_mappings (id, class_id, student_id, external_member_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (class_id, student_id) DO UPDATE SET external_member_id = excluded.external_member_id, updated_at = excluded.updated_at`,
      [randomUUID(), data.class_id, mapping.student_id, mapping.external_member_id, now, now],
    );
  }

  return findEraporGradeTemplate(data.class_id, data.subject_id, data.semester)!;
});

export interface EraporGradeChangeInput {
  student_id: string;
  subject_id: string;
  class_id: string;
  type: string;
  score: number | null;
}

export interface EraporGradeChange {
  grade_id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  type: string;
  action: 'create' | 'update' | 'delete';
  old_score: number | null;
  new_score: number | null;
}

export interface EraporColumnMappingInput {
  external_id: string;
  source_component_type: string | null;
  direct_grade_type: string;
}

export const saveEraporColumnMappings = (
  templateId: string,
  mappings: EraporColumnMappingInput[],
): EraporGradeChange[] => SQLite.transaction(() => {
  const template = SQLite.one<{ class_id: string; subject_id: string }>`
    SELECT class_id, subject_id FROM erapor_grade_templates WHERE id = ${templateId}
  `;
  if (!template) throw new Error('Template e-Rapor tidak ditemukan.');

  const now = Date.now();
  const transferred: EraporGradeChange[] = [];
  for (const mapping of mappings) {
    if (!mapping.source_component_type) continue;
    const directGrades = SQLite.many<Grade>`
      SELECT * FROM grades
      WHERE class_id = ${template.class_id} AND subject_id = ${template.subject_id} AND type = ${mapping.direct_grade_type}
    `;
    for (const grade of directGrades) {
      const existingSource = SQLite.one<Grade>`
        SELECT * FROM grades
        WHERE student_id = ${grade.student_id} AND subject_id = ${grade.subject_id}
          AND class_id = ${grade.class_id} AND type = ${mapping.source_component_type}
      `;
      if (existingSource) continue;
      const id = randomUUID();
      SQLite.run(
        `INSERT INTO grades (id, student_id, subject_id, class_id, type, score, date, teacher_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, grade.student_id, grade.subject_id, grade.class_id, mapping.source_component_type, grade.score, grade.date, grade.teacher_user_id, now, now],
      );
      transferred.push({
        grade_id: id,
        student_id: grade.student_id,
        subject_id: grade.subject_id,
        class_id: grade.class_id,
        type: mapping.source_component_type,
        action: 'create',
        old_score: null,
        new_score: grade.score,
      });
    }
  }

  SQLite.run('DELETE FROM erapor_column_mappings WHERE template_id = ?', [templateId]);
  for (const mapping of mappings) {
    SQLite.run(
      `INSERT INTO erapor_column_mappings (id, template_id, external_id, source_component_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), templateId, mapping.external_id, mapping.source_component_type, now, now],
    );
  }
  return transferred;
});

export const saveEraporGradeChanges = (
  changes: EraporGradeChangeInput[],
  teacherUserId: string,
): EraporGradeChange[] => SQLite.transaction(() => {
  const now = Date.now();
  const results: EraporGradeChange[] = [];
  for (const change of changes) {
    const existing = SQLite.one<Grade>`
      SELECT * FROM grades
      WHERE student_id = ${change.student_id} AND subject_id = ${change.subject_id}
        AND class_id = ${change.class_id} AND type = ${change.type}
    `;
    if (change.score === null) {
      if (!existing) continue;
      SQLite.run('DELETE FROM grades WHERE id = ?', [existing.id]);
      results.push({ ...change, grade_id: existing.id, action: 'delete', old_score: existing.score, new_score: null });
      continue;
    }
    if (existing?.score === change.score) continue;
    if (existing) {
      SQLite.run('UPDATE grades SET score = ?, date = ?, teacher_user_id = ?, updated_at = ? WHERE id = ?', [change.score, now, teacherUserId, now, existing.id]);
      results.push({ ...change, grade_id: existing.id, action: 'update', old_score: existing.score, new_score: change.score });
      continue;
    }
    const id = randomUUID();
    SQLite.run(
      `INSERT INTO grades (id, student_id, subject_id, class_id, type, score, date, teacher_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, change.student_id, change.subject_id, change.class_id, change.type, change.score, now, teacherUserId, now, now],
    );
    results.push({ ...change, grade_id: id, action: 'create', old_score: null, new_score: change.score });
  }
  return results;
});
