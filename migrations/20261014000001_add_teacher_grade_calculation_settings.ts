export const up = `
ALTER TABLE grades ADD COLUMN initial_score REAL;
ALTER TABLE grade_audit_logs ADD COLUMN old_initial_score REAL;
ALTER TABLE grade_audit_logs ADD COLUMN new_initial_score REAL;

CREATE TABLE IF NOT EXISTS teacher_grade_calculation_settings (
  id TEXT PRIMARY KEY NOT NULL,
  academic_year_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_user_id TEXT NOT NULL,
  calculation_mode TEXT NOT NULL DEFAULT 'average' CHECK (calculation_mode IN ('weighted', 'average')),
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE (academic_year_id, class_id, subject_id, teacher_user_id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_grade_component_weights (
  id TEXT PRIMARY KEY NOT NULL,
  setting_id TEXT NOT NULL,
  component_type TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE (setting_id, component_type),
  FOREIGN KEY (setting_id) REFERENCES teacher_grade_calculation_settings (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_settings_scope
  ON teacher_grade_calculation_settings (class_id, subject_id, teacher_user_id);
`;

export const down = `
DROP INDEX IF EXISTS idx_teacher_grade_settings_scope;
DROP TABLE IF EXISTS teacher_grade_component_weights;
DROP TABLE IF EXISTS teacher_grade_calculation_settings;
ALTER TABLE grades DROP COLUMN initial_score;
ALTER TABLE grade_audit_logs DROP COLUMN new_initial_score;
ALTER TABLE grade_audit_logs DROP COLUMN old_initial_score;
`;
