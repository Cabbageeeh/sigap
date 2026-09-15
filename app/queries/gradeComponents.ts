import SQLite from '@services/SQLite';
import type { GradeComponent } from '@types';
import { randomUUID } from 'crypto';

export const findGradeComponentsByYear = (academicYearId: string): GradeComponent[] =>
  SQLite.many<GradeComponent>`SELECT * FROM grade_components WHERE academic_year_id = ${academicYearId} ORDER BY weight DESC, type`;

export const upsertGradeComponents = (academicYearId: string, items: { type: string; name: string; weight: number }[]): void => {
  SQLite.transaction(() => {
    for (const item of items) {
      SQLite.run(
        `INSERT INTO grade_components (id, academic_year_id, type, name, weight, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (academic_year_id, type) DO UPDATE SET name = excluded.name, weight = excluded.weight, updated_at = excluded.updated_at`,
        [randomUUID(), academicYearId, item.type, item.name, item.weight, Date.now(), Date.now()]
      );
    }
  });
};

export const addGradeComponent = (academicYearId: string, type: string, name: string, weight = 0): void => {
  SQLite.run(
    `INSERT INTO grade_components (id, academic_year_id, type, name, weight, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (academic_year_id, type) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
    [randomUUID(), academicYearId, type, name, weight, Date.now(), Date.now()]
  );
};

export const findGradeComponent = (academicYearId: string, type: string): GradeComponent | undefined =>
  SQLite.one<GradeComponent>`SELECT * FROM grade_components WHERE academic_year_id = ${academicYearId} AND type = ${type}`;

export const renameGradeComponent = (academicYearId: string, type: string, name: string): void => {
  SQLite.run(
    `UPDATE grade_components SET name = ?, updated_at = ? WHERE academic_year_id = ? AND type = ?`,
    [name, Date.now(), academicYearId, type]
  );
};

export const deleteGradeComponent = (academicYearId: string, type: string): number => {
  return SQLite.transaction(() => {
    const removed = SQLite.run(
      `DELETE FROM grades WHERE type = ? AND class_id IN (SELECT id FROM classes WHERE academic_year_id = ?)`,
      [type, academicYearId]
    ).changes;
    SQLite.run(
      `DELETE FROM grade_components WHERE academic_year_id = ? AND type = ?`,
      [academicYearId, type]
    );
    return removed;
  });
};
