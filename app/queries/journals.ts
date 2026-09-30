import SQLite from '@services/SQLite';
import type { Journal } from '@types';
import { randomUUID } from 'crypto';

export interface JournalWithNames extends Journal {
  class_name: string;
  subject_name: string;
}

export const findAllJournals = (): JournalWithNames[] =>
  SQLite.many<JournalWithNames>`
    SELECT j.*, c.name AS class_name, sub.name AS subject_name FROM journals j
    INNER JOIN schedules s ON j.schedule_id = s.id
    INNER JOIN classes c ON c.id = s.class_id
    INNER JOIN subjects sub ON sub.id = s.subject_id
    ORDER BY j.date DESC
  `;

export const findJournalById = (id: string): Journal | undefined =>
  SQLite.one<Journal>`SELECT * FROM journals WHERE id = ${id}`;

export const findJournalsBySchedule = (scheduleId: string): Journal[] =>
  SQLite.many<Journal>`SELECT * FROM journals WHERE schedule_id = ${scheduleId} ORDER BY date DESC`;

export const findJournalByScheduleAndDate = (scheduleId: string, dayStart: number, dayEnd: number): Journal | undefined =>
  SQLite.one<Journal>`SELECT * FROM journals WHERE schedule_id = ${scheduleId} AND date >= ${dayStart} AND date <= ${dayEnd}`;

export const findJournalsByTeacher = (teacherUserId: string): JournalWithNames[] =>
  SQLite.many<JournalWithNames>`
    SELECT j.*, c.name AS class_name, sub.name AS subject_name FROM journals j
    INNER JOIN schedules s ON j.schedule_id = s.id
    INNER JOIN classes c ON c.id = s.class_id
    INNER JOIN subjects sub ON sub.id = s.subject_id
    WHERE s.teacher_user_id = ${teacherUserId}
    ORDER BY j.date DESC
  `;

export const findJournalsByDateRange = (start: number, end: number): Journal[] =>
  SQLite.many<Journal>`SELECT * FROM journals WHERE date >= ${start} AND date <= ${end} ORDER BY date DESC`;

export interface JournalReportRow extends JournalWithNames {
  teacher_name: string;
  start_time: number;
  end_time: number;
}

// Journals joined with the lesson they describe, for the teaching-log export.
export const findJournalReportRows = (
  from: number,
  to: number,
  teacherUserId?: string,
): JournalReportRow[] =>
  teacherUserId
    ? SQLite.all<JournalReportRow>(
      `SELECT j.*, c.name AS class_name, sub.name AS subject_name,
              COALESCE(u.name, u.username) AS teacher_name, s.start_time, s.end_time
       FROM journals j
       INNER JOIN schedules s ON j.schedule_id = s.id
       INNER JOIN classes c ON c.id = s.class_id
       INNER JOIN subjects sub ON sub.id = s.subject_id
       INNER JOIN users u ON u.id = s.teacher_user_id
       WHERE s.teacher_user_id = ? AND j.date >= ? AND j.date <= ?
       ORDER BY j.date, s.start_time`,
      [teacherUserId, from, to],
    )
    : SQLite.all<JournalReportRow>(
      `SELECT j.*, c.name AS class_name, sub.name AS subject_name,
              COALESCE(u.name, u.username) AS teacher_name, s.start_time, s.end_time
       FROM journals j
       INNER JOIN schedules s ON j.schedule_id = s.id
       INNER JOIN classes c ON c.id = s.class_id
       INNER JOIN subjects sub ON sub.id = s.subject_id
       INNER JOIN users u ON u.id = s.teacher_user_id
       WHERE j.date >= ? AND j.date <= ?
       ORDER BY j.date, s.start_time`,
      [from, to],
    );

export const createJournal = (data: Omit<Journal, 'id' | 'created_at' | 'updated_at'>): Journal => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO journals (id, schedule_id, teacher_confirmation_id, date, material, created_at, updated_at)
    VALUES (${id}, ${data.schedule_id}, ${data.teacher_confirmation_id}, ${data.date}, ${data.material}, ${now}, ${now})
  `;
  return findJournalById(id)!;
};

export const updateJournal = (id: string, data: Partial<Omit<Journal, 'id' | 'created_at'>>): Journal | undefined => {
  SQLite.update('journals', { id }, data);
  return findJournalById(id);
};

export const deleteJournal = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM journals WHERE id = ?', [id]);
  return result.changes > 0;
};
