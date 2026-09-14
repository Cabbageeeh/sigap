import SQLite from '@services/SQLite';

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  todayAttendance: number;
  todayJournals: number;
  pendingConfirmations: number;
}

export const getDashboardStats = (): DashboardStats => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  const totalStudents = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM students')?.count ?? 0;
  const totalTeachers = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM teachers')?.count ?? 0;
  const totalClasses = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM classes')?.count ?? 0;
  const totalSubjects = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM subjects')?.count ?? 0;
  const todayJournals = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM journals WHERE date >= ? AND date <= ?', [startOfDay, endOfDay])?.count ?? 0;
  const todayAttendance = SQLite.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM student_attendance WHERE created_at >= ? AND created_at <= ? AND status = ?',
    [startOfDay, endOfDay, 'present']
  )?.count ?? 0;
  const pendingConfirmations = SQLite.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM schedules s WHERE NOT EXISTS (SELECT 1 FROM teacher_confirmations c WHERE c.schedule_id = s.id AND c.confirmed_at >= ? AND c.confirmed_at <= ?)',
    [startOfDay, endOfDay]
  )?.count ?? 0;

  return { totalStudents, totalTeachers, totalClasses, totalSubjects, todayAttendance, todayJournals, pendingConfirmations };
};

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  sick: number;
  leave: number;
  absent: number;
}

export interface AttendanceStatusSlice {
  status: 'present' | 'sick' | 'leave' | 'absent';
  count: number;
}

export interface ClassSizePoint {
  name: string;
  count: number;
}

export interface ConfirmationWeekPoint {
  day: string;
  confirmed: number;
  scheduled: number;
}

export interface DashboardCharts {
  attendanceTrend: AttendanceTrendPoint[];
  statusBreakdown: AttendanceStatusSlice[];
  classSizes: ClassSizePoint[];
  confirmationWeek: ConfirmationWeekPoint[];
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const startOfLocalDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();

const toLocalDateKey = (ms: number): string => {
  const d = new Date(ms);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const getDashboardCharts = (): DashboardCharts => {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const dayMs = 24 * 60 * 60 * 1000;

  const trendDays: AttendanceTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const start = todayStart - i * dayMs;
    trendDays.push({ date: toLocalDateKey(start), present: 0, sick: 0, leave: 0, absent: 0 });
  }
  const trendIndex = new Map(trendDays.map((p, i) => [p.date, i]));

  const trendRows = SQLite.all<{ created_at: number; status: string; count: number }>(
    `SELECT created_at, status, COUNT(*) as count FROM student_attendance
     WHERE created_at >= ? GROUP BY status, created_at`,
    [todayStart - 13 * dayMs],
  );
  for (const row of trendRows) {
    const idx = trendIndex.get(toLocalDateKey(row.created_at));
    if (idx === undefined) continue;
    const point = trendDays[idx];
    if (row.status === 'present' || row.status === 'sick' || row.status === 'leave' || row.status === 'absent') {
      point[row.status] += row.count;
    }
  }

  const statusRows = SQLite.all<{ status: string; count: number }>(
    `SELECT sa.status, COUNT(*) as count FROM student_attendance sa
     INNER JOIN schedules sch ON sch.id = sa.schedule_id
     INNER JOIN academic_years ay ON ay.id = sch.academic_year_id AND ay.is_active = 1
     GROUP BY sa.status`,
  );
  const statusBreakdown: AttendanceStatusSlice[] = (['present', 'sick', 'leave', 'absent'] as const).map((status) => ({
    status,
    count: statusRows.find((r) => r.status === status)?.count ?? 0,
  }));

  const classSizes = SQLite.all<ClassSizePoint>(
    `SELECT c.name, COUNT(s.id) as count FROM classes c
     LEFT JOIN students s ON s.class_id = c.id
     INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_active = 1
     GROUP BY c.id ORDER BY c.grade, c.name`,
  );

  const weekStart = todayStart - ((now.getDay() + 6) % 7) * dayMs;
  const weekEnd = weekStart + 7 * dayMs - 1;
  const scheduledRows = SQLite.all<{ day_of_week: number; count: number }>(
    `SELECT day_of_week, COUNT(*) as count FROM schedules
     WHERE academic_year_id IN (SELECT id FROM academic_years WHERE is_active = 1)
     GROUP BY day_of_week`,
  );
  const confirmedRows = SQLite.all<{ confirmed_at: number; count: number }>(
    `SELECT confirmed_at, COUNT(*) as count FROM teacher_confirmations
     WHERE confirmed_at >= ? AND confirmed_at <= ? GROUP BY confirmed_at`,
    [weekStart, weekEnd],
  );
  const confirmedByDay = new Map<number, number>();
  for (const row of confirmedRows) {
    const dow = new Date(row.confirmed_at).getDay();
    confirmedByDay.set(dow, (confirmedByDay.get(dow) ?? 0) + row.count);
  }
  const confirmationWeek: ConfirmationWeekPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const dow = (i + 1) % 7;
    confirmationWeek.push({
      day: DAY_LABELS[dow],
      confirmed: confirmedByDay.get(dow) ?? 0,
      scheduled: scheduledRows.find((r) => r.day_of_week === dow)?.count ?? 0,
    });
  }

  return { attendanceTrend: trendDays, statusBreakdown, classSizes, confirmationWeek };
};

export interface ClassSubjectStats {
  className: string;
  subjectName: string;
  teacherName: string;
  totalStudents: number;
  averageScore: number;
}

export const getClassSubjectStats = (classId: string, subjectId: string): ClassSubjectStats => {
  const classRow = SQLite.get<{ name: string }>('SELECT name FROM classes WHERE id = ?', [classId]);
  const subjectRow = SQLite.get<{ name: string }>('SELECT name FROM subjects WHERE id = ?', [subjectId]);
  const teacherRow = SQLite.get<{ name: string }>(
    `SELECT u.name FROM class_subjects cs
     INNER JOIN teachers t ON cs.teacher_id = t.id
     INNER JOIN users u ON t.user_id = u.id
     WHERE cs.class_id = ? AND cs.subject_id = ? LIMIT 1`,
    [classId, subjectId]
  );
  const totalStudents = SQLite.get<{ count: number }>('SELECT COUNT(*) as count FROM students WHERE class_id = ?', [classId])?.count ?? 0;
  const averageRow = SQLite.get<{ average: number }>(
    'SELECT AVG(score) as average FROM grades WHERE class_id = ? AND subject_id = ?',
    [classId, subjectId]
  );

  return {
    className: classRow?.name ?? '',
    subjectName: subjectRow?.name ?? '',
    teacherName: teacherRow?.name ?? '',
    totalStudents,
    averageScore: averageRow?.average ? Math.round(averageRow.average * 100) / 100 : 0,
  };
};
