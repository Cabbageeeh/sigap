import SQLite from '@services/SQLite';
import type { Student } from '@types';
import { randomUUID } from 'crypto';

export interface StudentListItem extends Student {
  parent_name: string | null;
  parent_username: string | null;
  parent_phone: string | null;
  parent_address: string | null;
}

export const findAllStudents = (): Student[] =>
  SQLite.many<Student>`SELECT * FROM students ORDER BY name`;

export const findStudentById = (id: string): Student | undefined =>
  SQLite.one<Student>`SELECT * FROM students WHERE id = ${id}`;

export const findAllNisOwners = (): { nis: string; name: string; class_name: string | null }[] =>
  SQLite.many<{ nis: string; name: string; class_name: string | null }>`
    SELECT s.nis, s.name, c.name AS class_name
    FROM students s LEFT JOIN classes c ON c.id = s.class_id
  `;

export const importStudents = (rows: { nis: string; name: string; class_id: string; phone: string | null; address: string | null }[]): { id: string; nis: string }[] => {
  const created: { id: string; nis: string }[] = [];
  SQLite.transaction(() => {
    const now = Date.now();
    for (const row of rows) {
      const id = randomUUID();
      SQLite.exec`
        INSERT INTO students (id, nis, name, class_id, parent_user_id, phone, address, created_at, updated_at)
        VALUES (${id}, ${row.nis}, ${row.name}, ${row.class_id}, ${null}, ${row.phone}, ${row.address}, ${now}, ${now})
      `;
      created.push({ id, nis: row.nis });
    }
  });
  return created;
};

export const findStudentsByClass = (classId: string): Student[] =>
  SQLite.many<Student>`SELECT * FROM students WHERE class_id = ${classId} ORDER BY name`;

export const findStudentsByParent = (parentUserId: string): Student[] =>
  SQLite.many<Student>`SELECT * FROM students WHERE parent_user_id = ${parentUserId} ORDER BY name`;

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

export const getStudentsPaginated = (page: number, limit: number, search = '', classId?: string): { data: StudentListItem[]; total: number } => {
  const pattern = `%${search.replace(/[%_]/g, '')}%`;
  const classClause = classId ? 'AND class_id = ?' : '';
  const countParams = classId ? [pattern, pattern, classId] : [pattern, pattern];
  const dataParams = classId ? [pattern, pattern, classId, limit, (page - 1) * limit] : [pattern, pattern, limit, (page - 1) * limit];

  const countRow = SQLite.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM students WHERE (nis LIKE ? OR name LIKE ?) ${classClause}`,
    countParams
  );

  const data = SQLite.all<StudentListItem>(
    `SELECT s.*, u.name AS parent_name, u.username AS parent_username,
       p.phone AS parent_phone, p.address AS parent_address
     FROM students s
     LEFT JOIN users u ON u.id = s.parent_user_id
     LEFT JOIN parents p ON p.user_id = s.parent_user_id
     WHERE (s.nis LIKE ? OR s.name LIKE ?) ${classId ? 'AND s.class_id = ?' : ''}
     ORDER BY s.name LIMIT ? OFFSET ?`,
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
  const current = findStudentById(id);
  if (!current) return undefined;

  SQLite.transaction(() => {
    if (data.nis !== undefined && data.nis !== current.nis && current.parent_user_id) {
      SQLite.run(
        `UPDATE users SET username = ?, updated_at = ?
         WHERE id = ? AND LOWER(username) = LOWER(?)`,
        [data.nis, Date.now(), current.parent_user_id, current.nis],
      );
    }
    SQLite.update('students', { id }, data);
  });
  return findStudentById(id);
};

export const deleteStudent = (id: string): boolean => {
  const current = findStudentById(id);
  if (!current) return false;

  return SQLite.transaction(() => {
    const result = SQLite.run('DELETE FROM students WHERE id = ?', [id]);
    if (!current.parent_user_id) return result.changes > 0;

    const remaining = SQLite.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM students WHERE parent_user_id = ?',
      [current.parent_user_id],
    )?.count ?? 0;
    if (remaining === 0) {
      SQLite.run('DELETE FROM users WHERE id = ?', [current.parent_user_id]);
      return result.changes > 0;
    }

    const parentUser = SQLite.get<{ username: string }>('SELECT username FROM users WHERE id = ?', [current.parent_user_id]);
    if (parentUser?.username.toLowerCase() === current.nis.toLowerCase()) {
      const nextLogin = SQLite.get<{ nis: string }>(
        `SELECT s.nis
         FROM students s
         WHERE s.parent_user_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM users u
             WHERE LOWER(u.username) = LOWER(s.nis) AND u.id != ?
           )
         ORDER BY s.nis
         LIMIT 1`,
        [current.parent_user_id, current.parent_user_id],
      );
      if (nextLogin) {
        SQLite.run(
          'UPDATE users SET username = ?, updated_at = ? WHERE id = ?',
          [nextLogin.nis, Date.now(), current.parent_user_id],
        );
      }
    }

    return result.changes > 0;
  });
};

export const deleteStudents = (ids: string[]): number => {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = SQLite.run(`DELETE FROM students WHERE id IN (${placeholders})`, ids);
  return result.changes;
};
