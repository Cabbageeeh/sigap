// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { readdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { up as addRemedialScore, down as removeRemedialScore } from '../../migrations/20261025000001_add_remedial_scores';

vi.mock('better-sqlite3', async importOriginal => {
  const { default: Database } = await importOriginal<typeof import('better-sqlite3')>();
  return { default: function createMemoryDatabase() { return new Database(':memory:'); } };
});

import SQLite from '../../app/services/SQLite';
import { upsertGradesBulk, getClassSubjectSummary, getStudentGradeSummaries, findGradeByUniqueKey } from '../../app/queries/grades';
import { saveEraporGradeChanges, saveEraporTemplateSetup, saveEraporColumnMappings } from '../../app/queries/eraporGrades';
import { logGradeChange, getGradeAuditLogsPaginated } from '../../app/queries/gradeAuditLogs';
import { BulkGradesSchema } from '../../app/validators/schemas';

const db = SQLite.raw();

beforeAll(async () => {
  for (const file of readdirSync('migrations').filter(file => file.endsWith('.ts')).sort()) {
    const migration = await import('../../migrations/' + file);
    if (typeof migration.up === 'string') db.exec(migration.up);
    else migration.up(SQLite);
  }
  db.exec(`
    INSERT INTO users (id, username, name, password) VALUES ('teacher', 'guru', 'Guru', 'test');
    INSERT INTO academic_years (id, name, start_at, end_at, is_active, is_grades_published) VALUES ('year', '2026/2027', 1, 2, 1, 1);
    INSERT INTO classes (id, name, grade, academic_year_id) VALUES ('class', '7A', '7', 'year');
    INSERT INTO subjects (id, name, code, kkm) VALUES ('subject', 'Matematika', 'MTK', 75);
    INSERT INTO students (id, nis, name, class_id) VALUES ('student', '001', 'Siswa', 'class');
    INSERT INTO grade_components (id, academic_year_id, type, name, weight) VALUES ('component', 'year', 'task', 'Tugas', 100);
  `);
});
beforeEach(() => db.exec('DELETE FROM grade_audit_logs; DELETE FROM grades; DELETE FROM erapor_grade_templates;'));
afterAll(() => SQLite.close());

const save = (remedial_score?: number | null) => upsertGradesBulk('class', 'subject', 'task', [
  { student_id: 'student', initial_score: 45, remedial_score, score: 75 },
], 'teacher');

describe('separate initial and remedial scores', () => {
  it('adds and rolls back the new field without changing legacy scores or inventing a remedial result', () => {
    const legacy = new Database(':memory:');
    try {
      legacy.exec(`CREATE TABLE grades (score REAL, initial_score REAL);
        CREATE TABLE grade_audit_logs (id TEXT);
        INSERT INTO grades (score, initial_score) VALUES (75, 45);`);
      legacy.exec(addRemedialScore);
      expect(legacy.prepare('SELECT * FROM grades').get()).toEqual({ score: 75, initial_score: 45, remedial_score: null });
      legacy.exec(removeRemedialScore);
      expect(legacy.prepare('SELECT * FROM grades').get()).toEqual({ score: 75, initial_score: 45 });
    } finally { legacy.close(); }
  });

  it('keeps the original, remedial and teacher-selected final score distinct in parent and teacher summaries', () => {
    save(80);
    const grade = findGradeByUniqueKey('student', 'subject', 'class', 'task');
    expect(grade).toMatchObject({ initial_score: 45, remedial_score: 80, score: 75 });
    const teacher = getClassSubjectSummary('class', 'subject', 'teacher')!.rows[0];
    const parent = getStudentGradeSummaries('student').summaries[0];
    for (const result of [teacher, parent]) {
      expect(result.initial_scores.task).toBe(45);
      expect(result.remedial_scores.task).toBe(80);
      expect(result.scores.task).toBe(75);
      expect(result.final_score).toBe(75);
    }
  });

  it('does not infer a remedial score when none was entered', () => {
    save();
    expect(findGradeByUniqueKey('student', 'subject', 'class', 'task')?.remedial_score).toBeNull();
  });

  it('preserves an omitted remedial field, accepts zero, and clears only an explicit null', () => {
    save(0);
    expect(save()).toEqual([]);
    expect(findGradeByUniqueKey('student', 'subject', 'class', 'task')?.remedial_score).toBe(0);
    const [change] = save(null);
    expect(change).toMatchObject({ old_remedial_score: 0, new_remedial_score: null });
    expect(findGradeByUniqueKey('student', 'subject', 'class', 'task')?.initial_score).toBe(45);
  });

  it('keeps initial and remedial scores when e-Rapor updates the final score', () => {
    save(80);
    const [change] = saveEraporGradeChanges([{ student_id: 'student', subject_id: 'subject', class_id: 'class', type: 'task', score: 78 }], 'teacher');
    expect(change).toMatchObject({ old_remedial_score: 80, new_remedial_score: 80 });
    expect(findGradeByUniqueKey('student', 'subject', 'class', 'task')).toMatchObject({ initial_score: 45, remedial_score: 80, score: 78 });
  });

  it('transfers all three values when a direct e-Rapor column is mapped to a component', () => {
    upsertGradesBulk('class', 'subject', 'erapor_s1_1', [{ student_id: 'student', initial_score: 45, remedial_score: 80, score: 75 }], 'teacher');
    const template = saveEraporTemplateSetup({ academic_year_id: 'year', class_id: 'class', subject_id: 'subject', semester: 1, mapel_id: '68', template_html: '<table></table>', source_file_name: 'rapor.xls', created_by: 'teacher', mappings: [] });
    saveEraporColumnMappings(template.id, [{ external_id: '1', source_component_type: 'task', direct_grade_type: 'erapor_s1_1', column_label: 'Sumatif 1' }], { user_id: 'teacher', user_name: 'Guru' });
    expect(findGradeByUniqueKey('student', 'subject', 'class', 'task')).toMatchObject({ initial_score: 45, remedial_score: 80, score: 75 });
  });

  it('records remedial-only changes and rejects scores outside 0–100', () => {
    save(70);
    const [change] = save(80);
    logGradeChange({ ...change, subject_id: 'subject', class_id: 'class', type: 'task', user_id: 'teacher' });
    expect(getGradeAuditLogsPaginated(1, 10).data[0]).toMatchObject({ old_remedial_score: 70, new_remedial_score: 80 });
    expect(() => save(101)).toThrow();
    expect(findGradeByUniqueKey('student', 'subject', 'class', 'task')?.remedial_score).toBe(80);
    const id = '00000000-0000-4000-8000-000000000001';
    expect(BulkGradesSchema.safeParse({ class_id: id, subject_id: id, type: 'task', entries: [{ student_id: id, score: 75, initial_score: 45, remedial_score: -1 }] }).success).toBe(false);
  });
});
