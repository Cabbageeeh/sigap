export const up = `
ALTER TABLE school_locations ADD COLUMN updated_at INTEGER;
UPDATE school_locations SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE teacher_confirmations ADD COLUMN updated_at INTEGER;
UPDATE teacher_confirmations SET updated_at = created_at WHERE updated_at IS NULL;
`;

export const down = `
ALTER TABLE teacher_confirmations DROP COLUMN updated_at;
ALTER TABLE school_locations DROP COLUMN updated_at;
`;
