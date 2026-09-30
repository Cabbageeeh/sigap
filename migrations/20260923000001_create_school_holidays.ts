export const up = `
CREATE TABLE IF NOT EXISTS school_holidays (
  id TEXT PRIMARY KEY NOT NULL,
  date INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_school_holidays_date ON school_holidays (date);
`;

export const down = `
DROP INDEX IF EXISTS idx_school_holidays_date;
DROP TABLE IF EXISTS school_holidays;
`;
