import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getSystemStatus,
  listIndexedFiles,
  listOrganizationSuggestions,
  openDatabase,
} from '../src/db/client.js';
import { startFolderWatcher, stopFolderWatcher } from '../src/watcher/watchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-watcher-stress-test-${Date.now()}-${Math.random()}.sqlite`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('watcher handles rapid file changes through debounced queued cycles', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-watcher-stress-'));
  const db = openDatabase(tempDbPath());

  await fs.writeFile(path.join(root, 'initial.txt'), 'initial watcher stress content');

  const watcher = await startFolderWatcher(db, {
    rootPath: root,
    extract: true,
    auto: true,
    debounceMs: 75,
    logger: { error: () => {} },
  });

  await Promise.all(Array.from({ length: 8 }, async (_, index) => {
    await fs.writeFile(path.join(root, `rapid-${index}.txt`), `rapid watcher content ${index}`);
  }));

  await fs.writeFile(path.join(root, 'initial.txt'), 'initial watcher stress content updated');
  await wait(2200);

  const files = listIndexedFiles(db, { limit: 100 });
  const filenames = new Set(files.map((file) => file.filename));
  const status = getSystemStatus(db);
  const suggestions = listOrganizationSuggestions(db, { limit: 100 });
  const stopped = stopFolderWatcher(db, { rootPath: root });

  assert.equal(watcher.status, 'active');
  assert.equal(stopped.status, 'stopped');
  assert.equal(filenames.has('initial.txt'), true);

  for (let index = 0; index < 8; index += 1) {
    assert.equal(filenames.has(`rapid-${index}.txt`), true);
  }

  assert.equal(status.indexed_files >= 9, true);
  assert.equal(status.extracted_files >= 9, true);
  assert.equal(status.searchable_files >= 9, true);
  assert.equal(suggestions.length, 0);

  db.close();
});
