function tableExists(db, tableName) {
  return Boolean(db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(tableName));
}

function columnExists(db, tableName, columnName) {
  if (!tableExists(db, tableName)) return false;
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

function addColumnIfMissing(db, tableName, columnName, definition) {
  if (tableExists(db, tableName) && !columnExists(db, tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export function ensureSchemaCompatibilityBeforeSchema(db) {
  addColumnIfMissing(
    db,
    'organization_suggestions',
    'planning_session_id',
    'TEXT REFERENCES planning_sessions(id) ON DELETE SET NULL',
  );

  addColumnIfMissing(
    db,
    'action_executions',
    'execution_batch_id',
    'TEXT REFERENCES execution_batches(id) ON DELETE SET NULL',
  );

  addColumnIfMissing(
    db,
    'wiki_pages',
    'citation_coverage_score',
    'REAL',
  );

  addColumnIfMissing(
    db,
    'wiki_pages',
    'weak_source_warning',
    'INTEGER NOT NULL DEFAULT 0',
  );

  addColumnIfMissing(
    db,
    'wiki_pages',
    'rebuild_version',
    'INTEGER NOT NULL DEFAULT 1',
  );

  addColumnIfMissing(
    db,
    'wiki_pages',
    'status',
    "TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'failed', 'archived'))",
  );

  addColumnIfMissing(
    db,
    'wiki_pages',
    'error_message',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_page_sources',
    'source_ref',
    "TEXT NOT NULL DEFAULT 'S1'",
  );

  addColumnIfMissing(
    db,
    'wiki_page_sources',
    'source_order',
    'INTEGER NOT NULL DEFAULT 1',
  );

  addColumnIfMissing(
    db,
    'wiki_page_sources',
    'source_hash',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'page_source_id',
    "TEXT NOT NULL DEFAULT ''",
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'chunk_ref',
    "TEXT NOT NULL DEFAULT 'S1:C1'",
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'stable_chunk_key',
    "TEXT NOT NULL DEFAULT ''",
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'page_number',
    'INTEGER',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'content_hash',
    "TEXT NOT NULL DEFAULT ''",
  );

  addColumnIfMissing(
    db,
    'wiki_page_relations',
    'source_page_id',
    "TEXT NOT NULL DEFAULT ''",
  );

  addColumnIfMissing(
    db,
    'wiki_page_relations',
    'target_page_id',
    "TEXT NOT NULL DEFAULT ''",
  );

  addColumnIfMissing(
    db,
    'wiki_page_relations',
    'relation_type',
    "TEXT NOT NULL DEFAULT 'semantic' CHECK (relation_type IN ('category', 'topic', 'source_file', 'semantic', 'entity', 'manual'))",
  );

  addColumnIfMissing(
    db,
    'wiki_page_relations',
    'label',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_page_relations',
    'score',
    'REAL',
  );

  addColumnIfMissing(
    db,
    'wiki_page_relations',
    'evidence_json',
    "TEXT NOT NULL DEFAULT '[]'",
  );

  addColumnIfMissing(
    db,
    'wiki_rebuilds',
    'status',
    "TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'))",
  );
}
