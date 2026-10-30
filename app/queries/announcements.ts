import SQLite from '@services/SQLite';
import type { Announcement } from '@types';
import type { AnnouncementView } from '../types/shared';
import { randomUUID } from 'crypto';

export const findAllAnnouncements = (): AnnouncementView[] =>
  SQLite.many<AnnouncementView>`
    SELECT a.id, a.title, a.body, u.name AS author_name, a.class_id, c.name AS class_name, a.due_date, a.created_at
    FROM announcements a
    JOIN users u ON u.id = a.author_user_id
    LEFT JOIN classes c ON c.id = a.class_id
    ORDER BY a.created_at DESC
  `;

export const findLatestAnnouncements = (limit: number): AnnouncementView[] =>
  SQLite.many<AnnouncementView>`
    SELECT a.id, a.title, a.body, u.name AS author_name, a.created_at
    FROM announcements a
    JOIN users u ON u.id = a.author_user_id
    WHERE a.class_id IS NULL
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `;

export const findClassTaskAnnouncementsByTeacher = (teacherUserId: string): AnnouncementView[] =>
  SQLite.many<AnnouncementView>`
    SELECT a.id, a.title, a.body, u.name AS author_name, a.class_id, c.name AS class_name, a.due_date, a.created_at
    FROM announcements a
    JOIN users u ON u.id = a.author_user_id
    JOIN classes c ON c.id = a.class_id
    WHERE a.author_user_id = ${teacherUserId} AND a.class_id IS NOT NULL
    ORDER BY a.created_at DESC
    LIMIT 100
  `;

export const findClassTaskAnnouncementsForParent = (parentUserId: string): AnnouncementView[] =>
  SQLite.many<AnnouncementView>`
    SELECT a.id, a.title, a.body, u.name AS author_name, a.class_id, c.name AS class_name,
      a.due_date, a.created_at, s.name AS child_name
    FROM announcements a
    JOIN classes c ON c.id = a.class_id
    JOIN students s ON s.class_id = c.id AND s.parent_user_id = ${parentUserId}
    JOIN users u ON u.id = a.author_user_id
    WHERE a.class_id IS NOT NULL
    ORDER BY a.created_at DESC
    LIMIT 100
  `;

export const createClassTaskAnnouncement = (data: {
  title: string;
  body: string;
  author_user_id: string;
  class_id: string;
  due_date: string | null;
}): Announcement => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO announcements (id, title, body, author_user_id, class_id, due_date, created_at, updated_at)
    VALUES (${id}, ${data.title}, ${data.body}, ${data.author_user_id}, ${data.class_id}, ${data.due_date}, ${now}, ${now})
  `;
  return findAnnouncementById(id)!;
};

export const findAnnouncementById = (id: string): Announcement | undefined =>
  SQLite.one<Announcement>`SELECT * FROM announcements WHERE id = ${id}`;

export const createAnnouncement = (data: { title: string; body: string; author_user_id: string }): Announcement => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO announcements (id, title, body, author_user_id, created_at, updated_at)
    VALUES (${id}, ${data.title}, ${data.body}, ${data.author_user_id}, ${now}, ${now})
  `;
  return findAnnouncementById(id)!;
};

export const updateAnnouncement = (id: string, data: Partial<Pick<Announcement, 'title' | 'body'>>): Announcement | undefined => {
  SQLite.update('announcements', { id }, data);
  return findAnnouncementById(id);
};

export const deleteAnnouncement = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM announcements WHERE id = ?', [id]);
  return result.changes > 0;
};
