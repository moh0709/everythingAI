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
    'wiki_rebuilds',
    'status',
    "TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'))",
  );

  createIndexIfPossible(db, 'wiki_pages', 'status', 'idx_wiki_pages_status');
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
