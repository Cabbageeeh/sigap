import SQLite from '@services/SQLite';
import type { TeacherConfirmation, TeacherConfirmationLogView } from '@types';
import { randomUUID } from 'crypto';

export const findAllTeacherConfirmations = (): TeacherConfirmation[] =>
  SQLite.many<TeacherConfirmation>`SELECT * FROM teacher_confirmations ORDER BY confirmed_at DESC`;

export interface ConfirmationLogFilters {
  page: number;
  limit: number;
  startMs?: number;
  endMs?: number;
  teacherUserId?: string;
}

export const getConfirmationLogsPaginated = (filters: ConfirmationLogFilters): { data: TeacherConfirmationLogView[]; total: number } => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.teacherUserId) {
    conditions.push('tc.teacher_user_id = ?');
    params.push(filters.teacherUserId);
  }
  if (filters.startMs !== undefined) {
    conditions.push('tc.confirmed_at >= ?');
    params.push(filters.startMs);
  }
  if (filters.endMs !== undefined) {
    conditions.push('tc.confirmed_at < ?');
    params.push(filters.endMs);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = SQLite.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM teacher_confirmations tc ${where}`,
    params
  );
  const data = SQLite.all<TeacherConfirmationLogView>(
    `SELECT tc.id,
            COALESCE(u.name, u.username) AS teacher_name,
            u.username AS teacher_username,
            COALESCE(tc.confirmation_date, tc.confirmed_at) AS confirmation_date,
            tc.confirmed_at
     FROM teacher_confirmations tc
     INNER JOIN users u ON u.id = tc.teacher_user_id
     ${where}
     ORDER BY tc.confirmed_at DESC
     LIMIT ? OFFSET ?`,
    [...params, filters.limit, (filters.page - 1) * filters.limit]
  );
  return { data, total: countRow?.count ?? 0 };
};

export const countTeachersConfirmedOn = (dayStartMs: number): number => {
  const row = SQLite.get<{ count: number }>(
    `SELECT COUNT(DISTINCT teacher_user_id) as count FROM teacher_confirmations WHERE confirmed_at >= ? AND confirmed_at < ?`,
    [dayStartMs, dayStartMs + 86400000]
  );
  return row?.count ?? 0;
};

export const findTeacherConfirmationById = (id: string): TeacherConfirmation | undefined =>
  SQLite.one<TeacherConfirmation>`SELECT * FROM teacher_confirmations WHERE id = ${id}`;

export const findConfirmationsByTeacher = (teacherUserId: string): TeacherConfirmation[] =>
  SQLite.many<TeacherConfirmation>`SELECT * FROM teacher_confirmations WHERE teacher_user_id = ${teacherUserId} ORDER BY confirmed_at DESC`;

export const findConfirmationsBySchedule = (scheduleId: string): TeacherConfirmation[] =>
  SQLite.many<TeacherConfirmation>`SELECT * FROM teacher_confirmations WHERE schedule_id = ${scheduleId} ORDER BY confirmed_at DESC`;

export const findTodayConfirmationBySchedule = (scheduleId: string): TeacherConfirmation | undefined => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return SQLite.one<TeacherConfirmation>`
    SELECT * FROM teacher_confirmations
    WHERE schedule_id = ${scheduleId}
      AND confirmed_at >= ${startOfDay.getTime()}
      AND confirmed_at <= ${endOfDay.getTime()}
    ORDER BY confirmed_at DESC
    LIMIT 1
  `;
};

export const findConfirmationByTeacherOnDay = (
  teacherUserId: string,
  dayStart: number,
): TeacherConfirmation | undefined =>
  SQLite.one<TeacherConfirmation>`
    SELECT * FROM teacher_confirmations
    WHERE teacher_user_id = ${teacherUserId}
      AND confirmed_at >= ${dayStart}
      AND confirmed_at <= ${dayStart + 86399999}
    ORDER BY confirmed_at DESC
    LIMIT 1
  `;

export const findTodayConfirmationByTeacher = (teacherUserId: string): TeacherConfirmation | undefined => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return SQLite.one<TeacherConfirmation>`
    SELECT * FROM teacher_confirmations
    WHERE teacher_user_id = ${teacherUserId}
      AND confirmed_at >= ${startOfDay.getTime()}
      AND confirmed_at <= ${endOfDay.getTime()}
    ORDER BY confirmed_at DESC
    LIMIT 1
  `;
};

export const createTeacherConfirmation = (data: Omit<TeacherConfirmation, 'id' | 'created_at'>): TeacherConfirmation => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO teacher_confirmations (
      id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school, confirmation_date, confirmed_at, created_at
    ) VALUES (
      ${id}, ${data.schedule_id ?? null}, ${data.teacher_user_id}, ${data.photo_url ?? null}, ${data.latitude ?? null}, ${data.longitude ?? null}, ${data.distance_meters ?? null}, ${data.is_inside_school ?? 1}, ${data.confirmation_date ?? null}, ${data.confirmed_at}, ${now}
    )
  `;
  return findTeacherConfirmationById(id)!;
};

export const updateTeacherConfirmation = (id: string, data: Partial<Omit<TeacherConfirmation, 'id'>>): TeacherConfirmation | undefined => {
  SQLite.update('teacher_confirmations', { id }, data);
  return findTeacherConfirmationById(id);
};

export const deleteTeacherConfirmation = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM teacher_confirmations WHERE id = ?', [id]);
  return result.changes > 0;
};
