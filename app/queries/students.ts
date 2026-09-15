import SQLite from '@services/SQLite';
import type { Student } from '@types';
import { randomUUID } from 'crypto';

export const findAllStudents = (): Student[] =>
  SQLite.many<Student>`SELECT * FROM students ORDER BY name`;

export const findStudentById = (id: string): Student | undefined =>
  SQLite.one<Student>`SELECT * FROM students WHERE id = ${id}`;

export const findAllNis = (): string[] =>
  SQLite.many<{ nis: string }>`SELECT nis FROM students`.map(row => row.nis);

export const importStudents = (rows: { nis: string; name: string; class_id: string; phone: string | null; address: string | null }[]): void => {
  SQLite.transaction(() => {
    const now = Date.now();
    for (const row of rows) {
      SQLite.exec`
        INSERT INTO students (id, nis, name, class_id, parent_user_id, phone, address, created_at, updated_at)
        VALUES (${randomUUID()}, ${row.nis}, ${row.name}, ${row.class_id}, ${null}, ${row.phone}, ${row.address}, ${now}, ${now})
      `;
    }
  });
};

export const findStudentsByClass = (classId: string): Student[] =>
  SQLite.many<Student>`SELECT * FROM students WHERE class_id = ${classId} ORDER BY name`;

export const findStudentsByParent = (parentUserId: string): Student[] =>
  SQLite.many<Student>`SELECT * FROM students WHERE parent_user_id = ${parentUserId} ORDER BY name`;

export const findStudentsForParentSelect = (): Array<Student & { class_name: string | null }> =>
  SQLite.many<Student & { class_name: string | null }>`
    SELECT s.*, c.name AS class_name
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    ORDER BY s.name
  `;

export const linkStudentToParent = (studentId: string, parentUserId: string): void => {
  SQLite.exec`UPDATE students SET parent_user_id = ${parentUserId}, updated_at = ${Date.now()} WHERE id = ${studentId}`;
};

export const syncStudentsForParent = (parentUserId: string, studentIds: string[]): void => {
  SQLite.transaction(() => {
    SQLite.run(
      `UPDATE students SET parent_user_id = NULL, updated_at = ? WHERE parent_user_id = ?`,
      [Date.now(), parentUserId]
    );
    for (const studentId of studentIds) {
      SQLite.run(
        `UPDATE students SET parent_user_id = ?, updated_at = ? WHERE id = ?`,
        [parentUserId, Date.now(), studentId]
      );
    }
  });
};
export const findStudentsByTeacherUser = (teacherUserId: string): Student[] =>
  SQLite.many<Student>`
    SELECT DISTINCT st.*
    FROM students st
    INNER JOIN classes c ON c.id = st.class_id
    INNER JOIN teacher_class_assignments tca
      ON tca.class_id = c.id AND tca.academic_year_id = c.academic_year_id
    INNER JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.user_id = ${teacherUserId}
    ORDER BY st.name
  `;

export const searchStudents = (search: string, classId?: string): Student[] => {
  const pattern = `%${search.replace(/[%_]/g, '')}%`;
  const classClause = classId ? 'AND class_id = ?' : '';
  const params = classId ? [pattern, pattern, classId] : [pattern, pattern];
  return SQLite.all<Student>(
    `SELECT * FROM students WHERE (nis LIKE ? OR name LIKE ?) ${classClause} ORDER BY name`,
    params
  );
};

export const getStudentsPaginated = (page: number, limit: number, search = '', classId?: string): { data: Student[]; total: number } => {
  const pattern = `%${search.replace(/[%_]/g, '')}%`;
  const classClause = classId ? 'AND class_id = ?' : '';
  const countParams = classId ? [pattern, pattern, classId] : [pattern, pattern];
  const dataParams = classId ? [pattern, pattern, classId, limit, (page - 1) * limit] : [pattern, pattern, limit, (page - 1) * limit];

  const countRow = SQLite.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM students WHERE (nis LIKE ? OR name LIKE ?) ${classClause}`,
    countParams
  );

  const data = SQLite.all<Student>(
    `SELECT * FROM students WHERE (nis LIKE ? OR name LIKE ?) ${classClause} ORDER BY name LIMIT ? OFFSET ?`,
    dataParams
  );

  return { data, total: countRow?.count ?? 0 };
};

export const createStudent = (data: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Student => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO students (id, nis, name, class_id, parent_user_id, phone, address, created_at, updated_at)
    VALUES (${id}, ${data.nis}, ${data.name}, ${data.class_id}, ${data.parent_user_id ?? null}, ${data.phone ?? null}, ${data.address ?? null}, ${now}, ${now})
  `;
  return findStudentById(id)!;
};

export const updateStudent = (id: string, data: Partial<Omit<Student, 'id' | 'created_at'>>): Student | undefined => {
  SQLite.update('students', { id }, data);
  return findStudentById(id);
};

export const deleteStudent = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM students WHERE id = ?', [id]);
  return result.changes > 0;
};

export const deleteStudents = (ids: string[]): number => {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = SQLite.run(`DELETE FROM students WHERE id IN (${placeholders})`, ids);
  return result.changes;
};
