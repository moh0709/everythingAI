import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getIndexedFileById,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-stale-extraction-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-stale-extraction-'));
  const filePath = path.join(root, 'Deleted Later.txt');
  await fs.writeFile(filePath, 'This file will be deleted before extraction.');
  return { root, filePath };
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

test('marks missing indexed files as stale failures during extraction', async () => {
  const { root, filePath } = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const indexedFile = listIndexedFiles(db, { limit: 10 })[0];
  await fs.unlink(filePath);

  const result = await extractIndexedFiles(db, { logger: { error: () => {} } });
  const updatedFile = getIndexedFileById(db, indexedFile.id);
  const secondRun = await extractIndexedFiles(db, { logger: { error: () => {} } });

  assert.equal(result.total, 1);
  assert.equal(result.extracted, 0);
  assert.equal(result.failed, 0);
  assert.equal(result.stale_missing, 1);
  assert.equal(result.staleMissingItems.length, 1);
  assert.equal(result.staleMissingItems[0].reason, 'missing_on_disk');
  assert.equal(updatedFile.index_status, 'failed');
  assert.match(updatedFile.error_message, /no longer exists on disk/);
  assert.equal(secondRun.total, 0);
  assert.equal(secondRun.stale_missing, 0);

  db.close();
});
