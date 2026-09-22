import type SQLiteType from '../app/services/SQLite';
import { randomUUID } from 'crypto';
import { ANNOUNCEMENTS, MATERIALS } from './data/bulkDemoData';
import {
  confirmationAlarmDay,
  createCtx,
  DAY_MS,
  HISTORY_DAYS,
  isConfirmationGap,
  occurrencesOf,
  SCHOOL,
  stableHash,
  startOfDay,
  type Ctx,
} from './data/bulkDemoShared';

/**
 * Bulk demo activity — the day-to-day records that make the dashboards busy:
 * 30 days of teacher QR confirmations, one journal per confirmed session,
 * student attendance for every journal, four grade components per student per
 * subject, plus audit trail, parent notifications, and announcements.
 *
 * Deterministic and idempotent: a session is skipped when its confirmation
 * already exists, and inserts lean on the unique constraints of each table.
 */

interface ScheduleRow {
  id: string;
  class_id: string;
  teacher_user_id: string;
  day_of_week: number;
  start_time: number;
  end_time: number;
  code: string;
  kkm: number | null;
}

const GRADE_COMPONENTS: { type: string; offset: number }[] = [
  { type: 'task', offset: 3 },
  { type: 'daily_quiz', offset: 0 },
  { type: 'midterm', offset: -3 },
  { type: 'final', offset: 1 },
];

const listSchedules = (c: Ctx): ScheduleRow[] =>
  c.SQLite.all<ScheduleRow>(
    `SELECT sch.id, sch.class_id, sch.teacher_user_id, sch.day_of_week, sch.start_time, sch.end_time,
            sub.code, sub.kkm
     FROM schedules sch
     JOIN subjects sub ON sub.id = sch.subject_id
     WHERE sch.academic_year_id = ?
     ORDER BY sch.class_id, sub.code, sch.day_of_week, sch.start_time`, [c.yearId],
  );

const ensureConfirmationsAndJournals = (c: Ctx): void => {
  const from = startOfDay(c.now - HISTORY_DAYS * DAY_MS);
  const alarmDay = confirmationAlarmDay(c.now);
  const studentsByClass = new Map<string, string[]>();
  for (const row of c.SQLite.all<{ id: string; class_id: string }>('SELECT id, class_id FROM students ORDER BY nis')) {
    studentsByClass.set(row.class_id, [...(studentsByClass.get(row.class_id) ?? []), row.id]);
  }
  // Present rate per class keeps the headmaster attention flags mixed.
  const presentRate = new Map<string, number>();

  const sessions: { schedule: ScheduleRow; start: number }[] = [];
  for (const schedule of listSchedules(c)) {
    for (const start of occurrencesOf(schedule.day_of_week, schedule.start_time, schedule.end_time, from, c.now)) {
      if (start + (schedule.end_time - schedule.start_time) > c.now) continue;
      sessions.push({ schedule, start });
    }
  }

  // The QR flow records one confirmation per teacher per day and journals hang
  // off it, so the history is built teacher-day first, session second.
  const teacherDays = new Map<string, { teacherUserId: string; day: number; items: typeof sessions }>();
  for (const session of sessions) {
    const day = startOfDay(session.start);
    const key = `${session.schedule.teacher_user_id}|${day}`;
    const group = teacherDays.get(key) ?? { teacherUserId: session.schedule.teacher_user_id, day, items: [] };
    group.items.push(session);
    teacherDays.set(key, group);
  }

  for (const group of [...teacherDays.values()].sort((a, b) => a.day - b.day)) {
    if (isConfirmationGap(group.teacherUserId, group.day, alarmDay)) continue;

    const items = group.items.sort((a, b) => a.start - b.start);
    const firstStart = items[0].start;
    const confirmedAt = firstStart + (2 + c.int(9)) * 60 * 1000;
    const existing = c.SQLite.get<{ id: string }>(
      'SELECT id FROM teacher_confirmations WHERE teacher_user_id = ? AND confirmed_at >= ? AND confirmed_at <= ? LIMIT 1',
      [group.teacherUserId, group.day, group.day + DAY_MS - 1],
    );
    let confirmationId = existing?.id ?? '';

    if (!confirmationId) {
      const outside = stableHash(`far:${group.teacherUserId}:${group.day}`) < 12;
      confirmationId = randomUUID();
      c.SQLite.run(
        `INSERT INTO teacher_confirmations
         (id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school,
          confirmation_date, confirmed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          confirmationId, items[0].schedule.id, group.teacherUserId, '/uploads/confirmations/demo-selfie.jpg',
          outside ? Number((SCHOOL.latitude + 0.006).toFixed(7)) : Number((SCHOOL.latitude + (c.int(1801) - 900) / 1e6).toFixed(7)),
          outside ? Number((SCHOOL.longitude + 0.005).toFixed(7)) : Number((SCHOOL.longitude + (c.int(1801) - 900) / 1e6).toFixed(7)),
          outside ? 480 + c.int(220) : 12 + c.int(120),
          outside ? 0 : 1,
          group.day, confirmedAt, confirmedAt, confirmedAt,
        ],
      );
    }

    for (const { schedule, start } of items) {
      const duration = schedule.end_time - schedule.start_time;
      if (c.SQLite.get<{ id: string }>(
        'SELECT id FROM journals WHERE schedule_id = ? AND date >= ? AND date <= ? LIMIT 1',
        [schedule.id, start, start + duration],
      )) continue;

      const students = studentsByClass.get(schedule.class_id) ?? [];
      if (!presentRate.has(schedule.class_id)) presentRate.set(schedule.class_id, 0.88 + c.int(8) / 100);
      const rate = presentRate.get(schedule.class_id) ?? 0.92;
      const materials = MATERIALS[schedule.code] ?? ['Kegiatan belajar mengajar sesuai modul ajar'];
      // Journals are written right after the session, and the dashboard trend
      // chart groups attendance by created_at — so both carry the session date.
      const journalId = randomUUID();
      const savedAt = start + duration + (5 + c.int(40)) * 60 * 1000;
      c.SQLite.run(
        'INSERT INTO journals (id, schedule_id, teacher_confirmation_id, date, material, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [journalId, schedule.id, confirmationId, start, materials[(start + schedule.class_id.length) % materials.length], savedAt, savedAt],
      );

      for (const studentId of students) {
        const roll = c.int(1000) / 1000;
        const status = roll < rate ? 'present' : roll < rate + 0.045 ? 'sick' : roll < rate + 0.075 ? 'leave' : 'absent';
        c.SQLite.run(
          'INSERT OR IGNORE INTO student_attendance (id, student_id, schedule_id, journal_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [randomUUID(), studentId, schedule.id, journalId, status, savedAt, savedAt],
        );
      }
    }
  }
};

const ensureGrades = (c: Ctx): void => {
  const fallbackTeachers = c.SQLite.all<{ id: string; user_id: string }>('SELECT id, user_id FROM teachers');
  const teacherUser = new Map(fallbackTeachers.map(row => [row.id, row.user_id]));

  for (const link of c.SQLite.all<{ class_id: string; subject_id: string; teacher_id: string | null; code: string; kkm: number | null }>(
    `SELECT cs.class_id, cs.subject_id, cs.teacher_id, sub.code, sub.kkm
     FROM class_subjects cs JOIN subjects sub ON sub.id = cs.subject_id
     WHERE cs.academic_year_id = ?`, [c.yearId],
  )) {
    const author = (link.teacher_id ? teacherUser.get(link.teacher_id) : undefined)
      ?? fallbackTeachers[c.int(fallbackTeachers.length)].user_id;
    const threshold = link.kkm ?? 75;
    const students = c.SQLite.all<{ id: string }>('SELECT id FROM students WHERE class_id = ? ORDER BY nis', [link.class_id]);

    students.forEach((student, index) => {
      const base = threshold - 4 + ((index * 7 + link.code.length * 3) % 22);
      for (const component of GRADE_COMPONENTS) {
        const score = Math.max(55, Math.min(98, base + component.offset + (index % 3 === 0 ? 4 : 0)));
        const id = randomUUID();
        const gradedAt = c.now - (index % 20) * DAY_MS;
        c.SQLite.run(
          `INSERT OR IGNORE INTO grades
           (id, student_id, subject_id, class_id, type, score, date, teacher_user_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, student.id, link.subject_id, link.class_id, component.type, score, gradedAt, author, gradedAt, gradedAt],
        );
      }
    });
  }

  // A short correction history so the audit page is not empty. The sample comes
  // from stored rows and is skipped when already audited, so re-running the
  // seed cannot keep appending entries.
  const samples = c.SQLite.all<{
    id: string; student_id: string; subject_id: string; class_id: string; type: string; score: number; teacher_user_id: string;
  }>('SELECT id, student_id, subject_id, class_id, type, score, teacher_user_id FROM grades ORDER BY id LIMIT 24');

  samples.forEach((grade, index) => {
    if (c.SQLite.get<{ id: string }>('SELECT id FROM grade_audit_logs WHERE grade_id = ?', [grade.id])) return;
    c.SQLite.run(
      `INSERT INTO grade_audit_logs
       (id, grade_id, student_id, subject_id, class_id, type, action, old_score, new_score, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'update', ?, ?, ?, ?)`,
      [randomUUID(), grade.id, grade.student_id, grade.subject_id, grade.class_id, grade.type, grade.score - 5, grade.score, grade.teacher_user_id, c.now - index * 3600 * 1000],
    );
  });
};

const ensureExtras = (c: Ctx): void => {
  const admin = c.SQLite.get<{ id: string }>('SELECT id FROM users WHERE username = ?', ['admin']);
  ANNOUNCEMENTS.forEach((announcement, index) => {
    if (!admin || c.SQLite.get<{ id: string }>('SELECT id FROM announcements WHERE title = ?', [announcement.title])) return;
    c.SQLite.run(
      'INSERT INTO announcements (id, title, body, author_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), announcement.title, announcement.body, admin.id, c.now - (index + 1) * 2 * DAY_MS, c.now],
    );
  });

  const parents = c.SQLite.all<{ id: string }>(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.slug = 'parent'`,
  );
  for (const parent of parents) {
    if (c.SQLite.get<{ id: string }>('SELECT id FROM notifications WHERE user_id = ? LIMIT 1', [parent.id])) continue;
    c.SQLite.run(
      'INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), parent.id, 'grade_published', 'Nilai Dipublikasikan', 'Nilai rapor semester ini sudah dapat dilihat melalui menu Nilai.', c.now - c.int(6) * DAY_MS],
    );
  }
};

export function run(SQLite: typeof SQLiteType): void {
  const c = createCtx(SQLite);
  if (!c) return;

  ensureConfirmationsAndJournals(c);
  ensureGrades(c);
  ensureExtras(c);

  // Parents only see grades once the period is published.
  SQLite.run('UPDATE academic_years SET is_grades_published = 1, updated_at = ? WHERE id = ?', [c.now, c.yearId]);
}
