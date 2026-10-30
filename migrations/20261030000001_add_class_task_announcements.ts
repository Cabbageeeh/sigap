export const up = `
ALTER TABLE announcements ADD COLUMN class_id TEXT REFERENCES classes (id) ON DELETE CASCADE;
ALTER TABLE announcements ADD COLUMN due_date TEXT;
CREATE INDEX IF NOT EXISTS idx_announcements_class_created ON announcements (class_id, created_at);
`;

export const down = `
DROP INDEX IF EXISTS idx_announcements_class_created;
ALTER TABLE announcements DROP COLUMN due_date;
ALTER TABLE announcements DROP COLUMN class_id;
`;
