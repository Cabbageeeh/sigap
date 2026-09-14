import type SQLite from '@services/SQLite';

// Repairs FK references rewritten to stale *_old table names by the
// rename-rebuild in 20260820000006 (SQLite rewrites FK references on
// ALTER TABLE RENAME, and the rewrite cannot be disabled on this version).
// journals.teacher_confirmation_id ended up pointing at the dropped
// teacher_confirmations_old, which makes every DELETE cascading through
// schedules -> journals fail at prepare time ("no such table").
// A rebuild via rename/drop would either re-corrupt student_attendance's
// FK or cascade-wipe its rows, so the schema text is patched in place via
// writable_schema instead. The trailing DDL bumps schema_version so other
// connections discard their cached schema.
const repairStaleFkRefs = (sqlite: typeof SQLite): void => {
  const db = sqlite.raw();
  db.unsafeMode(true);
  try {
    db.exec('PRAGMA writable_schema = ON');
    db.prepare(`
      UPDATE sqlite_master
      SET sql = replace(sql, 'teacher_confirmations_old', 'teacher_confirmations')
      WHERE type = 'table' AND name != 'teacher_confirmations_old'
        AND sql LIKE '%teacher_confirmations_old%'
    `).run();
    db.prepare(`
      UPDATE sqlite_master
      SET sql = replace(sql, 'journals_old', 'journals')
      WHERE type = 'table' AND name != 'journals_old'
        AND sql LIKE '%journals_old%'
    `).run();
    db.exec('PRAGMA writable_schema = OFF');
    db.exec('CREATE TABLE IF NOT EXISTS _schema_version_bump (id INTEGER); DROP TABLE _schema_version_bump;');
  } finally {
    db.unsafeMode(false);
  }
};

export const up = repairStaleFkRefs;

// Rollback re-runs the same repair: the pre-migration state was corrupted,
// so there is no meaningful schema to restore.
export const down = repairStaleFkRefs;
