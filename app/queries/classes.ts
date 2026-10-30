import SQLite from '@services/SQLite';
import type { Class } from '@types';
import { randomUUID } from 'crypto';

export interface ClassWithHomeroom extends Class {
  homeroom_teacher_name: string | null;
  homeroom_teacher_username: string | null;
  student_count: number;
}

export const findAllClasses = (): Class[] =>
  SQLite.many<Class>`SELECT * FROM classes ORDER BY grade, name`;

export const findAllClassesWithHomeroom = (): ClassWithHomeroom[] =>
  SQLite.many<ClassWithHomeroom>`
    SELECT c.*,
           u.name AS homeroom_teacher_name,
           u.username AS homeroom_teacher_username,
           COUNT(DISTINCT s.id) AS student_count
    FROM classes c
    LEFT JOIN teacher_class_assignments tca
      ON tca.class_id = c.id AND tca.academic_year_id = c.academic_year_id AND tca.is_homeroom = 1
    LEFT JOIN teachers t ON t.id = tca.teacher_id
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN students s ON s.class_id = c.id
    GROUP BY c.id, u.name, u.username
    ORDER BY c.grade, c.name
  `;

export const findClassesByAcademicYearWithHomeroom = (academicYearId: string): ClassWithHomeroom[] =>
  SQLite.many<ClassWithHomeroom>`
    SELECT c.*,
           u.name AS homeroom_teacher_name,
           u.username AS homeroom_teacher_username,
           COUNT(DISTINCT s.id) AS student_count
    FROM classes c
    LEFT JOIN teacher_class_assignments tca
      ON tca.class_id = c.id AND tca.academic_year_id = c.academic_year_id AND tca.is_homeroom = 1
    LEFT JOIN teachers t ON t.id = tca.teacher_id
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN students s ON s.class_id = c.id
    WHERE c.academic_year_id = ${academicYearId}
    GROUP BY c.id, u.name, u.username
    ORDER BY c.grade, c.name
  `;

export const findClassById = (id: string): Class | undefined =>
  SQLite.one<Class>`SELECT * FROM classes WHERE id = ${id}`;

export const findClassByName = (name: string): Class | undefined =>
  SQLite.one<Class>`SELECT * FROM classes WHERE name = ${name}`;

export const findClassesByAcademicYear = (academicYearId: string): Class[] =>
  SQLite.many<Class>`SELECT * FROM classes WHERE academic_year_id = ${academicYearId} ORDER BY grade, name`;

export const findClassesByGrade = (grade: string): Class[] =>
  SQLite.many<Class>`SELECT * FROM classes WHERE grade = ${grade} ORDER BY name`;
export const findClassesByTeacherUser = (teacherUserId: string): Class[] =>
  SQLite.many<Class>`
    SELECT DISTINCT c.*
    FROM classes c
    INNER JOIN teacher_class_assignments tca
      ON tca.class_id = c.id AND tca.academic_year_id = c.academic_year_id
    INNER JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.user_id = ${teacherUserId}
    ORDER BY c.academic_year_id DESC, c.grade, c.name
  `;

export const findActiveClassesByTeacherUser = (teacherUserId: string): Class[] =>
  SQLite.many<Class>`
    SELECT DISTINCT c.*
    FROM classes c
    INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = 1
    INNER JOIN teacher_class_assignments tca ON tca.class_id = c.id AND tca.academic_year_id = c.academic_year_id
    INNER JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.user_id = ${teacherUserId}
    ORDER BY c.grade, c.name
  `;

export const createClass = (data: Omit<Class, 'id' | 'created_at' | 'updated_at'>): Class => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO classes (id, name, grade, academic_year_id, created_at, updated_at)
    VALUES (${id}, ${data.name}, ${data.grade}, ${data.academic_year_id}, ${now}, ${now})
  `;
  return findClassById(id)!;
};

export const updateClass = (id: string, data: Partial<Omit<Class, 'id' | 'created_at'>>): Class | undefined => {
  SQLite.update('classes', { id }, data);
  return findClassById(id);
};

export const deleteClass = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM classes WHERE id = ?', [id]);
  return result.changes > 0;
};

export const deleteClasses = (ids: string[]): number => {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = SQLite.run(`DELETE FROM classes WHERE id IN (${placeholders})`, ids);
  return result.changes;
};
