import SQLite from '@services/SQLite';
import type {
  SessionStatusView,
  MissedConfirmationView,
  JournalCompletenessView,
  GradeProgressView,
  OutsideConfirmationView,
  HeadmasterClassOverviewView,
  HeadmasterTeacherAttendanceView,
  HeadmasterTeacherAttendanceHistoryView,
  HeadmasterGradeDetailView,
} from '../types/shared';

export type SessionStatus = SessionStatusView;
export type JournalCompletenessRow = JournalCompletenessView;
export type GradeProgressRow = GradeProgressView;
export type OutsideConfirmationRow = OutsideConfirmationView;

const DAY_MS = 24 * 60 * 60 * 1000;
const ATTENTION_AVERAGE_SCORE = 75;
const ATTENTION_ATTENDANCE_RATE = 90;

const startOfDay = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const periodRange = (days: number): { from: number; to: number } => {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
  const to = Date.now();
  return { from: startOfDay(new Date(to)) - (safeDays - 1) * DAY_MS, to };
};

const dateKey = (timestamp: number): number => startOfDay(new Date(timestamp));

interface ClassOverviewQueryRow {
  class_id: string;
  class_name: string;
  total_students: number;
  graded_students: number;
  average_score: number | null;
  attendance_present: number;
  attendance_total: number;
}

interface TeacherNameRow {
  teacher_user_id: string;
  teacher_name: string;
}

interface ConfirmationDayRow {
  teacher_user_id: string;
  confirmation_date: number | null;
  confirmed_at: number;
  is_inside_school: number;
  distance_meters: number | null;
}

interface ScheduleTemplate {
  id: string;
  day_of_week: number;
  start_time: number;
  end_time: number;
  class_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_user_id: string;
}

const findActiveYearSchedules = (): ScheduleTemplate[] =>
  SQLite.many<ScheduleTemplate>`
    SELECT sch.id, sch.day_of_week, sch.start_time, sch.end_time, sch.teacher_user_id,
           c.name AS class_name, sub.name AS subject_name, COALESCE(u.name, u.username) AS teacher_name
    FROM schedules sch
    JOIN classes c ON c.id = sch.class_id
    JOIN subjects sub ON sub.id = sch.subject_id
    JOIN users u ON u.id = sch.teacher_user_id
    JOIN academic_years ay ON ay.id = sch.academic_year_id
    WHERE ay.is_active = 1
  `;

const occurrencesBetween = (template: ScheduleTemplate, from: number, to: number): number[] => {
  const occurrences: number[] = [];
  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(0, 0, 0, 0);
  for (let t = fromDate.getTime(); t <= toDate.getTime(); t += DAY_MS) {
    const d = new Date(t);
    if (d.getDay() === template.day_of_week) {
      const occurrence = new Date(t);
      const start = new Date(template.start_time);
      occurrence.setHours(start.getHours(), start.getMinutes(), 0, 0);
      occurrences.push(occurrence.getTime());
    }
  }
  return occurrences;
};

// The QR flow records one confirmation per teacher per day, so presence is
// judged on the calendar day of the session — never on schedule_id, which the
// scan screen leaves empty.
const hasDailyConfirmation = (teacherUserId: string, timestamp: number): boolean => {
  const dayStart = startOfDay(new Date(timestamp));
  return !!SQLite.get<{ id: string }>(
    'SELECT id FROM teacher_confirmations WHERE teacher_user_id = ? AND confirmed_at >= ? AND confirmed_at <= ? LIMIT 1',
    [teacherUserId, dayStart, dayStart + DAY_MS - 1]
  );
};

const sessionStatus = (template: ScheduleTemplate, occurrenceStart: number, occurrenceEnd: number): SessionStatus => {
  const confirmed = hasDailyConfirmation(template.teacher_user_id, occurrenceStart);
  const hasJournal = !!SQLite.get<{ id: string }>(
    'SELECT id FROM journals WHERE schedule_id = ? AND date >= ? AND date <= ? LIMIT 1',
    [template.id, occurrenceStart, occurrenceEnd]
  );
  return {
    schedule_id: template.id,
    class_name: template.class_name,
    subject_name: template.subject_name,
    teacher_name: template.teacher_name,
    start_time: occurrenceStart,
    end_time: occurrenceEnd,
    confirmed,
    has_journal: hasJournal,
  };
};

export const getTodaySessions = (): SessionStatus[] => {
  const now = new Date();
  const dow = now.getDay();
  const todayStart = startOfDay(now);
  const todayEnd = todayStart + DAY_MS - 1;

  return findActiveYearSchedules()
    .filter(s => s.day_of_week === dow)
    .map(s => sessionStatus(s, todayStart, todayEnd));
};

export const getMissedConfirmations = (): MissedConfirmationView[] => {
  const now = Date.now();
  const from = startOfDay(new Date(now)) - 7 * DAY_MS;

  const confirmedDays = new Map<string, Set<number>>();
  for (const confirmation of findTeacherConfirmationsInRange(from, now)) {
    const days = confirmedDays.get(confirmation.teacher_user_id) ?? new Set<number>();
    days.add(dateKey(confirmation.confirmation_date ?? confirmation.confirmed_at));
    confirmedDays.set(confirmation.teacher_user_id, days);
  }

  const gaps = new Map<string, MissedConfirmationView & { classNames: Set<string>; subjectNames: Set<string> }>();
  for (const template of findActiveYearSchedules()) {
    for (const occurrenceStart of occurrencesBetween(template, from, now)) {
      if (occurrenceStart + (template.end_time - template.start_time) > now) continue;
      const day = dateKey(occurrenceStart);
      if (confirmedDays.get(template.teacher_user_id)?.has(day)) continue;

      const key = `${template.teacher_user_id}|${day}`;
      const gap = gaps.get(key) ?? {
        teacher_user_id: template.teacher_user_id,
        teacher_name: template.teacher_name,
        date: day,
        scheduled_sessions: 0,
        class_names: '',
        subject_names: '',
        classNames: new Set<string>(),
        subjectNames: new Set<string>(),
      };
      gap.scheduled_sessions += 1;
      gap.classNames.add(template.class_name);
      gap.subjectNames.add(template.subject_name);
      gaps.set(key, gap);
    }
  }

  return [...gaps.values()]
    .map(({ classNames, subjectNames, ...gap }) => ({
      ...gap,
      class_names: [...classNames].join(', '),
      subject_names: [...subjectNames].join(', '),
    }))
    .sort((a, b) => a.date - b.date || a.teacher_name.localeCompare(b.teacher_name));
};

export const getJournalCompleteness = (): JournalCompletenessRow[] => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  const from = monthStart;
  const to = now.getTime();

  const rows = SQLite.many<{ teacher_user_id: string; teacher_name: string }>`
    SELECT DISTINCT sch.teacher_user_id, u.name AS teacher_name
    FROM schedules sch
    JOIN users u ON u.id = sch.teacher_user_id
    JOIN academic_years ay ON ay.id = sch.academic_year_id
    WHERE ay.is_active = 1
  `;

  const templates = findActiveYearSchedules();
  return rows.map(row => {
    const teacherTemplates = templates.filter(t => t.teacher_user_id === row.teacher_user_id);
    const expected = teacherTemplates.reduce(
      (sum, t) => sum + occurrencesBetween(t, from, to).filter(occ => occ <= now.getTime()).length,
      0
    );
    const filled = SQLite.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM journals j JOIN schedules sch ON sch.id = j.schedule_id WHERE sch.teacher_user_id = ? AND j.date >= ? AND j.date <= ?',
      [row.teacher_user_id, from, to]
    )?.count ?? 0;
    return { teacher_name: row.teacher_name, expected, filled };
  });
};

export const getGradeProgress = (): GradeProgressRow[] =>
  SQLite.many<GradeProgressRow>`
    SELECT c.name AS class_name, sub.name AS subject_name, u.name AS teacher_name,
           (SELECT COUNT(*) FROM students st WHERE st.class_id = cs.class_id) AS total_students,
           (SELECT COUNT(DISTINCT g.student_id) FROM grades g WHERE g.class_id = cs.class_id AND g.subject_id = cs.subject_id) AS graded_students
    FROM class_subjects cs
    JOIN classes c ON c.id = cs.class_id
    JOIN subjects sub ON sub.id = cs.subject_id
    LEFT JOIN teachers t ON t.id = cs.teacher_id
    LEFT JOIN users u ON u.id = t.user_id
    JOIN academic_years ay ON ay.id = cs.academic_year_id
    WHERE ay.is_active = 1
    ORDER BY c.name, sub.name
  `;


const findTeacherNames = (): TeacherNameRow[] =>
  SQLite.many<TeacherNameRow>`
    SELECT DISTINCT t.user_id AS teacher_user_id, COALESCE(u.name, u.username) AS teacher_name
    FROM teachers t
    INNER JOIN users u ON u.id = t.user_id
    ORDER BY COALESCE(u.name, u.username)
  `;

const findTeacherConfirmationsInRange = (
  from: number,
  to: number,
  teacherUserId?: string,
): ConfirmationDayRow[] =>
  teacherUserId
    ? SQLite.all<ConfirmationDayRow>(
      `SELECT teacher_user_id, confirmation_date, confirmed_at, is_inside_school, distance_meters
       FROM teacher_confirmations
       WHERE teacher_user_id = ? AND confirmed_at >= ? AND confirmed_at <= ?
       ORDER BY confirmed_at DESC`,
      [teacherUserId, from, to],
    )
    : SQLite.all<ConfirmationDayRow>(
      `SELECT teacher_user_id, confirmation_date, confirmed_at, is_inside_school, distance_meters
       FROM teacher_confirmations
       WHERE confirmed_at >= ? AND confirmed_at <= ?
       ORDER BY confirmed_at DESC`,
      [from, to],
    );

export const getClassOverview = (): HeadmasterClassOverviewView[] => {
  const rows = SQLite.all<ClassOverviewQueryRow>(
    `WITH grade_stats AS (
       SELECT g.class_id,
              AVG(g.score) AS average_score,
              COUNT(DISTINCT g.student_id) AS graded_students
       FROM grades g
       GROUP BY g.class_id
     ),
     attendance_stats AS (
       SELECT st.class_id,
              SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) AS attendance_present,
              COUNT(sa.id) AS attendance_total
       FROM student_attendance sa
       INNER JOIN students st ON st.id = sa.student_id
       INNER JOIN schedules sch ON sch.id = sa.schedule_id AND sch.class_id = st.class_id
       INNER JOIN academic_years attendance_year
         ON attendance_year.id = sch.academic_year_id AND attendance_year.is_active = 1
       GROUP BY st.class_id
     )
     SELECT c.id AS class_id,
            c.name AS class_name,
            COUNT(DISTINCT st.id) AS total_students,
            COALESCE(gs.graded_students, 0) AS graded_students,
            gs.average_score,
            COALESCE(ast.attendance_present, 0) AS attendance_present,
            COALESCE(ast.attendance_total, 0) AS attendance_total
     FROM classes c
     INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = 1
     LEFT JOIN students st ON st.class_id = c.id
     LEFT JOIN grade_stats gs ON gs.class_id = c.id
     LEFT JOIN attendance_stats ast ON ast.class_id = c.id
     GROUP BY c.id, c.name, gs.graded_students, gs.average_score,
              ast.attendance_present, ast.attendance_total
     ORDER BY c.grade, c.name`,
    [],
  );

  return rows.map(row => {
    const averageScore = row.average_score === null
      ? null
      : Math.round(row.average_score * 100) / 100;
    const attendanceRate = row.attendance_total > 0
      ? Math.round((row.attendance_present / row.attendance_total) * 10000) / 100
      : null;
    const needsAttention = (
      (averageScore !== null && averageScore < ATTENTION_AVERAGE_SCORE)
      || (attendanceRate !== null && attendanceRate < ATTENTION_ATTENDANCE_RATE)
      || (row.total_students > 0 && row.graded_students < row.total_students)
    );

    return {
      class_id: row.class_id,
      class_name: row.class_name,
      total_students: row.total_students,
      graded_students: row.graded_students,
      average_score: averageScore,
      attendance_rate: attendanceRate,
      needs_attention: needsAttention,
    };
  });
};

export const getTeacherAttendanceOverview = (days = 30): HeadmasterTeacherAttendanceView[] => {
  const { from, to } = periodRange(days);
  const templates = findActiveYearSchedules();
  const teachers = findTeacherNames();
  const teacherNames = new Map(teachers.map(teacher => [teacher.teacher_user_id, teacher.teacher_name]));
  const expectedDays = new Map<string, Set<number>>();

  for (const template of templates) {
    teacherNames.set(template.teacher_user_id, template.teacher_name);
    const daysForTeacher = expectedDays.get(template.teacher_user_id) ?? new Set<number>();
    for (const occurrence of occurrencesBetween(template, from, to)) {
      if (occurrence <= to) daysForTeacher.add(dateKey(occurrence));
    }
    expectedDays.set(template.teacher_user_id, daysForTeacher);
  }

  const confirmedDays = new Map<string, Set<number>>();
  for (const confirmation of findTeacherConfirmationsInRange(from, to)) {
    const daysForTeacher = confirmedDays.get(confirmation.teacher_user_id) ?? new Set<number>();
    daysForTeacher.add(dateKey(confirmation.confirmation_date ?? confirmation.confirmed_at));
    confirmedDays.set(confirmation.teacher_user_id, daysForTeacher);
  }

  return [...teacherNames.entries()]
    .map(([teacherUserId, teacherName]) => {
      const expected = expectedDays.get(teacherUserId) ?? new Set<number>();
      const confirmed = confirmedDays.get(teacherUserId) ?? new Set<number>();
      const confirmedCount = [...expected].filter(day => confirmed.has(day)).length;

      return {
        teacher_user_id: teacherUserId,
        teacher_name: teacherName,
        expected_days: expected.size,
        confirmed_days: confirmedCount,
        attendance_rate: expected.size > 0
          ? Math.round((confirmedCount / expected.size) * 10000) / 100
          : null,
      };
    })
    .sort((a, b) => {
      if (a.attendance_rate === null && b.attendance_rate !== null) return 1;
      if (a.attendance_rate !== null && b.attendance_rate === null) return -1;
      return (a.attendance_rate ?? 0) - (b.attendance_rate ?? 0)
        || a.teacher_name.localeCompare(b.teacher_name);
    });
};

export const getTeacherAttendanceHistory = (
  teacherUserId: string,
  days = 30,
): HeadmasterTeacherAttendanceHistoryView[] => {
  const { from, to } = periodRange(days);
  const templates = findActiveYearSchedules().filter(template => template.teacher_user_id === teacherUserId);
  const teacherName = templates[0]?.teacher_name
    ?? SQLite.one<{ teacher_name: string }>`
      SELECT COALESCE(name, username) AS teacher_name FROM users WHERE id = ${teacherUserId}
    `?.teacher_name
    ?? '';
  const dayRows = new Map<number, {
    classNames: Set<string>;
    subjectNames: Set<string>;
    scheduledSessions: number;
    confirmation?: ConfirmationDayRow;
  }>();

  const ensureDay = (date: number): {
    classNames: Set<string>;
    subjectNames: Set<string>;
    scheduledSessions: number;
    confirmation?: ConfirmationDayRow;
  } => {
    const existing = dayRows.get(date);
    if (existing) return existing;
    const created = {
      classNames: new Set<string>(),
      subjectNames: new Set<string>(),
      scheduledSessions: 0,
    };
    dayRows.set(date, created);
    return created;
  };

  for (const template of templates) {
    for (const occurrence of occurrencesBetween(template, from, to)) {
      if (occurrence > to) continue;
      const day = ensureDay(dateKey(occurrence));
      day.classNames.add(template.class_name);
      day.subjectNames.add(template.subject_name);
      day.scheduledSessions += 1;
    }
  }

  for (const confirmation of findTeacherConfirmationsInRange(from, to, teacherUserId)) {
    const day = ensureDay(dateKey(confirmation.confirmation_date ?? confirmation.confirmed_at));
    if (!day.confirmation || confirmation.confirmed_at > day.confirmation.confirmed_at) {
      day.confirmation = confirmation;
    }
  }

  return [...dayRows.entries()]
    .map(([date, day]) => ({
      teacher_user_id: teacherUserId,
      teacher_name: teacherName,
      date,
      class_names: [...day.classNames].join(', ') || '—',
      subject_names: [...day.subjectNames].join(', ') || '—',
      scheduled_sessions: day.scheduledSessions,
      confirmed: !!day.confirmation,
      confirmed_at: day.confirmation?.confirmed_at ?? null,
      is_inside_school: day.confirmation?.is_inside_school ?? null,
      distance_meters: day.confirmation?.distance_meters ?? null,
    }))
    .sort((a, b) => b.date - a.date);
};

export const findClassGradeDetails = (classId: string): HeadmasterGradeDetailView[] =>
  SQLite.many<HeadmasterGradeDetailView>`
    SELECT g.id,
           g.student_id,
           st.name AS student_name,
           st.nis,
           sub.name AS subject_name,
           g.type,
           g.score,
           g.date
    FROM grades g
    INNER JOIN students st ON st.id = g.student_id AND st.class_id = g.class_id
    INNER JOIN subjects sub ON sub.id = g.subject_id
    WHERE g.class_id = ${classId}
    ORDER BY st.name, sub.name, g.date DESC, g.type, g.id
  `;

export const getOutsideConfirmations = (): OutsideConfirmationRow[] =>
  SQLite.many<OutsideConfirmationRow>`
    SELECT sch.id AS schedule_id, c.name AS class_name, sub.name AS subject_name, u.name AS teacher_name,
           tc.distance_meters, tc.confirmed_at
    FROM teacher_confirmations tc
    JOIN schedules sch ON sch.id = tc.schedule_id
    JOIN classes c ON c.id = sch.class_id
    JOIN subjects sub ON sub.id = sch.subject_id
    JOIN users u ON u.id = tc.teacher_user_id
    WHERE tc.is_inside_school = 0
    ORDER BY tc.confirmed_at DESC
  `;
