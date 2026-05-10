import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { moveFileToTrash } from '../src/recovery/trashService.js';
import { searchFiles } from '../src/search/searchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-search-state-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-search-state-'));
  await fs.writeFile(path.join(root, 'Active Search State.txt'), 'active searchable supplier content');
  await fs.writeFile(path.join(root, 'Trash Search State.txt'), 'trash searchable supplier content');
  await fs.writeFile(path.join(root, 'Stale Search State.txt'), 'stale searchable content before deletion');
  await fs.writeFile(path.join(root, 'Broken Search State.pdf'), 'not a real pdf');
  await fs.writeFile(path.join(root, 'Unsupported Search State.mp4'), 'fake media content');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

function fileByName(db, filename) {
  return listIndexedFiles(db, { limit: 100 }).find((file) => file.filename === filename);
}

function resultByName(results, filename) {
  return results.find((result) => result.filename === filename);
}

test('normal search hides trashed files while includeTrashed returns explicit trashed state', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const trashFile = fileByName(db, 'Trash Search State.txt');
  moveFileToTrash(db, { fileId: trashFile.id });

  const normalResults = searchFiles(db, { query: 'Trash Search State', limit: 10 });
  const recoveryResults = searchFiles(db, { query: 'Trash Search State', limit: 10, includeTrashed: true });
  const trashedResult = resultByName(recoveryResults, 'Trash Search State.txt');

  assert.equal(resultByName(normalResults, 'Trash Search State.txt'), undefined);
  assert.equal(Boolean(trashedResult), true);
  assert.equal(trashedResult.recovery_status, 'trashed');
  assert.equal(trashedResult.index_status, 'indexed');
  assert.equal(trashedResult.extraction_status, 'extracted');
  assert.equal(trashedResult.source_reference.file_id, trashFile.id);

  db.close();
});

test('failed extraction files remain searchable by filename with explicit failed extraction state', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const results = searchFiles(db, { query: 'Broken Search State', limit: 10 });
  const brokenResult = resultByName(results, 'Broken Search State.pdf');

  assert.equal(Boolean(brokenResult), true);
  assert.equal(brokenResult.index_status, 'indexed');
  assert.equal(brokenResult.extraction_status, 'failed');
  assert.match(brokenResult.extraction_error_message, /pdf|parse|invalid|bad/i);
  assert.equal(brokenResult.recovery_status, 'active');
  assert.equal(brokenResult.source_reference.filename, 'Broken Search State.pdf');

  db.close();
});

test('unsupported files remain searchable by filename with explicit unsupported extraction state', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const results = searchFiles(db, { query: 'Unsupported Search State', limit: 10 });
  const unsupportedResult = resultByName(results, 'Unsupported Search State.mp4');

  assert.equal(Boolean(unsupportedResult), true);
  assert.equal(unsupportedResult.index_status, 'indexed');
  assert.equal(unsupportedResult.extraction_status, 'unsupported');
  assert.match(unsupportedResult.extraction_error_message, /Unsupported extension: \.mp4/);
  assert.equal(unsupportedResult.recovery_status, 'active');
  assert.equal(unsupportedResult.source_reference.source_type, 'local_file');

  db.close();
});

test('stale missing files remain searchable by filename with explicit failed index state', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const staleFile = fileByName(db, 'Stale Search State.txt');
  await fs.unlink(path.join(root, 'Stale Search State.txt'));
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const results = searchFiles(db, { query: 'Stale Search State', limit: 10 });
  const staleResult = resultByName(results, 'Stale Search State.txt');

  assert.equal(Boolean(staleResult), true);
  assert.equal(staleResult.index_status, 'failed');
  assert.equal(staleResult.extraction_status, null);
  assert.equal(staleResult.extraction_error_message, null);
  assert.equal(staleResult.recovery_status, 'active');
  assert.equal(staleResult.source_reference.file_id, staleFile.id);

  db.close();
});
