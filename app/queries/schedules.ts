import SQLite from '@services/SQLite';
import type { Schedule } from '@types';
import { randomUUID } from 'crypto';

export const findAllSchedules = (): Schedule[] =>
  SQLite.many<Schedule>`SELECT * FROM schedules ORDER BY day_of_week, start_time`;

export const findScheduleById = (id: string): Schedule | undefined =>
  SQLite.one<Schedule>`SELECT * FROM schedules WHERE id = ${id}`;

export const findSchedulesByClass = (classId: string): Schedule[] =>
  SQLite.many<Schedule>`SELECT * FROM schedules WHERE class_id = ${classId} ORDER BY day_of_week, start_time`;

export const findSchedulesByTeacher = (teacherUserId: string): Schedule[] =>
  SQLite.many<Schedule>`SELECT * FROM schedules WHERE teacher_user_id = ${teacherUserId} ORDER BY day_of_week, start_time`;
export interface TeacherDailySchedule extends Schedule {
  class_name: string;
  subject_name: string;
}

export const findTeacherSchedulesByDay = (teacherUserId: string, dayOfWeek: number): TeacherDailySchedule[] =>
  SQLite.many<TeacherDailySchedule>`
    SELECT s.*, c.name AS class_name, sub.name AS subject_name
    FROM schedules s
    INNER JOIN classes c ON c.id = s.class_id AND c.academic_year_id = s.academic_year_id
    INNER JOIN subjects sub ON sub.id = s.subject_id
    INNER JOIN academic_years ay ON ay.id = s.academic_year_id AND ay.is_active = 1
    WHERE s.teacher_user_id = ${teacherUserId} AND s.day_of_week = ${dayOfWeek}
    ORDER BY s.start_time
  `;


export const findSchedulesByDay = (dayOfWeek: number): Schedule[] =>
  SQLite.many<Schedule>`SELECT * FROM schedules WHERE day_of_week = ${dayOfWeek} ORDER BY start_time`;

export const createSchedule = (data: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Schedule => {
  const now = Date.now();
  const id = randomUUID();
  SQLite.exec`
    INSERT INTO schedules (id, class_id, subject_id, teacher_user_id, day_of_week, start_time, end_time, academic_year_id, created_at, updated_at)
    VALUES (${id}, ${data.class_id}, ${data.subject_id}, ${data.teacher_user_id}, ${data.day_of_week}, ${data.start_time}, ${data.end_time}, ${data.academic_year_id}, ${now}, ${now})
  `;
  return findScheduleById(id)!;
};

export const updateSchedule = (id: string, data: Partial<Omit<Schedule, 'id' | 'created_at'>>): Schedule | undefined => {
  SQLite.update('schedules', { id }, data);
  return findScheduleById(id);
};

export const deleteSchedule = (id: string): boolean => {
  const result = SQLite.run('DELETE FROM schedules WHERE id = ?', [id]);
  return result.changes > 0;
};

export interface ScheduleWithDetails extends Schedule {
  class_name: string;
  subject_name: string;
  teacher_name: string | null;
}

export const findSchedulesByYearWithDetails = (academicYearId: string): ScheduleWithDetails[] =>
  SQLite.many<ScheduleWithDetails>`
    SELECT s.*, c.name AS class_name, sub.name AS subject_name, COALESCE(u.name, u.username) AS teacher_name
    FROM schedules s
    INNER JOIN classes c ON c.id = s.class_id
    INNER JOIN subjects sub ON sub.id = s.subject_id
    LEFT JOIN users u ON u.id = s.teacher_user_id
    WHERE s.academic_year_id = ${academicYearId}
    ORDER BY s.day_of_week, s.start_time
  `;

export const findSchedulesByYearAndDayWithDetails = (academicYearId: string, dayOfWeek: number): ScheduleWithDetails[] =>
  SQLite.many<ScheduleWithDetails>`
    SELECT s.*, c.name AS class_name, sub.name AS subject_name, COALESCE(u.name, u.username) AS teacher_name
    FROM schedules s
    INNER JOIN classes c ON c.id = s.class_id
    INNER JOIN subjects sub ON sub.id = s.subject_id
    LEFT JOIN users u ON u.id = s.teacher_user_id
    WHERE s.academic_year_id = ${academicYearId} AND s.day_of_week = ${dayOfWeek}
    ORDER BY s.start_time
  `;
