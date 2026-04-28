CREATE TABLE IF NOT EXISTS indexed_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  absolute_path TEXT NOT NULL UNIQUE,
  relative_path TEXT NOT NULL,
  extension TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT,
  modified_at TEXT,
  content_hash TEXT,
  index_status TEXT NOT NULL CHECK (index_status IN ('indexed', 'failed')),
  last_indexed_at TEXT NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_indexed_files_filename
  ON indexed_files(filename);

CREATE INDEX IF NOT EXISTS idx_indexed_files_extension
  ON indexed_files(extension);

CREATE INDEX IF NOT EXISTS idx_indexed_files_content_hash
  ON indexed_files(content_hash);

CREATE INDEX IF NOT EXISTS idx_indexed_files_status
  ON indexed_files(index_status);

CREATE TABLE IF NOT EXISTS file_extractions (
  file_id TEXT PRIMARY KEY,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('extracted', 'failed', 'unsupported')),
  extractor_name TEXT,
  extracted_at TEXT NOT NULL,
  error_message TEXT,
  metadata_json TEXT,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_extractions_status
  ON file_extractions(extraction_status);

CREATE VIRTUAL TABLE IF NOT EXISTS file_search_fts USING fts5(
  file_id UNINDEXED,
  filename,
  absolute_path,
  relative_path,
  extension,
  extracted_text
);

CREATE TABLE IF NOT EXISTS organization_suggestions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('tag', 'category', 'rename', 'move')),
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence REAL NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_suggestions_file_id
  ON organization_suggestions(file_id);

CREATE TABLE IF NOT EXISTS action_previews (
  id TEXT PRIMARY KEY,
  suggestion_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('tag', 'category', 'rename', 'move')),
  source_path TEXT,
  target_path TEXT,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval INTEGER NOT NULL DEFAULT 1,
  can_execute INTEGER NOT NULL DEFAULT 0,
  blocked_reason TEXT,
  preview_status TEXT NOT NULL CHECK (preview_status IN ('ready', 'blocked')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (suggestion_id) REFERENCES organization_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_previews_suggestion_id
  ON action_previews(suggestion_id);

CREATE INDEX IF NOT EXISTS idx_action_previews_file_id
  ON action_previews(file_id);

CREATE TABLE IF NOT EXISTS file_labels (
  file_id TEXT PRIMARY KEY,
  tags_json TEXT NOT NULL DEFAULT '[]',
  category TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS action_executions (
  id TEXT PRIMARY KEY,
  preview_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('tag', 'category', 'rename', 'move')),
  status TEXT NOT NULL CHECK (status IN ('executed', 'undone', 'failed')),
  source_path TEXT,
  target_path TEXT,
  undo_source_path TEXT,
  undo_target_path TEXT,
  error_message TEXT,
  executed_at TEXT NOT NULL,
  undone_at TEXT,
  FOREIGN KEY (preview_id) REFERENCES action_previews(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_executions_preview_id
  ON action_executions(preview_id);

CREATE INDEX IF NOT EXISTS idx_action_executions_file_id
  ON action_executions(file_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS file_insights (
  file_id TEXT PRIMARY KEY,
  summary TEXT,
  classification TEXT,
  entities_json TEXT NOT NULL DEFAULT '{}',
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('generated', 'failed')),
  error_message TEXT,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_insights_classification
  ON file_insights(classification);

CREATE TABLE IF NOT EXISTS watch_roots (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'stopped', 'failed')),
  last_event_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_embeddings (
  file_id TEXT PRIMARY KEY,
  embedding_model TEXT NOT NULL,
  vector_json TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_embeddings_model
  ON file_embeddings(embedding_model);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
