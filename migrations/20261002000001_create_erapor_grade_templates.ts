export const up = `
CREATE TABLE IF NOT EXISTS erapor_grade_templates (
  id TEXT PRIMARY KEY NOT NULL,
  academic_year_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  mapel_id TEXT NOT NULL,
  template_html TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE (class_id, subject_id, semester),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_erapor_grade_templates_year ON erapor_grade_templates (academic_year_id);

CREATE TABLE IF NOT EXISTS erapor_student_mappings (
  id TEXT PRIMARY KEY NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  external_member_id TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE (class_id, student_id),
  UNIQUE (class_id, external_member_id),
  FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_erapor_student_mappings_student ON erapor_student_mappings (student_id);
`;

export const down = `
DROP INDEX IF EXISTS idx_erapor_student_mappings_student;
DROP TABLE IF EXISTS erapor_student_mappings;
DROP INDEX IF EXISTS idx_erapor_grade_templates_year;
DROP TABLE IF EXISTS erapor_grade_templates;
`;
