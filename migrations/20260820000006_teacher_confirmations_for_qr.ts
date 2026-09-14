import type SQLite from '@services/SQLite';

// Rebuilds teacher_confirmations with nullable schedule_id/photo_url and a
// confirmation_date column for the QR flow. ALTER TABLE RENAME rewrites FK
// references in dependent tables (journals.teacher_confirmation_id) to the
// _old name, so the rewritten references are patched back via
// writable_schema before the old table is dropped — otherwise the drop
// cascade-deletes journal rows and leaves a dangling FK that breaks every
// DELETE cascading through schedules -> journals.
export const up = (sqlite: typeof SQLite): void => {
  const db = sqlite.raw();
  db.exec(`
ALTER TABLE teacher_confirmations RENAME TO teacher_confirmations_old;
CREATE TABLE teacher_confirmations (
  id TEXT PRIMARY KEY NOT NULL,
  schedule_id TEXT,
  teacher_user_id TEXT NOT NULL,
  photo_url TEXT,
  latitude REAL,
  longitude REAL,
  distance_meters REAL,
  is_inside_school INTEGER DEFAULT 1,
  confirmation_date INTEGER,
  confirmed_at INTEGER NOT NULL,
  created_at INTEGER,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_user_id) REFERENCES users (id) ON DELETE CASCADE
);
INSERT INTO teacher_confirmations (id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school, confirmed_at, created_at)
SELECT id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school, confirmed_at, created_at
FROM teacher_confirmations_old;
DROP INDEX IF EXISTS idx_teacher_confirmations_schedule_id;
DROP INDEX IF EXISTS idx_teacher_confirmations_teacher_user_id;
DROP INDEX IF EXISTS idx_teacher_confirmations_confirmed_at;
CREATE INDEX IF NOT EXISTS idx_teacher_confirmations_schedule_id ON teacher_confirmations (schedule_id);
CREATE INDEX IF NOT EXISTS idx_teacher_confirmations_teacher_user_id ON teacher_confirmations (teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_confirmations_confirmed_at ON teacher_confirmations (confirmed_at);
CREATE INDEX IF NOT EXISTS idx_teacher_confirmations_confirmation_date ON teacher_confirmations (teacher_user_id, confirmation_date);
  `);
  db.unsafeMode(true);
  try {
    db.exec('PRAGMA writable_schema = ON');
    db.prepare(`
      UPDATE sqlite_master
      SET sql = replace(sql, 'teacher_confirmations_old', 'teacher_confirmations')
      WHERE type = 'table' AND name != 'teacher_confirmations_old'
        AND sql LIKE '%teacher_confirmations_old%'
    `).run();
    db.exec('PRAGMA writable_schema = OFF');
  } finally {
    db.unsafeMode(false);
  }
  db.exec('DROP TABLE teacher_confirmations_old');
};

export const down = (sqlite: typeof SQLite): void => {
  const db = sqlite.raw();
  db.exec(`
ALTER TABLE teacher_confirmations RENAME TO teacher_confirmations_new;
CREATE TABLE teacher_confirmations (
  id TEXT PRIMARY KEY NOT NULL,
  schedule_id TEXT NOT NULL,
  teacher_user_id TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  distance_meters REAL,
  is_inside_school INTEGER DEFAULT 1,
  confirmed_at INTEGER NOT NULL,
  created_at INTEGER,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_user_id) REFERENCES users (id) ON DELETE CASCADE
);
INSERT INTO teacher_confirmations (id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school, confirmed_at, created_at)
SELECT id, schedule_id, teacher_user_id, photo_url, latitude, longitude, distance_meters, is_inside_school, confirmed_at, created_at
FROM teacher_confirmations_new;
DROP INDEX IF EXISTS idx_teacher_confirmations_schedule_id;
DROP INDEX IF EXISTS idx_teacher_confirmations_teacher_user_id;
DROP INDEX IF EXISTS idx_teacher_confirmations_confirmed_at;
CREATE INDEX IF NOT EXISTS idx_teacher_confirmations_schedule_id ON teacher_confirmations (schedule_id);
CREATE INDEX IF NOT EXISTS idx_teacher_confirmations_teacher_user_id ON teacher_confirmations (teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_confirmations_confirmed_at ON teacher_confirmations (confirmed_at);
  `);
  db.unsafeMode(true);
  try {
    db.exec('PRAGMA writable_schema = ON');
    db.prepare(`
      UPDATE sqlite_master
      SET sql = replace(sql, 'teacher_confirmations_new', 'teacher_confirmations')
      WHERE type = 'table' AND name != 'teacher_confirmations_new'
        AND sql LIKE '%teacher_confirmations_new%'
    `).run();
    db.exec('PRAGMA writable_schema = OFF');
  } finally {
    db.unsafeMode(false);
  }
  db.exec('DROP TABLE teacher_confirmations_new');
};
