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

export const createParent = (data: Omit<Parent, 'id' | 'created_at' | 'updated_at'>): Parent => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO parents (id, user_id, phone, address, created_at, updated_at)
    VALUES (${id}, ${data.user_id}, ${data.phone ?? null}, ${data.address ?? null}, ${now}, ${now})
  `;
  return findParentById(id)!;
};

export const updateParent = (id: string, data: Partial<Omit<Parent, 'id' | 'created_at'>>): Parent | undefined => {
  SQLite.update('parents', { id }, data);
  return findParentById(id);
};

export const deleteParent = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM parents WHERE id = ?', [id]);
  return result.changes > 0;
};
