import type SQLiteType from '../app/services/SQLite';
import { randomUUID } from 'crypto';
import { hashPassword } from '../app/services/Authenticate';
import {
  CLASSES,
  FEMALE_FIRST,
  LAST_NAMES,
  MALE_FIRST,
  RENAMED_SUBJECTS,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  TEACHERS,
} from './data/bulkDemoData';
import {
  addressFor,
  CLASS_SIZE,
  createCtx,
  employeeId,
  NIS_BASE,
  parentNameFor,
  phoneFor,
  SESSION_MINUTES,
  SLOT_COUNT,
  slotStart,
  type Ctx,
  type TeacherRef,
} from './data/bulkDemoShared';

/**
 * Bulk demo master data — grows the school to a realistic size for screenshots
 * and user trials: 15 subjects, 17 teachers, 9 rombel of 32 students, and one
 * parent account per student (username = NIS, password parent123).
 *
 * Deterministic (seeded PRNG) and idempotent: rows are matched on their natural
 * key (subject code, username, NIS, class+subject+slot) and skipped when present.
 * Daily activity (confirmations, journals, attendance, grades) comes from 10_.
 */

const ensureSubjects = (c: Ctx): Map<string, string> => {
  for (const [code, name] of Object.entries(RENAMED_SUBJECTS)) {
    c.SQLite.run('UPDATE subjects SET name = ?, updated_at = ? WHERE code = ? AND name <> ?', [name, c.now, code, name]);
  }
  const ids = new Map<string, string>();
  for (const row of c.SQLite.all<{ id: string; code: string }>('SELECT id, code FROM subjects')) {
    ids.set(row.code, row.id);
  }
  for (const subject of SUBJECTS) {
    if (ids.has(subject.code)) continue;
    const id = randomUUID();
    c.SQLite.run(
      'INSERT INTO subjects (id, name, code, kkm, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, subject.name, subject.code, subject.kkm, c.now, c.now],
    );
    ids.set(subject.code, id);
  }
  return ids;
};

const ensureTeachers = (c: Ctx, subjectIds: Map<string, string>): Map<string, TeacherRef> => {
  const role = c.SQLite.get<{ id: string }>('SELECT id FROM roles WHERE slug = ?', ['teacher']);
  const password = hashPassword('teacher123');

  const knownNames = new Set(
    c.SQLite.all<{ name: string }>('SELECT u.name FROM teachers t JOIN users u ON u.id = t.user_id').map(row => row.name),
  );
  for (const teacher of TEACHERS) {
    if (knownNames.has(teacher.name)) continue;
    const userId = randomUUID();
    const phone = phoneFor(c);
    c.SQLite.run(
      'INSERT INTO users (id, name, username, password, phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [userId, teacher.name, teacher.username, password, phone, c.now, c.now],
    );
    if (role) {
      c.SQLite.run('INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)', [randomUUID(), userId, role.id, c.now]);
    }
    c.SQLite.run(
      'INSERT INTO teachers (id, user_id, employee_id, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), userId, employeeId(teacher.name), phone, c.now, c.now],
    );
  }

  const byUsername = new Map<string, TeacherRef>();
  for (const row of c.SQLite.all<{ id: string; user_id: string; name: string; username: string }>(
    'SELECT t.id, t.user_id, u.name, u.username FROM teachers t JOIN users u ON u.id = t.user_id',
  )) {
    byUsername.set(row.username, { id: row.id, userId: row.user_id, name: row.name });
  }

  for (const seed of TEACHERS) {
    const teacher = byUsername.get(seed.username);
    if (!teacher) continue;
    for (const code of seed.subjects) {
      const subjectId = subjectIds.get(code);
      if (!subjectId) continue;
      c.SQLite.run(
        'INSERT OR IGNORE INTO teacher_subjects (id, teacher_id, subject_id, academic_year_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), teacher.id, subjectId, c.yearId, c.now],
      );
    }
  }
  return byUsername;
};

const ensureClasses = (c: Ctx): Map<string, { id: string; grade: number }> => {
  const classes = new Map<string, { id: string; grade: number }>();
  for (const row of c.SQLite.all<{ id: string; name: string; grade: number }>(
    'SELECT id, name, grade FROM classes WHERE academic_year_id = ?', [c.yearId],
  )) {
    classes.set(row.name, { id: row.id, grade: Number(row.grade) });
  }
  for (const seed of CLASSES) {
    if (classes.has(seed.name)) continue;
    const id = randomUUID();
    c.SQLite.run(
      'INSERT INTO classes (id, name, grade, academic_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, seed.name, seed.grade, c.yearId, c.now, c.now],
    );
    classes.set(seed.name, { id, grade: seed.grade });
  }
  return classes;
};

const ensureParentAccount = (
  c: Ctx, roleId: string, username: string, name: string, phone: string, address: string, password: string,
): string | null => {
  if (c.SQLite.get<{ id: string }>('SELECT id FROM users WHERE username = ?', [username])) return null;
  const userId = randomUUID();
  c.SQLite.run(
    'INSERT INTO users (id, name, username, password, phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
    [userId, name, username, password, phone, c.now, c.now],
  );
  c.SQLite.run('INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)', [randomUUID(), userId, roleId, c.now]);
  c.SQLite.run(
    'INSERT INTO parents (id, user_id, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), userId, phone, address, c.now, c.now],
  );
  return userId;
};

const ensureStudents = (c: Ctx, classes: Map<string, { id: string; grade: number }>): void => {
  const role = c.SQLite.get<{ id: string }>('SELECT id FROM roles WHERE slug = ?', ['parent']);
  if (!role) return;
  const password = hashPassword('parent123');
  const usedNis = new Set(c.SQLite.all<{ nis: string }>('SELECT nis FROM students').map(row => row.nis));
  const usedUsernames = new Set(c.SQLite.all<{ username: string }>('SELECT username FROM users').map(row => row.username));
  let nisSeq = NIS_BASE;

  const nextNis = (): string => {
    while (usedNis.has(String(nisSeq))) nisSeq += 1;
    const nis = String(nisSeq);
    usedNis.add(nis);
    return nis;
  };

  const makeName = (index: number): string => {
    const first = index % 2 === 0 ? MALE_FIRST[c.int(MALE_FIRST.length)] : FEMALE_FIRST[c.int(FEMALE_FIRST.length)];
    return `${first} ${LAST_NAMES[c.int(LAST_NAMES.length)]}`;
  };

  const attachParent = (studentId: string, nis: string, studentName: string, address: string): void => {
    const login = usedUsernames.has(nis) ? `${nis}o` : nis;
    const userId = ensureParentAccount(c, role.id, login, parentNameFor(c, studentName), phoneFor(c), address, password);
    if (!userId) return;
    usedUsernames.add(login);
    c.SQLite.run('UPDATE students SET parent_user_id = ?, updated_at = ? WHERE id = ?', [userId, c.now, studentId]);
  };

  for (const seed of CLASSES) {
    const target = classes.get(seed.name);
    if (!target) continue;
    const current = c.SQLite.get<{ count: number }>('SELECT COUNT(*) AS count FROM students WHERE class_id = ?', [target.id])?.count ?? 0;
    for (let index = current; index < CLASS_SIZE; index += 1) {
      const name = makeName(index);
      const nis = nextNis();
      const address = addressFor(c);
      const id = randomUUID();
      c.SQLite.run(
        'INSERT INTO students (id, nis, name, class_id, parent_user_id, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)',
        [id, nis, name, target.id, phoneFor(c), address, c.now, c.now],
      );
      attachParent(id, nis, name, address);
    }
  }

  for (const student of c.SQLite.all<{ id: string; nis: string; name: string; address: string | null }>(
    'SELECT id, nis, name, address FROM students WHERE parent_user_id IS NULL ORDER BY nis',
  )) {
    attachParent(student.id, student.nis, student.name, student.address ?? addressFor(c));
  }
};

const ensureSchedules = (
  c: Ctx, classes: Map<string, { id: string; grade: number }>, subjectIds: Map<string, string>,
): void => {
  const teachersOfSubject = new Map<string, string[]>();
  for (const row of c.SQLite.all<{ code: string; teacher_user_id: string }>(
    `SELECT sub.code, t.user_id AS teacher_user_id
     FROM teacher_subjects ts
     JOIN teachers t ON t.id = ts.teacher_id
     JOIN subjects sub ON sub.id = ts.subject_id
     WHERE ts.academic_year_id = ?`, [c.yearId],
  )) {
    teachersOfSubject.set(row.code, [...(teachersOfSubject.get(row.code) ?? []), row.teacher_user_id]);
  }

  const slotKey = (start: number): string => {
    const date = new Date(start);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  const clockOfSlot = (slotIndex: number): string => slotKey(slotStart(1, slotIndex));
  const busyTeacher = new Set<string>();
  const busyClass = new Set<string>();
  for (const row of c.SQLite.all<{ class_id: string; teacher_user_id: string; day_of_week: number; start_time: number }>(
    'SELECT class_id, teacher_user_id, day_of_week, start_time FROM schedules WHERE academic_year_id = ?', [c.yearId],
  )) {
    const key = `${row.day_of_week}|${slotKey(row.start_time)}`;
    busyTeacher.add(`${row.teacher_user_id}|${key}`);
    busyClass.add(`${row.class_id}|${key}`);
  }

  const load = new Map<string, number>();
  // Slot-major so a class spreads across the week instead of filling Monday first.
  const slots: [number, number][] = [];
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    for (let day = 1; day <= 5; day += 1) slots.push([day, slot]);
  }

  for (const seed of CLASSES) {
    const target = classes.get(seed.name);
    if (!target) continue;
    for (const [position, code] of (SUBJECTS_BY_GRADE[target.grade] ?? []).entries()) {
      const subjectId = subjectIds.get(code);
      if (!subjectId) continue;
      c.SQLite.run(
        'INSERT OR IGNORE INTO class_subjects (id, class_id, subject_id, teacher_id, academic_year_id, created_at) VALUES (?, ?, ?, NULL, ?, ?)',
        [randomUUID(), target.id, subjectId, c.yearId, c.now],
      );
      const existing = c.SQLite.get<{ count: number }>(
        'SELECT COUNT(*) AS count FROM schedules WHERE class_id = ? AND subject_id = ? AND academic_year_id = ?',
        [target.id, subjectId, c.yearId],
      )?.count ?? 0;
      // The first three subjects of a grade run twice a week, the rest once.
      for (let session = existing; session < (position < 3 ? 2 : 1); session += 1) {
        for (const [day, slot] of slots) {
          const key = `${day}|${clockOfSlot(slot)}`;
          if (busyClass.has(`${target.id}|${key}`)) continue;
          const candidates = (teachersOfSubject.get(code) ?? []).filter(userId => !busyTeacher.has(`${userId}|${key}`));
          if (candidates.length === 0) continue;
          const teacher = candidates.sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))[0];
          const start = slotStart(day, slot);
          c.SQLite.run(
            'INSERT INTO schedules (id, class_id, subject_id, teacher_user_id, day_of_week, start_time, end_time, academic_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [randomUUID(), target.id, subjectId, teacher, day, start, start + SESSION_MINUTES * 60 * 1000, c.yearId, c.now, c.now],
          );
          c.SQLite.run(
            'UPDATE class_subjects SET teacher_id = (SELECT id FROM teachers WHERE user_id = ?) WHERE class_id = ? AND subject_id = ? AND academic_year_id = ? AND teacher_id IS NULL',
            [teacher, target.id, subjectId, c.yearId],
          );
          busyClass.add(`${target.id}|${key}`);
          busyTeacher.add(`${teacher}|${key}`);
          load.set(teacher, (load.get(teacher) ?? 0) + 1);
          break;
        }
      }
    }
  }
};

const ensureAssignments = (
  c: Ctx, classes: Map<string, { id: string; grade: number }>, teachers: Map<string, TeacherRef>,
): void => {
  for (const seed of CLASSES) {
    const target = classes.get(seed.name);
    const homeroom = teachers.get(seed.homeroom);
    if (!target || !homeroom) continue;
    c.SQLite.run(
      'INSERT OR IGNORE INTO teacher_class_assignments (id, teacher_id, class_id, academic_year_id, is_homeroom, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [randomUUID(), homeroom.id, target.id, c.yearId, c.now],
    );
    for (const row of c.SQLite.all<{ teacher_id: string }>(
      'SELECT DISTINCT teacher_id FROM class_subjects WHERE class_id = ? AND academic_year_id = ? AND teacher_id IS NOT NULL',
      [target.id, c.yearId],
    )) {
      c.SQLite.run(
        'INSERT OR IGNORE INTO teacher_class_assignments (id, teacher_id, class_id, academic_year_id, is_homeroom, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [randomUUID(), row.teacher_id, target.id, c.yearId, c.now],
      );
    }
  }
};

export function run(SQLite: typeof SQLiteType): void {
  const c = createCtx(SQLite);
  if (!c) return;

  const subjectIds = ensureSubjects(c);
  const teachers = ensureTeachers(c, subjectIds);
  const classes = ensureClasses(c);
  ensureStudents(c, classes);
  ensureSchedules(c, classes, subjectIds);
  ensureAssignments(c, classes, teachers);
}
