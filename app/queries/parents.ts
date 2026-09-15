import SQLite from '@services/SQLite';
import type { Parent } from '@types';
import { randomUUID } from 'crypto';

export const findAllParents = (): Parent[] =>
  SQLite.many<Parent>`SELECT * FROM parents ORDER BY created_at DESC`;

export const findParentById = (id: string): Parent | undefined =>
  SQLite.one<Parent>`SELECT * FROM parents WHERE id = ${id}`;

export const findParentByUserId = (userId: string): Parent | undefined =>
  SQLite.one<Parent>`SELECT * FROM parents WHERE user_id = ${userId}`;

export interface ParentListItem extends Parent {
  user_name: string | null;
  user_username: string;
  student_count: number;
}

export interface ParentAccountView {
  id: string;
  user_id: string;
  name: string | null;
  username: string;
  phone: string | null;
  address: string | null;
  student_count: number;
}

export const getParentsPaginated = (page: number, limit: number, search = ''): { data: ParentListItem[]; total: number } => {
  const pattern = `%${search.replace(/[%_]/g, '')}%`;
  const countRow = SQLite.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM parents p
     INNER JOIN users u ON p.user_id = u.id
     WHERE u.name LIKE ? OR p.phone LIKE ?`,
    [pattern, pattern]
  );
  const data = SQLite.all<ParentListItem>(
    `SELECT p.*, u.name AS user_name, u.username AS user_username,
       (SELECT COUNT(*) FROM students s WHERE s.parent_user_id = p.user_id) AS student_count
     FROM parents p
     INNER JOIN users u ON p.user_id = u.id
     WHERE u.name LIKE ? OR p.phone LIKE ?
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [pattern, pattern, limit, (page - 1) * limit]
  );
  return { data, total: countRow?.count ?? 0 };
};

export const findParentAccountByStudentId = (studentId: string): ParentAccountView | undefined =>
  SQLite.get<ParentAccountView>(
    `SELECT p.id, p.user_id, u.name, u.username, p.phone, p.address,
       (SELECT COUNT(*) FROM students linked WHERE linked.parent_user_id = p.user_id) AS student_count
     FROM students s
     INNER JOIN parents p ON p.user_id = s.parent_user_id
     INNER JOIN users u ON u.id = p.user_id
     WHERE s.id = ?`,
    [studentId],
  );

export const findParentAccountOptions = (): ParentAccountView[] =>
  SQLite.all<ParentAccountView>(
    `SELECT p.id, p.user_id, u.name, u.username, p.phone, p.address,
       (SELECT COUNT(*) FROM students s WHERE s.parent_user_id = p.user_id) AS student_count
     FROM parents p
     INNER JOIN users u ON u.id = p.user_id
     ORDER BY COALESCE(u.name, u.username)`,
  );

export const createParentAccountForStudent = (data: {
  student_id: string;
  username: string;
  name: string;
  password_hash: string;
  phone: string | null;
  address: string | null;
}): ParentAccountView => {
  const userId = randomUUID();
  const parentId = randomUUID();
  const now = Date.now();

  SQLite.transaction(() => {
    const parentRole = SQLite.get<{ id: string }>('SELECT id FROM roles WHERE slug = ?', ['parent']);
    if (!parentRole) throw new Error('PARENT_ROLE_NOT_FOUND');

    SQLite.run(
      `INSERT INTO users (id, name, username, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, data.name, data.username, data.password_hash, now, now],
    );
    SQLite.run(
      'INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)',
      [randomUUID(), userId, parentRole.id, now],
    );
    SQLite.run(
      `INSERT INTO parents (id, user_id, phone, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [parentId, userId, data.phone, data.address, now, now],
    );
    SQLite.run(
      'UPDATE students SET parent_user_id = ?, updated_at = ? WHERE id = ?',
      [userId, now, data.student_id],
    );
  });

  return findParentAccountByStudentId(data.student_id)!;
};

export const linkParentAccountToStudent = (studentId: string, parentUserId: string): ParentAccountView => {
  SQLite.run(
    'UPDATE students SET parent_user_id = ?, updated_at = ? WHERE id = ?',
    [parentUserId, Date.now(), studentId],
  );
  return findParentAccountByStudentId(studentId)!;
};

export const updateParentAccountForStudent = (studentId: string, data: {
  name?: string;
  password_hash?: string;
  phone?: string | null;
  address?: string | null;
}): ParentAccountView | undefined => {
  const account = findParentAccountByStudentId(studentId);
  if (!account) return undefined;

  SQLite.transaction(() => {
    const userFields: Record<string, unknown> = {};
    if (data.name !== undefined) userFields.name = data.name;
    if (data.password_hash !== undefined) userFields.password = data.password_hash;
    if (Object.keys(userFields).length > 0) SQLite.update('users', { id: account.user_id }, userFields);

    const parentFields: Record<string, unknown> = {};
    if (data.phone !== undefined) parentFields.phone = data.phone;
    if (data.address !== undefined) parentFields.address = data.address;
    if (Object.keys(parentFields).length > 0) SQLite.update('parents', { user_id: account.user_id }, parentFields);
  });

  return findParentAccountByStudentId(studentId);
};

export const removeParentAccountFromStudent = (studentId: string): { deletedAccount: boolean } | undefined => {
  const account = findParentAccountByStudentId(studentId);
  if (!account) return undefined;
  const student = SQLite.get<{ nis: string }>('SELECT nis FROM students WHERE id = ?', [studentId]);

  let deletedAccount = false;
  SQLite.transaction(() => {
    const now = Date.now();
    SQLite.run('UPDATE students SET parent_user_id = NULL, updated_at = ? WHERE id = ?', [now, studentId]);
    const remaining = SQLite.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM students WHERE parent_user_id = ?',
      [account.user_id],
    )?.count ?? 0;
    if (remaining === 0) {
      SQLite.run('DELETE FROM users WHERE id = ?', [account.user_id]);
      deletedAccount = true;
    } else if (student && account.username.toLowerCase() === student.nis.toLowerCase()) {
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
        [account.user_id, account.user_id],
      );
      if (nextLogin) {
        SQLite.run(
          'UPDATE users SET username = ?, updated_at = ? WHERE id = ?',
          [nextLogin.nis, now, account.user_id],
        );
      }
    }
  });

  return { deletedAccount };
};
