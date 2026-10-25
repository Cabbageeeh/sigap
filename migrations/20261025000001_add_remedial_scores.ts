export const up = `
ALTER TABLE grades ADD COLUMN remedial_score REAL CHECK (remedial_score IS NULL OR (remedial_score >= 0 AND remedial_score <= 100));
ALTER TABLE grade_audit_logs ADD COLUMN old_remedial_score REAL;
ALTER TABLE grade_audit_logs ADD COLUMN new_remedial_score REAL;
`;

export const down = `
ALTER TABLE grades DROP COLUMN remedial_score;
ALTER TABLE grade_audit_logs DROP COLUMN new_remedial_score;
ALTER TABLE grade_audit_logs DROP COLUMN old_remedial_score;
`;
