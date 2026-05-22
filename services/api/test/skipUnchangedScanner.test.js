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
import { createSkipUnchanged } from '../src/indexer/skipUnchanged.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-skip-unchanged-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-skip-unchanged-'));
  await fs.writeFile(path.join(root, 'stable-notes.txt'), 'stable content');
  await fs.writeFile(path.join(root, 'changed-notes.txt'), 'first version');
  return root;
}

async function scanIntoDatabase(root, db, useSkip = false) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    shouldSkipUnchanged: useSkip ? createSkipUnchanged(db) : undefined,
    logger: { error: () => {} },
  });
}

test('scanner skips persisted unchanged files and re-indexes changed files', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  const firstScan = await scanIntoDatabase(root, db, false);
  assert.equal(firstScan.indexed, 2);
  assert.equal(firstScan.skipped_unchanged, 0);

  await fs.writeFile(path.join(root, 'changed-notes.txt'), 'second version');

  const secondScan = await scanIntoDatabase(root, db, true);
  const files = listIndexedFiles(db, { limit: 100 });
  const stable = files.find((file) => file.filename === 'stable-notes.txt');
  const changed = files.find((file) => file.filename === 'changed-notes.txt');

  assert.equal(secondScan.indexed, 1);
  assert.equal(secondScan.skipped_unchanged, 1);
  assert.equal(secondScan.skippedReasons.some((item) => item.reason === 'unchanged'), true);
  assert.equal(stable.index_status, 'indexed');
  assert.equal(changed.index_status, 'indexed');
  assert.notEqual(stable.content_hash, changed.content_hash);

  db.close();
});
