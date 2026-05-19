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

CREATE TABLE IF NOT EXISTS planning_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'ready', 'failed', 'archived')),
  mode TEXT NOT NULL CHECK (mode IN ('deterministic', 'provider', 'hybrid')),
  source_json TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_planning_sessions_status
  ON planning_sessions(status);

CREATE INDEX IF NOT EXISTS idx_planning_sessions_created_at
  ON planning_sessions(created_at);

CREATE TABLE IF NOT EXISTS organization_suggestions (
  id TEXT PRIMARY KEY,
  planning_session_id TEXT,
  file_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('tag', 'category', 'rename', 'move')),
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence REAL NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (planning_session_id) REFERENCES planning_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_suggestions_file_id
  ON organization_suggestions(file_id);

CREATE INDEX IF NOT EXISTS idx_organization_suggestions_planning_session_id
  ON organization_suggestions(planning_session_id);

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

CREATE TABLE IF NOT EXISTS execution_batches (
  id TEXT PRIMARY KEY,
  planning_session_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'running', 'completed', 'completed_with_errors', 'failed', 'undone')),
  summary_json TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (planning_session_id) REFERENCES planning_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_execution_batches_status
  ON execution_batches(status);

CREATE INDEX IF NOT EXISTS idx_execution_batches_planning_session_id
  ON execution_batches(planning_session_id);

CREATE TABLE IF NOT EXISTS action_executions (
  id TEXT PRIMARY KEY,
  execution_batch_id TEXT,
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
  FOREIGN KEY (execution_batch_id) REFERENCES execution_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (preview_id) REFERENCES action_previews(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_executions_execution_batch_id
  ON action_executions(execution_batch_id);

CREATE INDEX IF NOT EXISTS idx_action_executions_preview_id
  ON action_executions(preview_id);

CREATE INDEX IF NOT EXISTS idx_action_executions_file_id
  ON action_executions(file_id);

CREATE TABLE IF NOT EXISTS recovery_snapshots (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  preview_id TEXT,
  execution_id TEXT,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('execution_pre_mutation', 'undo_pre_mutation')),
  status TEXT NOT NULL CHECK (status IN ('created', 'used', 'failed')),
  source_path TEXT,
  target_path TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT,
  error_message TEXT,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recovery_snapshots_file_id
  ON recovery_snapshots(file_id);

CREATE INDEX IF NOT EXISTS idx_recovery_snapshots_preview_id
  ON recovery_snapshots(preview_id);

CREATE INDEX IF NOT EXISTS idx_recovery_snapshots_execution_id
  ON recovery_snapshots(execution_id);

CREATE INDEX IF NOT EXISTS idx_recovery_snapshots_status
  ON recovery_snapshots(status);

CREATE TABLE IF NOT EXISTS trash_records (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trashed', 'restored', 'purged')),
  original_absolute_path TEXT NOT NULL,
  original_relative_path TEXT NOT NULL,
  retention_until TEXT NOT NULL,
  trashed_at TEXT NOT NULL,
  restored_at TEXT,
  restore_reason TEXT,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trash_records_file_id
  ON trash_records(file_id);

CREATE INDEX IF NOT EXISTS idx_trash_records_status
  ON trash_records(status);

CREATE INDEX IF NOT EXISTS idx_trash_records_retention_until
  ON trash_records(retention_until);

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

CREATE TABLE IF NOT EXISTS wiki_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('system', 'category', 'topic', 'file')),
  category TEXT,
  subcategory TEXT,
  summary TEXT,
  markdown TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  citation_coverage_score REAL,
  weak_source_warning INTEGER NOT NULL DEFAULT 0,
  rebuild_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('active', 'stale', 'failed', 'archived')),
  generated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug
  ON wiki_pages(slug);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_type
  ON wiki_pages(page_type);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_category
  ON wiki_pages(category);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_status
  ON wiki_pages(status);

CREATE TABLE IF NOT EXISTS wiki_page_sections (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  heading TEXT NOT NULL,
  heading_level INTEGER NOT NULL,
  body_markdown TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  UNIQUE (page_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_sections_page_id
  ON wiki_page_sections(page_id);

CREATE INDEX IF NOT EXISTS idx_wiki_page_sections_key
  ON wiki_page_sections(section_key);

CREATE TABLE IF NOT EXISTS wiki_page_sources (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  filename TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  relative_path TEXT,
  location TEXT,
  evidence TEXT,
  source_order INTEGER NOT NULL,
  source_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE,
  UNIQUE (page_id, source_ref)
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_page_id
  ON wiki_page_sources(page_id);

CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_file_id
  ON wiki_page_sources(file_id);

CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_ref
  ON wiki_page_sources(page_id, source_ref);

CREATE TABLE IF NOT EXISTS wiki_source_chunks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  page_source_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  chunk_ref TEXT NOT NULL,
  chunk_number INTEGER NOT NULL,
  stable_chunk_key TEXT NOT NULL,
  heading TEXT,
  text TEXT NOT NULL,
  evidence TEXT,
  location TEXT,
  line_start INTEGER,
  line_end INTEGER,
  char_start INTEGER,
  char_end INTEGER,
  page_number INTEGER,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (page_source_id) REFERENCES wiki_page_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE,
  UNIQUE (page_id, chunk_ref)
);

CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_page_id
  ON wiki_source_chunks(page_id);

CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_file_id
  ON wiki_source_chunks(file_id);

CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_source
  ON wiki_source_chunks(page_source_id);

CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_ref
  ON wiki_source_chunks(page_id, chunk_ref);

CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_stable_key
  ON wiki_source_chunks(stable_chunk_key);

CREATE TABLE IF NOT EXISTS wiki_page_relations (
  id TEXT PRIMARY KEY,
  source_page_id TEXT NOT NULL,
  target_page_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('category', 'topic', 'source_file', 'semantic', 'entity', 'manual')),
  label TEXT,
  score REAL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (target_page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_source
  ON wiki_page_relations(source_page_id);

CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_target
  ON wiki_page_relations(target_page_id);

CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_type
  ON wiki_page_relations(relation_type);

CREATE TABLE IF NOT EXISTS wiki_rebuilds (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('full', 'incremental', 'selective')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input_json TEXT NOT NULL,
  summary_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_wiki_rebuilds_status
  ON wiki_rebuilds(status);

CREATE INDEX IF NOT EXISTS idx_wiki_rebuilds_created_at
  ON wiki_rebuilds(created_at);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
