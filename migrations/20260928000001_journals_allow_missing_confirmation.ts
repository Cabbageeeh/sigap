import type SQLite from '@services/SQLite';

// journals.teacher_confirmation_id was created NOT NULL because a journal was
// only ever writable after a QR presence confirmation. Schools that record
// teacher presence elsewhere need journals without one, so the column becomes
// nullable.
//
// The rename/drop/rename rebuild is not usable here: student_attendance
// references journals, and ALTER TABLE RENAME rewrites that reference to the
// temporary table name — the exact corruption 20260820000006 caused and
// 20260914000001 had to repair. PRAGMA foreign_keys = OFF cannot rescue it
// either, because the Migrator already runs each step inside a transaction.
// The column definition is therefore patched in the stored schema text.
const patchNotNull = (sqlite: typeof SQLite, from: string, to: string): void => {
  const db = sqlite.raw();
  db.unsafeMode(true);
  try {
    db.exec('PRAGMA writable_schema = ON');
    const result = db.prepare(`
      UPDATE sqlite_master
      SET sql = replace(sql, ?, ?)
      WHERE type = 'table' AND name = 'journals' AND sql LIKE '%' || ? || '%'
    `).run(from, to, from);
    db.exec('PRAGMA writable_schema = OFF');
    // DDL bumps schema_version so open connections reload the table definition.
    db.exec('CREATE TABLE IF NOT EXISTS _schema_version_bump (id INTEGER); DROP TABLE _schema_version_bump;');
    if (result.changes === 0) throw new Error(`journals schema did not contain "${from}"`);
  } finally {
    db.unsafeMode(false);
  }
};

// The trailing comma keeps each pattern unambiguous: without it, rolling back
// an already-NOT-NULL table would match the prefix of "TEXT NOT NULL," and
// write "TEXT NOT NULL NOT NULL," into the schema.
const NOT_NULL = 'teacher_confirmation_id TEXT NOT NULL,';
const NULLABLE = 'teacher_confirmation_id TEXT,';

export const up = (sqlite: typeof SQLite): void => {
  patchNotNull(sqlite, NOT_NULL, NULLABLE);
  const broken = sqlite.all<{ table: string; rowid: number; parent: string }>('PRAGMA foreign_key_check');
  if (broken.length > 0) throw new Error(`foreign_key_check failed after patch: ${JSON.stringify(broken)}`);
};

export const down = (sqlite: typeof SQLite): void => {
  const orphaned = sqlite.one<{ count: number }>`
    SELECT COUNT(*) AS count FROM journals WHERE teacher_confirmation_id IS NULL
  `;
  if ((orphaned?.count ?? 0) > 0) {
    throw new Error(`${orphaned?.count} journal(s) have no teacher confirmation and cannot go back to NOT NULL`);
  }
  patchNotNull(sqlite, NULLABLE, NOT_NULL);
};
