export const up = `
CREATE TABLE IF NOT EXISTS erapor_column_mappings (
  id TEXT PRIMARY KEY NOT NULL,
  template_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source_component_type TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  UNIQUE (template_id, external_id),
  UNIQUE (template_id, source_component_type),
  FOREIGN KEY (template_id) REFERENCES erapor_grade_templates (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_erapor_column_mappings_template ON erapor_column_mappings (template_id);
`;

export const down = `
DROP INDEX IF EXISTS idx_erapor_column_mappings_template;
DROP TABLE IF EXISTS erapor_column_mappings;
`;
