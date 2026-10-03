export const up = `
CREATE TABLE IF NOT EXISTS erapor_configuration_audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  action TEXT NOT NULL,
  template_id TEXT,
  academic_year_id TEXT,
  class_id TEXT,
  subject_id TEXT,
  semester INTEGER,
  scope_label TEXT,
  external_id TEXT,
  column_label TEXT,
  old_source_component_type TEXT,
  new_source_component_type TEXT,
  old_mapping_present INTEGER,
  new_mapping_present INTEGER,
  setting_key TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by_user_id TEXT,
  changed_by_name TEXT NOT NULL,
  changed_at INTEGER NOT NULL,
  FOREIGN KEY (template_id) REFERENCES erapor_grade_templates (id) ON DELETE SET NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE SET NULL,
  FOREIGN KEY (changed_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_erapor_config_audit_template
  ON erapor_configuration_audit_logs (template_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_erapor_config_audit_action
  ON erapor_configuration_audit_logs (action, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_erapor_config_audit_scope
  ON erapor_configuration_audit_logs (academic_year_id, subject_id, semester, changed_at DESC);
`;

export const down = `
DROP INDEX IF EXISTS idx_erapor_config_audit_action;
DROP INDEX IF EXISTS idx_erapor_config_audit_scope;
DROP INDEX IF EXISTS idx_erapor_config_audit_template;
DROP TABLE IF EXISTS erapor_configuration_audit_logs;
`;
