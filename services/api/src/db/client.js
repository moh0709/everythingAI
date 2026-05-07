import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../data/everythingai.sqlite');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

function ensurePlanningSessionSchema(db) {
  const suggestionColumns = db.prepare(`PRAGMA table_info(organization_suggestions)`).all();
  const hasPlanningSessionId = suggestionColumns.some((column) => column.name === 'planning_session_id');

  if (!hasPlanningSessionId) {
    db.exec(`
      ALTER TABLE organization_suggestions
      ADD COLUMN planning_session_id TEXT REFERENCES planning_sessions(id) ON DELETE SET NULL
    `);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_organization_suggestions_planning_session_id
    ON organization_suggestions(planning_session_id)
  `);
}

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
  ensurePlanningSessionSchema(db);

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

export function insertPlanningSession(db, session) {
  db.prepare(`
    INSERT INTO planning_sessions (
      id,
      status,
      mode,
      source_json,
      settings_json,
      summary_json,
      error_message,
      created_at,
      updated_at,
      completed_at
    )
    VALUES (
      @id,
      @status,
      @mode,
      @source_json,
      @settings_json,
      @summary_json,
      @error_message,
      @created_at,
      @updated_at,
      @completed_at
    )
  `).run(session);
}

export function updatePlanningSession(db, session) {
  db.prepare(`
    UPDATE planning_sessions
    SET
      status = @status,
      mode = @mode,
      source_json = @source_json,
      settings_json = @settings_json,
      summary_json = @summary_json,
      error_message = @error_message,
      updated_at = @updated_at,
      completed_at = @completed_at
    WHERE id = @id
  `).run(session);
}

export function getPlanningSessionById(db, sessionId) {
  const row = db.prepare(`
    SELECT *
    FROM planning_sessions
    WHERE id = ?
  `).get(sessionId);

  if (!row) return null;

  return {
    ...row,
    source: JSON.parse(row.source_json),
    settings: JSON.parse(row.settings_json),
    summary: JSON.parse(row.summary_json),
  };
}

export function listPlanningSessions(db, { limit = 100, status } = {}) {
  const clauses = [];
  const params = { limit };

  if (status) {
    clauses.push('status = @status');
    params.status = status;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM planning_sessions
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params).map((row) => ({
    ...row,
    source: JSON.parse(row.source_json),
    settings: JSON.parse(row.settings_json),
    summary: JSON.parse(row.summary_json),
  }));
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
