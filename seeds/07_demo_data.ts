import type SQLiteType from '../app/services/SQLite';
import { randomUUID } from 'crypto';
import { hashPassword } from '../app/services/Authenticate';
import { confirmationAlarmDay, isConfirmationGap } from './data/bulkDemoShared';

/**
 * Demo data filler — fills gaps left by 04/05 demo seeds so every feature
 * has visible data regardless of the weekday the seed ran on:
 * - headmaster account
 * - teacher confirmations + journals + attendance for the past 14 days
 *   (leaves sessions from 3 days ago unconfirmed to demo the missed-session alarm,
 *    and one session 5 days ago confirmed OUTSIDE the radius for the reports page)
 * - UAS ('final') grades for every student (deterministic)
 * - audit log entries, one parent notification, one announcement
 *
 * Idempotent: skips work that is already present.
 */

const MATERIALS: Record<string, string> = {
  MAT: 'Aljabar linear: sistem persamaan dan eliminasi Gauss',
  BIO: 'Sel sebagai unit kehidupan: struktur dan fungsi organel',
  ENG: 'Narrative text: identifying orientation, complication, and resolution',
};

const STATUS_CYCLE = ['present', 'present', 'present', 'present', 'sick', 'leave', 'absent'] as const;

interface ScheduleRow {
  id: string;
  class_id: string;
  subject_code: string;
  teacher_user_id: string;
  day_of_week: number;
  start_time: number;
  end_time: number;
}

const occurrencesBetween = (schedule: ScheduleRow, from: number, to: number): number[] => {
  const occurrences: number[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  for (let t = fromDate.getTime(); t <= to; t += dayMs) {
    const day = new Date(t);
    if (day.getDay() === schedule.day_of_week) {
      const start = new Date(t);
      const templateStart = new Date(schedule.start_time);
      start.setHours(templateStart.getHours(), templateStart.getMinutes(), 0, 0);
      occurrences.push(start.getTime());
    }
  }
  return occurrences;
};

export function run(SQLite: typeof SQLiteType): void {
  const now = Date.now();
  const nowDate = new Date(now);

  // ── Headmaster account ────────────────────────────────────────────────────
  const headmasterRole = SQLite.one<{ id: string }>`SELECT id FROM roles WHERE slug = ${'headmaster'}`;
  const existingKepala = SQLite.one<{ id: string }>`SELECT id FROM users WHERE username = ${'kepala'}`;
  if (!existingKepala && headmasterRole) {
    const id = randomUUID();
    SQLite.exec`
      INSERT INTO users (id, name, username, password, phone, is_active, created_at, updated_at)
      VALUES (${id}, ${'Kepala Sekolah'}, ${'kepala'}, ${hashPassword('kepala123')}, ${'08123456791'}, ${1}, ${now}, ${now})
    `;
    SQLite.exec`
      INSERT INTO user_roles (id, user_id, role_id, created_at)
      VALUES (${randomUUID()}, ${id}, ${headmasterRole.id}, ${now})
    `;
  }

  // ── Confirmations, journals, attendance for past sessions ────────────────
  const year = SQLite.one<{ id: string }>`SELECT id FROM academic_years WHERE is_active = 1`;
  if (year) {
    const from = now - 14 * 24 * 60 * 60 * 1000;
    const alarmDay = confirmationAlarmDay(now);
    const fiveDaysAgo = new Date(nowDate);
    fiveDaysAgo.setDate(nowDate.getDate() - 5);
    fiveDaysAgo.setHours(0, 0, 0, 0);

    const schedules = SQLite.many<ScheduleRow>`
      SELECT sch.id, sch.class_id, sch.teacher_user_id, sch.day_of_week, sch.start_time, sch.end_time,
             sub.code AS subject_code
      FROM schedules sch
      JOIN subjects sub ON sub.id = sch.subject_id
      WHERE sch.academic_year_id = ${year.id}
    `;

    const school = SQLite.one<{ latitude: number | null; longitude: number | null }>`
      SELECT latitude, longitude FROM school_locations WHERE is_active = 1 LIMIT 1
    `;
    const baseLatitude = school?.latitude ?? -6.2001;
    const baseLongitude = school?.longitude ?? 106.8001;

    for (const schedule of schedules) {
      for (const occurrenceStart of occurrencesBetween(schedule, from, now)) {
        const occurrenceEnd = occurrenceStart + (schedule.end_time - schedule.start_time);
        if (occurrenceEnd > now) continue;
        const occurrenceDate = new Date(occurrenceStart);
        occurrenceDate.setHours(0, 0, 0, 0);

        // The QR flow records one confirmation per teacher per day; every
        // session that day then shares it as its journal anchor.
        const dayStart = occurrenceDate.getTime();
        const confirmationToday = SQLite.one<{ id: string }>`
          SELECT id FROM teacher_confirmations
          WHERE teacher_user_id = ${schedule.teacher_user_id}
            AND confirmed_at >= ${dayStart} AND confirmed_at <= ${dayStart + 86399999}
        `;
        const journalExists = SQLite.one<{ id: string }>`
          SELECT id FROM journals WHERE schedule_id = ${schedule.id} AND date >= ${occurrenceStart} AND date <= ${occurrenceEnd}
        `;
        if (journalExists) continue;

        // A share of teacher-days stay unconfirmed → demo for the missed-confirmation alarm
        if (!confirmationToday && isConfirmationGap(schedule.teacher_user_id, dayStart, alarmDay)) continue;

        const isOutside = !confirmationToday && dayStart === fiveDaysAgo.getTime();
        const confirmationId = confirmationToday?.id ?? randomUUID();
        if (!confirmationToday) {
          const distance = isOutside ? 380 : 15;
          SQLite.exec`
            INSERT INTO teacher_confirmations (id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school, confirmation_date, confirmed_at, created_at)
            VALUES (${confirmationId}, ${schedule.id}, ${schedule.teacher_user_id}, ${'/uploads/confirmations/demo-selfie.jpg'}, ${isOutside ? baseLatitude + 0.006 : baseLatitude}, ${isOutside ? baseLongitude + 0.005 : baseLongitude}, ${distance}, ${isOutside ? 0 : 1}, ${dayStart}, ${occurrenceStart + 5 * 60 * 1000}, ${now})
          `;
        }

        const journalId = randomUUID();
        SQLite.exec`
          INSERT INTO journals (id, schedule_id, teacher_confirmation_id, date, material, created_at, updated_at)
          VALUES (${journalId}, ${schedule.id}, ${confirmationId}, ${occurrenceStart}, ${MATERIALS[schedule.subject_code] ?? 'Materi pengajaran sesi ini'}, ${now}, ${now})
        `;

        const students = SQLite.many<{ id: string }>`SELECT id FROM students WHERE class_id = ${schedule.class_id}`;
        let statusIdx = 0;
        for (const student of students) {
          const status = STATUS_CYCLE[statusIdx++ % STATUS_CYCLE.length];
          SQLite.exec`
            INSERT OR IGNORE INTO student_attendance (id, student_id, schedule_id, journal_id, status, created_at, updated_at)
            VALUES (${randomUUID()}, ${student.id}, ${schedule.id}, ${journalId}, ${status}, ${now}, ${now})
          `;
        }
      }
    }
  }

  // ── UAS ('final') grades — deterministic per student index ───────────────
  if (year) {
    const classSubjects = SQLite.many<{ class_id: string; subject_id: string; teacher_id: string }>`
      SELECT class_id, subject_id, teacher_id FROM class_subjects WHERE academic_year_id = ${year.id}
    `;
    for (const cs of classSubjects) {
      const teacher = SQLite.one<{ user_id: string }>`SELECT user_id FROM teachers WHERE id = ${cs.teacher_id}`;
      if (!teacher) continue;
      const students = SQLite.many<{ id: string }>`SELECT id FROM students WHERE class_id = ${cs.class_id} ORDER BY nis`;
      students.forEach((student, index) => {
        const score = 72 + (index * 7) % 23;
        SQLite.exec`
          INSERT OR IGNORE INTO grades (id, student_id, subject_id, class_id, type, score, date, teacher_user_id, created_at, updated_at)
          VALUES (${randomUUID()}, ${student.id}, ${cs.subject_id}, ${cs.class_id}, ${'final'}, ${score}, ${now}, ${teacher.user_id}, ${now}, ${now})
        `;
      });
    }
  }

  // ── Audit log entries (only when the table is empty) ─────────────────────
  const auditCount = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM grade_audit_logs')?.count ?? 0;
  if (auditCount === 0) {
    const adminUser = SQLite.one<{ id: string }>`SELECT id FROM users WHERE username = ${'admin'}`;
    const sampleGrades = SQLite.many<{ id: string; student_id: string; subject_id: string; class_id: string; type: string; score: number }>`
      SELECT id, student_id, subject_id, class_id, type, score FROM grades LIMIT 6
    `;
    if (adminUser) {
      for (const grade of sampleGrades) {
        SQLite.exec`
          INSERT INTO grade_audit_logs (id, grade_id, student_id, subject_id, class_id, type, action, old_score, new_score, user_id, created_at)
          VALUES (${randomUUID()}, ${grade.id}, ${grade.student_id}, ${grade.subject_id}, ${grade.class_id}, ${grade.type}, ${'create'}, ${null}, ${grade.score}, ${adminUser.id}, ${now - 86400000})
        `;
        SQLite.exec`
          INSERT INTO grade_audit_logs (id, grade_id, student_id, subject_id, class_id, type, action, old_score, new_score, user_id, created_at)
          VALUES (${randomUUID()}, ${grade.id}, ${grade.student_id}, ${grade.subject_id}, ${grade.class_id}, ${grade.type}, ${'update'}, ${grade.score - 6}, ${grade.score}, ${adminUser.id}, ${now})
        `;
      }
    }
  }

  // ── One parent notification (only when the parent has no unread) ─────────
  const parentUser = SQLite.one<{ id: string }>`SELECT id FROM users WHERE username = ${'10001'}`;
  if (parentUser) {
    const unreadCount = SQLite.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [parentUser.id]
    )?.count ?? 0;
    if (unreadCount === 0) {
      SQLite.exec`
        INSERT INTO notifications (id, user_id, type, title, body, created_at)
        VALUES (${randomUUID()}, ${parentUser.id}, ${'grade_published'}, ${'Nilai Dipublikasikan'}, ${'Nilai rapor tahun ajaran 2025/2026 sudah dapat dilihat.'}, ${now})
      `;
    }
  }

  // ── One announcement (only when empty) ────────────────────────────────────
  const announcementCount = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM announcements')?.count ?? 0;
  const adminUser = SQLite.one<{ id: string }>`SELECT id FROM users WHERE username = ${'admin'}`;
  if (announcementCount === 0 && adminUser) {
    SQLite.exec`
      INSERT INTO announcements (id, title, body, author_user_id, created_at, updated_at)
      VALUES (${randomUUID()}, ${'Selamat Datang di SIGAP'}, ${'SIGAP — Sistem Informasi Guru, Absensi, dan Prestasi sudah aktif. Guru dapat mengisi jurnal, verifikasi mengajar, dan input nilai. Orang tua dapat memantau nilai dan kehadiran anak.'}, ${adminUser.id}, ${now}, ${now})
    `;
  }

  // ── Publish grades for the active year (demo convenience) ────────────────
  if (year) {
    SQLite.exec`UPDATE academic_years SET is_grades_published = 1, updated_at = ${now} WHERE id = ${year.id}`;
  }
}
