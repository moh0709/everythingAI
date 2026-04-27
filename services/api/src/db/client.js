import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../data/everythingai.sqlite');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

export function resolveDatabasePath(dbPath = process.env.EVERYTHINGAI_DB_PATH) {
  return path.resolve(dbPath || DEFAULT_DB_PATH);
}

export function openDatabase(dbPath) {
  const resolvedPath = resolveDatabasePath(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  return db;
}

export function upsertIndexedFile(db, fileRecord) {
  const stmt = db.prepare(`
    INSERT INTO indexed_files (
      id,
      filename,
      absolute_path,
      relative_path,
      extension,
      mime_type,
      size_bytes,
      created_at,
      modified_at,
      content_hash,
      index_status,
      last_indexed_at,
      error_message
    )
    VALUES (
      @id,
      @filename,
      @absolute_path,
      @relative_path,
      @extension,
      @mime_type,
      @size_bytes,
      @created_at,
      @modified_at,
      @content_hash,
      @index_status,
      @last_indexed_at,
      @error_message
    )
    ON CONFLICT(absolute_path) DO UPDATE SET
      id = excluded.id,
      filename = excluded.filename,
      relative_path = excluded.relative_path,
      extension = excluded.extension,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      created_at = excluded.created_at,
      modified_at = excluded.modified_at,
      content_hash = excluded.content_hash,
      index_status = excluded.index_status,
      last_indexed_at = excluded.last_indexed_at,
      error_message = excluded.error_message
  `);

  stmt.run(fileRecord);
  syncSearchIndexForFile(db, fileRecord.id);
}

export function listIndexedFiles(db, { limit = 100, status, query } = {}) {
  const clauses = [];
  const params = { limit };

  if (status) {
    clauses.push('index_status = @status');
    params.status = status;
  }

  if (query) {
    clauses.push('(filename LIKE @query OR absolute_path LIKE @query OR extension LIKE @query)');
    params.query = `%${query}%`;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`
    SELECT
      id,
      filename,
      absolute_path,
      relative_path,
      extension,
      mime_type,
      size_bytes,
      created_at,
      modified_at,
      content_hash,
      index_status,
      last_indexed_at,
      error_message
    FROM indexed_files
    ${where}
    ORDER BY last_indexed_at DESC, filename ASC
    LIMIT @limit
  `);

  return stmt.all(params);
}

export function getIndexedFileById(db, fileId) {
  return db.prepare(`
    SELECT
      f.*,
      e.extracted_text,
      e.extraction_status,
      e.extractor_name,
      e.extracted_at,
      e.error_message AS extraction_error_message,
      e.metadata_json
    FROM indexed_files f
    LEFT JOIN file_extractions e ON e.file_id = f.id
    WHERE f.id = ?
  `).get(fileId);
}

export function listFilesForExtraction(db, { limit = 1000, fileId } = {}) {
  if (fileId) {
    const file = getIndexedFileById(db, fileId);
    return file ? [file] : [];
  }

  return db.prepare(`
    SELECT f.*
    FROM indexed_files f
    WHERE f.index_status = 'indexed'
    ORDER BY f.last_indexed_at DESC
    LIMIT ?
  `).all(limit);
}

export function listExtractedFiles(db, { limit = 100, fileId } = {}) {
  const clauses = ["e.extraction_status = 'extracted'", "COALESCE(e.extracted_text, '') != ''"];
  const params = { limit };

  if (fileId) {
    clauses.push('f.id = @fileId');
    params.fileId = fileId;
  }

  return db.prepare(`
    SELECT
      f.id,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension,
      f.mime_type,
      f.size_bytes,
      f.modified_at,
      e.extracted_text,
      e.extracted_at
    FROM indexed_files f
    JOIN file_extractions e ON e.file_id = f.id
    WHERE ${clauses.join(' AND ')}
    ORDER BY e.extracted_at DESC
    LIMIT @limit
  `).all(params);
}

export function upsertFileExtraction(db, extractionRecord) {
  db.prepare(`
    INSERT INTO file_extractions (
      file_id,
      extracted_text,
      extraction_status,
      extractor_name,
      extracted_at,
      error_message,
      metadata_json
    )
    VALUES (
      @file_id,
      @extracted_text,
      @extraction_status,
      @extractor_name,
      @extracted_at,
      @error_message,
      @metadata_json
    )
    ON CONFLICT(file_id) DO UPDATE SET
      extracted_text = excluded.extracted_text,
      extraction_status = excluded.extraction_status,
      extractor_name = excluded.extractor_name,
      extracted_at = excluded.extracted_at,
      error_message = excluded.error_message,
      metadata_json = excluded.metadata_json
  `).run(extractionRecord);

  syncSearchIndexForFile(db, extractionRecord.file_id);
}

export function syncSearchIndexForFile(db, fileId) {
  const row = db.prepare(`
    SELECT
      f.id,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension,
      COALESCE(e.extracted_text, '') AS extracted_text
    FROM indexed_files f
    LEFT JOIN file_extractions e ON e.file_id = f.id
    WHERE f.id = ?
  `).get(fileId);

  db.prepare('DELETE FROM file_search_fts WHERE file_id = ?').run(fileId);

  if (!row) return;

  db.prepare(`
    INSERT INTO file_search_fts (
      file_id,
      filename,
      absolute_path,
      relative_path,
      extension,
      extracted_text
    )
    VALUES (
      @id,
      @filename,
      @absolute_path,
      @relative_path,
      @extension,
      @extracted_text
    )
  `).run(row);
}

function toFtsQuery(query) {
  return query
    .toString()
    .match(/[\p{L}\p{N}_-]+/gu)
    ?.map((term) => `"${term.replaceAll('"', '""')}"`)
    .join(' OR ') || '';
}

export function searchIndexedFiles(db, { query, limit = 20 } = {}) {
  if (!query || !query.toString().trim()) {
    return [];
  }

  const likeQuery = `%${query}%`;
  const ftsQuery = toFtsQuery(query);

  if (!ftsQuery) {
    return [];
  }

  return db.prepare(`
    WITH fts_matches AS (
      SELECT
        file_id,
        bm25(file_search_fts) AS fts_rank,
        snippet(file_search_fts, 5, '[', ']', '...', 24) AS snippet
      FROM file_search_fts
      WHERE file_search_fts MATCH @ftsQuery
    )
    SELECT
      f.id,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension,
      f.mime_type,
      f.size_bytes,
      f.modified_at,
      f.index_status,
      e.extraction_status,
      e.error_message AS extraction_error_message,
      m.snippet,
      CASE
        WHEN f.filename LIKE @likeQuery OR f.absolute_path LIKE @likeQuery OR f.extension LIKE @likeQuery THEN 0
        ELSE 1
      END AS result_rank
    FROM indexed_files f
    LEFT JOIN file_extractions e ON e.file_id = f.id
    LEFT JOIN fts_matches m ON m.file_id = f.id
    WHERE
      f.filename LIKE @likeQuery
      OR f.absolute_path LIKE @likeQuery
      OR f.extension LIKE @likeQuery
      OR m.file_id IS NOT NULL
    ORDER BY result_rank ASC, m.fts_rank ASC, f.modified_at DESC
    LIMIT @limit
  `).all({ query, likeQuery, ftsQuery, limit });
}

export function insertOrganizationSuggestion(db, suggestion) {
  db.prepare(`
    INSERT INTO organization_suggestions (
      id,
      file_id,
      action_type,
      current_value,
      suggested_value,
      reason,
      confidence,
      risk_level,
      requires_approval,
      created_at
    )
    VALUES (
      @id,
      @file_id,
      @action_type,
      @current_value,
      @suggested_value,
      @reason,
      @confidence,
      @risk_level,
      @requires_approval,
      @created_at
    )
  `).run(suggestion);
}

export function listOrganizationSuggestions(db, { fileId, limit = 50 } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('file_id = @fileId');
    params.fileId = fileId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      s.*,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension
    FROM organization_suggestions s
    JOIN indexed_files f ON f.id = s.file_id
    ${where}
    ORDER BY s.created_at DESC
    LIMIT @limit
  `).all(params);
}

export function getOrganizationSuggestionById(db, suggestionId) {
  return db.prepare(`
    SELECT
      s.*,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension
    FROM organization_suggestions s
    JOIN indexed_files f ON f.id = s.file_id
    WHERE s.id = ?
  `).get(suggestionId);
}

export function insertActionPreview(db, preview) {
  db.prepare(`
    INSERT INTO action_previews (
      id,
      suggestion_id,
      file_id,
      action_type,
      source_path,
      target_path,
      current_value,
      suggested_value,
      risk_level,
      requires_approval,
      can_execute,
      blocked_reason,
      preview_status,
      created_at
    )
    VALUES (
      @id,
      @suggestion_id,
      @file_id,
      @action_type,
      @source_path,
      @target_path,
      @current_value,
      @suggested_value,
      @risk_level,
      @requires_approval,
      @can_execute,
      @blocked_reason,
      @preview_status,
      @created_at
    )
  `).run(preview);
}

export function listActionPreviews(db, { fileId, suggestionId, limit = 50 } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('file_id = @fileId');
    params.fileId = fileId;
  }

  if (suggestionId) {
    clauses.push('suggestion_id = @suggestionId');
    params.suggestionId = suggestionId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM action_previews
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params);
}

export function getActionPreviewById(db, previewId) {
  return db.prepare(`
    SELECT
      p.*,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension
    FROM action_previews p
    JOIN indexed_files f ON f.id = p.file_id
    WHERE p.id = ?
  `).get(previewId);
}

export function updateActionPreviewExecutability(db, { previewId, canExecute }) {
  db.prepare(`
    UPDATE action_previews
    SET can_execute = @canExecute
    WHERE id = @previewId
  `).run({ previewId, canExecute });
}

export function updateIndexedFileLocation(db, { fileId, filename, absolutePath, relativePath }) {
  db.prepare(`
    UPDATE indexed_files
    SET
      filename = @filename,
      absolute_path = @absolutePath,
      relative_path = @relativePath
    WHERE id = @fileId
  `).run({ fileId, filename, absolutePath, relativePath });

  syncSearchIndexForFile(db, fileId);
}

export function upsertFileLabel(db, { fileId, tag, category }) {
  const existing = db.prepare('SELECT * FROM file_labels WHERE file_id = ?').get(fileId);
  const tags = new Set(existing ? JSON.parse(existing.tags_json) : []);
  if (tag) tags.add(tag);

  db.prepare(`
    INSERT INTO file_labels (file_id, tags_json, category, updated_at)
    VALUES (@fileId, @tagsJson, @category, @updatedAt)
    ON CONFLICT(file_id) DO UPDATE SET
      tags_json = excluded.tags_json,
      category = COALESCE(excluded.category, file_labels.category),
      updated_at = excluded.updated_at
  `).run({
    fileId,
    tagsJson: JSON.stringify(Array.from(tags).sort()),
    category: category || existing?.category || null,
    updatedAt: new Date().toISOString(),
  });
}

export function insertActionExecution(db, execution) {
  db.prepare(`
    INSERT INTO action_executions (
      id,
      preview_id,
      file_id,
      action_type,
      status,
      source_path,
      target_path,
      undo_source_path,
      undo_target_path,
      error_message,
      executed_at,
      undone_at
    )
    VALUES (
      @id,
      @preview_id,
      @file_id,
      @action_type,
      @status,
      @source_path,
      @target_path,
      @undo_source_path,
      @undo_target_path,
      @error_message,
      @executed_at,
      @undone_at
    )
  `).run(execution);
}

export function getActionExecutionById(db, executionId) {
  return db.prepare(`
    SELECT *
    FROM action_executions
    WHERE id = ?
  `).get(executionId);
}

export function listActionExecutions(db, { fileId, limit = 100 } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('e.file_id = @fileId');
    params.fileId = fileId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      e.*,
      f.filename,
      f.absolute_path
    FROM action_executions e
    LEFT JOIN indexed_files f ON f.id = e.file_id
    ${where}
    ORDER BY e.executed_at DESC
    LIMIT @limit
  `).all(params);
}

export function markActionExecutionUndone(db, executionId) {
  db.prepare(`
    UPDATE action_executions
    SET status = 'undone', undone_at = @undoneAt
    WHERE id = @executionId
  `).run({
    executionId,
    undoneAt: new Date().toISOString(),
  });
}

export function insertAuditLog(db, event) {
  db.prepare(`
    INSERT INTO audit_log (
      id,
      event_type,
      entity_type,
      entity_id,
      payload_json,
      created_at
    )
    VALUES (
      @id,
      @event_type,
      @entity_type,
      @entity_id,
      @payload_json,
      @created_at
    )
  `).run(event);
}

export function listAuditLog(db, { entityType, entityId, limit = 100 } = {}) {
  const clauses = [];
  const params = { limit };

  if (entityType) {
    clauses.push('entity_type = @entityType');
    params.entityType = entityType;
  }

  if (entityId) {
    clauses.push('entity_id = @entityId');
    params.entityId = entityId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM audit_log
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params).map((event) => ({
    ...event,
    payload: JSON.parse(event.payload_json),
  }));
}

export function listFileLabels(db, { fileId, limit = 100 } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('l.file_id = @fileId');
    params.fileId = fileId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      l.*,
      f.filename,
      f.absolute_path
    FROM file_labels l
    JOIN indexed_files f ON f.id = l.file_id
    ${where}
    ORDER BY l.updated_at DESC
    LIMIT @limit
  `).all(params).map((label) => ({
    ...label,
    tags: JSON.parse(label.tags_json),
  }));
}

export function upsertFileInsight(db, insight) {
  db.prepare(`
    INSERT INTO file_insights (
      file_id,
      summary,
      classification,
      entities_json,
      provider,
      status,
      error_message,
      generated_at
    )
    VALUES (
      @file_id,
      @summary,
      @classification,
      @entities_json,
      @provider,
      @status,
      @error_message,
      @generated_at
    )
    ON CONFLICT(file_id) DO UPDATE SET
      summary = excluded.summary,
      classification = excluded.classification,
      entities_json = excluded.entities_json,
      provider = excluded.provider,
      status = excluded.status,
      error_message = excluded.error_message,
      generated_at = excluded.generated_at
  `).run(insight);
}

export function listFileInsights(db, { limit = 100, fileId } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('i.file_id = @fileId');
    params.fileId = fileId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      i.*,
      f.filename,
      f.absolute_path
    FROM file_insights i
    JOIN indexed_files f ON f.id = i.file_id
    ${where}
    ORDER BY i.generated_at DESC
    LIMIT @limit
  `).all(params);
}

export function listDuplicateGroups(db) {
  return db.prepare(`
    SELECT
      content_hash,
      COUNT(*) AS file_count,
      SUM(COALESCE(size_bytes, 0)) AS total_size_bytes,
      json_group_array(json_object(
        'id', id,
        'filename', filename,
        'absolute_path', absolute_path,
        'size_bytes', size_bytes,
        'modified_at', modified_at
      )) AS files_json
    FROM indexed_files
    WHERE
      index_status = 'indexed'
      AND content_hash IS NOT NULL
    GROUP BY content_hash
    HAVING COUNT(*) > 1
    ORDER BY file_count DESC, total_size_bytes DESC
  `).all().map((group) => ({
    ...group,
    files: JSON.parse(group.files_json),
  }));
}

export function upsertWatchRoot(db, watchRoot) {
  db.prepare(`
    INSERT INTO watch_roots (
      id,
      root_path,
      status,
      last_event_at,
      error_message,
      created_at
    )
    VALUES (
      @id,
      @root_path,
      @status,
      @last_event_at,
      @error_message,
      @created_at
    )
    ON CONFLICT(root_path) DO UPDATE SET
      status = excluded.status,
      last_event_at = excluded.last_event_at,
      error_message = excluded.error_message
  `).run(watchRoot);
}

export function upsertFileEmbedding(db, embedding) {
  db.prepare(`
    INSERT INTO file_embeddings (
      file_id,
      embedding_model,
      vector_json,
      token_count,
      generated_at
    )
    VALUES (
      @file_id,
      @embedding_model,
      @vector_json,
      @token_count,
      @generated_at
    )
    ON CONFLICT(file_id) DO UPDATE SET
      embedding_model = excluded.embedding_model,
      vector_json = excluded.vector_json,
      token_count = excluded.token_count,
      generated_at = excluded.generated_at
  `).run(embedding);
}

export function listFileEmbeddings(db, { limit = 1000 } = {}) {
  return db.prepare(`
    SELECT
      e.*,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension,
      x.extracted_text
    FROM file_embeddings e
    JOIN indexed_files f ON f.id = e.file_id
    LEFT JOIN file_extractions x ON x.file_id = f.id
    ORDER BY e.generated_at DESC
    LIMIT ?
  `).all(limit);
}

export function getSystemStatus(db) {
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM indexed_files) AS total_files,
      (SELECT COUNT(*) FROM indexed_files WHERE index_status = 'indexed') AS indexed_files,
      (SELECT COUNT(*) FROM indexed_files WHERE index_status = 'failed') AS failed_files,
      (SELECT COUNT(*) FROM file_extractions WHERE extraction_status = 'extracted') AS extracted_files,
      (SELECT COUNT(*) FROM file_extractions WHERE extraction_status = 'failed') AS failed_extractions,
      (SELECT COUNT(*) FROM file_search_fts) AS searchable_files,
      (SELECT COUNT(*) FROM file_embeddings) AS embedded_files,
      (SELECT COUNT(*) FROM file_insights WHERE status = 'generated') AS insight_files,
      (SELECT COUNT(*) FROM organization_suggestions) AS suggestions,
      (SELECT COUNT(*) FROM action_previews) AS previews,
      (SELECT COUNT(*) FROM action_executions) AS executions,
      (SELECT COUNT(*) FROM action_executions WHERE status = 'undone') AS undone_executions,
      (SELECT COUNT(*) FROM file_labels) AS labeled_files,
      (SELECT COUNT(*) FROM watch_roots WHERE status = 'active') AS active_watch_roots
  `).get();

  const recent = db.prepare(`
    SELECT MAX(last_indexed_at) AS last_indexed_at
    FROM indexed_files
  `).get();

  return {
    ...counts,
    last_indexed_at: recent.last_indexed_at,
  };
}
