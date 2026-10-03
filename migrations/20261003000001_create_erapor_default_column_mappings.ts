export const up = `
CREATE TABLE IF NOT EXISTS erapor_default_column_mappings (
  id TEXT PRIMARY KEY NOT NULL,
  academic_year_id TEXT NOT NULL,
  subject_id TEXT,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  column_key TEXT NOT NULL,
  source_component_type TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_erapor_default_mapping_scope_column
  ON erapor_default_column_mappings (academic_year_id, semester, IFNULL(subject_id, ''), column_key);
CREATE INDEX IF NOT EXISTS idx_erapor_default_mapping_year
  ON erapor_default_column_mappings (academic_year_id, semester, subject_id);
`;

export const down = `
DROP INDEX IF EXISTS idx_erapor_default_mapping_year;
DROP INDEX IF EXISTS idx_erapor_default_mapping_scope_column;
DROP TABLE IF EXISTS erapor_default_column_mappings;
`;
