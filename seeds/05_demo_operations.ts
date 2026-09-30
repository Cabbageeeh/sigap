import type SQLiteType from '../app/services/SQLite';
import { randomUUID } from 'crypto';

type ClassRow = { id: string; name: string };
type SubjectRow = { id: string; code: string };
type TeacherRow = { id: string; user_id: string };
type StudentRow = { id: string; name: string; class_id: string };

const STATUS_CYCLE = ['present', 'present', 'present', 'present', 'sick', 'leave', 'absent'] as const;
const MATERIALS: Record<string, string> = {
  MAT: 'Aljabar linear: sistem persamaan dan eliminasi Gauss',
  BIO: 'Sel sebagai unit kehidupan: struktur dan fungsi organel',
  ENG: 'Narrative text: identifying orientation, complication, and resolution',
};

export function run(SQLite: typeof SQLiteType): void {
  const existing = SQLite.one<{ id: string }>`SELECT id FROM schedules LIMIT 1`;
  if (existing) return;

  const now = Date.now();
  const today = new Date();
  const todayDow = today.getDay();

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - todayDow);

  const atTime = (dow: number, hour: number, minute: number): number => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + dow);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  };

  const year = SQLite.one<{ id: string }>`SELECT id FROM academic_years WHERE is_active = 1`;
  if (!year) return;

  const classes = SQLite.many<ClassRow>`SELECT id, name FROM classes`;
  const subjects = SQLite.many<SubjectRow>`SELECT id, code FROM subjects`;
  const students = SQLite.many<StudentRow>`SELECT id, name, class_id FROM students`;
  if (classes.length === 0 || subjects.length === 0 || students.length === 0) return;

  const classBy = (name: string): ClassRow | undefined => classes.find(c => c.name === name);
  const subjectBy = (code: string): SubjectRow | undefined => subjects.find(s => s.code === code);

  const budiUser = SQLite.one<{ id: string }>`SELECT id FROM users WHERE username = ${'budi'}`;
  const sitiUser = SQLite.one<{ id: string }>`SELECT id FROM users WHERE username = ${'siti'}`;
  if (!budiUser || !sitiUser) return;

  const budiTeacher = SQLite.one<TeacherRow>`SELECT id, user_id FROM teachers WHERE user_id = ${budiUser.id}`;
  const sitiTeacher = SQLite.one<TeacherRow>`SELECT id, user_id FROM teachers WHERE user_id = ${sitiUser.id}`;
  if (!budiTeacher || !sitiTeacher) return;

  const budi = { teacher: budiTeacher, subjects: ['MAT', 'BIO'] };
  const siti = { teacher: sitiTeacher, subjects: ['ENG'] };

  const insertTeacherSubject = (teacher: TeacherRow, subjectCode: string): void => {
    const subj = subjectBy(subjectCode);
    if (!subj) return;
    SQLite.exec`
      INSERT OR IGNORE INTO teacher_subjects (id, teacher_id, subject_id, academic_year_id, created_at)
      VALUES (${randomUUID()}, ${teacher.id}, ${subj.id}, ${year.id}, ${now})
    `;
  };
  budi.subjects.forEach(code => insertTeacherSubject(budiTeacher, code));
  siti.subjects.forEach(code => insertTeacherSubject(sitiTeacher, code));

  type Plan = { className: string; subjectCode: string; teacher: TeacherRow; sessions: { dow: number; start: [number, number]; end: [number, number] }[] };
  const plan: Plan[] = [
    { className: '10A', subjectCode: 'MAT', teacher: budiTeacher, sessions: [{ dow: 1, start: [7, 30], end: [9, 0] }, { dow: 3, start: [7, 30], end: [9, 0] }] },
    { className: '10A', subjectCode: 'ENG', teacher: sitiTeacher, sessions: [{ dow: 2, start: [9, 15], end: [10, 45] }, { dow: 4, start: [9, 15], end: [10, 45] }] },
    { className: '10B', subjectCode: 'BIO', teacher: budiTeacher, sessions: [{ dow: 1, start: [9, 15], end: [10, 45] }, { dow: 3, start: [9, 15], end: [10, 45] }] },
    { className: '10B', subjectCode: 'ENG', teacher: sitiTeacher, sessions: [{ dow: 5, start: [7, 30], end: [9, 0] }] },
  ];

  const insertClassSubject = (className: string, subjectCode: string, teacher: TeacherRow): void => {
    const cls = classBy(className);
    const subj = subjectBy(subjectCode);
    if (!cls || !subj) return;
    SQLite.exec`
      INSERT OR IGNORE INTO class_subjects (id, class_id, subject_id, teacher_id, academic_year_id, created_at)
      VALUES (${randomUUID()}, ${cls.id}, ${subj.id}, ${teacher.id}, ${year.id}, ${now})
    `;
    SQLite.exec`
      INSERT OR IGNORE INTO teacher_class_assignments (id, teacher_id, class_id, academic_year_id, is_homeroom, created_at)
      VALUES (${randomUUID()}, ${teacher.id}, ${cls.id}, ${year.id}, 0, ${now})
    `;
  };

  const scheduleRows: { id: string; classId: string; subjectCode: string; teacherUserId: string; start: number; end: number; dow: number }[] = [];

  for (const p of plan) {
    insertClassSubject(p.className, p.subjectCode, p.teacher);
    const cls = classBy(p.className);
    const subj = subjectBy(p.subjectCode);
    if (!cls || !subj) continue;
    for (const s of p.sessions) {
      const id = randomUUID();
      const start = atTime(s.dow, s.start[0], s.start[1]);
      const end = atTime(s.dow, s.end[0], s.end[1]);
      SQLite.exec`
        INSERT INTO schedules (id, class_id, subject_id, teacher_user_id, day_of_week, start_time, end_time, academic_year_id, created_at, updated_at)
        VALUES (${id}, ${cls.id}, ${subj.id}, ${p.teacher.user_id}, ${s.dow}, ${start}, ${end}, ${year.id}, ${now}, ${now})
      `;
      scheduleRows.push({ id, classId: cls.id, subjectCode: p.subjectCode, teacherUserId: p.teacher.user_id, start, end, dow: s.dow });
    }
  }

  const classStudents = (classId: string): StudentRow[] => students.filter(s => s.class_id === classId);

  let statusIdx = 0;
  const nextStatus = (): string => STATUS_CYCLE[statusIdx++ % STATUS_CYCLE.length];

  for (const sch of scheduleRows) {
    if (sch.dow >= todayDow) continue;
    const subj = subjectBy(sch.subjectCode);
    if (!subj) continue;

    const confirmedAt = sch.start + 5 * 60 * 1000;
    const confirmationId = randomUUID();
    SQLite.exec`
      INSERT INTO teacher_confirmations (id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school, confirmed_at, created_at)
      VALUES (${confirmationId}, ${sch.id}, ${sch.teacherUserId}, ${null}, ${-6.2001}, ${106.8001}, ${15}, ${1}, ${confirmedAt}, ${now})
    `;

    const journalId = randomUUID();
    const material = MATERIALS[sch.subjectCode] ?? 'Materi pengajaran sesi ini';
    SQLite.exec`
      INSERT INTO journals (id, schedule_id, teacher_confirmation_id, date, material, created_at, updated_at)
      VALUES (${journalId}, ${sch.id}, ${confirmationId}, ${sch.start}, ${material}, ${now}, ${now})
    `;

    for (const stu of classStudents(sch.classId)) {
      SQLite.exec`
        INSERT OR IGNORE INTO student_attendance (id, student_id, schedule_id, journal_id, status, created_at, updated_at)
        VALUES (${randomUUID()}, ${stu.id}, ${sch.id}, ${journalId}, ${nextStatus()}, ${now}, ${now})
      `;
    }
  }

  const gradeTypes = ['task', 'daily_quiz', 'midterm'] as const;
  for (const cls of classes) {
    const classStu = classStudents(cls.id);
    const classSubjs = SQLite.many<{ subject_id: string; teacher_id: string }>`
      SELECT subject_id, teacher_id FROM class_subjects WHERE class_id = ${cls.id} AND academic_year_id = ${year.id}
    `;
    for (const cs of classSubjs) {
      const teacher = SQLite.one<{ user_id: string }>`SELECT user_id FROM teachers WHERE id = ${cs.teacher_id}`;
      if (!teacher) continue;
      for (const gtype of gradeTypes) {
        for (const stu of classStu) {
          const score = Math.round((70 + Math.random() * 25) * 10) / 10;
          SQLite.exec`
            INSERT OR IGNORE INTO grades (id, student_id, subject_id, class_id, type, score, date, teacher_user_id, created_at, updated_at)
            VALUES (${randomUUID()}, ${stu.id}, ${cs.subject_id}, ${cls.id}, ${gtype}, ${score}, ${now}, ${teacher.user_id}, ${now}, ${now})
          `;
        }
      }
    }
  }
}
