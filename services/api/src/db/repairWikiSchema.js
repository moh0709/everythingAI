import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DB_PATH = path.resolve(__dirname, '../../data/everythingai.sqlite');

function resolveDatabasePath() {
  return path.resolve(process.env.EVERYTHINGAI_DB_PATH || DEFAULT_DB_PATH);
}

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
  if (!tableExists(db, tableName)) {
    console.log(`[skip] ${tableName}.${columnName}: table does not exist`);
    return;
  }

  if (columnExists(db, tableName, columnName)) {
    console.log(`[ok] ${tableName}.${columnName}: already exists`);
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  console.log(`[fixed] ${tableName}.${columnName}: added`);
}

function createIndexIfPossible(db, tableName, columnName, indexName) {
  if (!tableExists(db, tableName) || !columnExists(db, tableName, columnName)) return;
  db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnName})`);
  console.log(`[ok] ${indexName}: ensured`);
}

function createCompositeIndexIfPossible(db, tableName, columnNames, indexName) {
  if (!tableExists(db, tableName)) return;
  if (!columnNames.every((columnName) => columnExists(db, tableName, columnName))) return;
  db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnNames.join(', ')})`);
  console.log(`[ok] ${indexName}: ensured`);
}

function backfillWikiSourceRefs(db) {
  if (!tableExists(db, 'wiki_page_sources') || !columnExists(db, 'wiki_page_sources', 'source_ref')) return;

  const columns = db.prepare('PRAGMA table_info(wiki_page_sources)').all().map((column) => column.name);
  const hasSourceOrder = columns.includes('source_order');

  if (hasSourceOrder) {
    db.exec(`
      UPDATE wiki_page_sources
      SET source_ref = 'S' || COALESCE(source_order, 1)
      WHERE source_ref IS NULL OR source_ref = ''
    `);
  } else {
    db.exec(`
      UPDATE wiki_page_sources
      SET source_ref = 'S1'
      WHERE source_ref IS NULL OR source_ref = ''
    `);
  }

  console.log('[ok] wiki_page_sources.source_ref: backfilled where empty');
}

function backfillWikiChunkRefs(db) {
  if (!tableExists(db, 'wiki_source_chunks')) return;

  if (columnExists(db, 'wiki_source_chunks', 'source_ref')) {
    db.exec(`
      UPDATE wiki_source_chunks
      SET source_ref = 'S1'
      WHERE source_ref IS NULL OR source_ref = ''
    `);
    console.log('[ok] wiki_source_chunks.source_ref: backfilled where empty');
  }

  if (columnExists(db, 'wiki_source_chunks', 'chunk_ref')) {
    db.exec(`
      UPDATE wiki_source_chunks
      SET chunk_ref = COALESCE(source_ref, 'S1') || ':C' || COALESCE(chunk_number, 1)
      WHERE chunk_ref IS NULL OR chunk_ref = ''
    `);
    console.log('[ok] wiki_source_chunks.chunk_ref: backfilled where empty');
  }

  if (columnExists(db, 'wiki_source_chunks', 'stable_chunk_key')) {
    db.exec(`
      UPDATE wiki_source_chunks
      SET stable_chunk_key = COALESCE(file_id, '') || ':' || COALESCE(chunk_ref, id)
      WHERE stable_chunk_key IS NULL OR stable_chunk_key = ''
    `);
    console.log('[ok] wiki_source_chunks.stable_chunk_key: backfilled where empty');
  }

  if (columnExists(db, 'wiki_source_chunks', 'content_hash')) {
    db.exec(`
      UPDATE wiki_source_chunks
      SET content_hash = COALESCE(content_hash, id)
      WHERE content_hash IS NULL OR content_hash = ''
    `);
    console.log('[ok] wiki_source_chunks.content_hash: backfilled where empty');
  }
}

function repairWikiSchema(db) {
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
    'relative_path',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_page_sources',
    'location',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_page_sources',
    'evidence',
    'TEXT',
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
    'source_ref',
    "TEXT NOT NULL DEFAULT 'S1'",
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
    'chunk_number',
    'INTEGER NOT NULL DEFAULT 1',
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
    'heading',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'evidence',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'location',
    'TEXT',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'line_start',
    'INTEGER',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'line_end',
    'INTEGER',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'char_start',
    'INTEGER',
  );

  addColumnIfMissing(
    db,
    'wiki_source_chunks',
    'char_end',
    'INTEGER',
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

  backfillWikiSourceRefs(db);
  backfillWikiChunkRefs(db);

  createIndexIfPossible(db, 'wiki_pages', 'status', 'idx_wiki_pages_status');
  createCompositeIndexIfPossible(db, 'wiki_page_sources', ['page_id', 'source_ref'], 'idx_wiki_page_sources_ref');
  createCompositeIndexIfPossible(db, 'wiki_source_chunks', ['page_id', 'chunk_ref'], 'idx_wiki_source_chunks_ref');
  createIndexIfPossible(db, 'wiki_source_chunks', 'stable_chunk_key', 'idx_wiki_source_chunks_stable_key');
  createIndexIfPossible(db, 'wiki_rebuilds', 'status', 'idx_wiki_rebuilds_status');
}

function main() {
  const dbPath = resolveDatabasePath();

  if (!fs.existsSync(dbPath)) {
    console.log(`No database found at ${dbPath}. Nothing to repair.`);
    return;
  }

  console.log(`Repairing Wiki schema in ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  try {
    repairWikiSchema(db);
    console.log('Wiki schema repair completed.');
  } finally {
    db.close();
  }
}

main();
