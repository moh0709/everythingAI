import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db/client.js';
import {
  startFolderWatcher,
  stopFolderWatcher,
} from '../src/watcher/watchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-watcher-archive-integration-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-watcher-archive-'));
  await fs.writeFile(path.join(root, 'source.txt'), 'watcher archive integration');
  return { root, db: openDatabase(tempDbPath()) };
}

async function cleanupFixture({ root, db }) {
  try {
    stopFolderWatcher(db, { rootPath: root });
  } catch {
    // A failed start may not have registered a runtime watcher.
  }
  db.close();
  await fs.rm(root, { recursive: true, force: true });
}

test('watcher behavior remains compatible when archive hook is omitted', async () => {
  const fixture = await createFixture();
  try {
    const watcher = await startFolderWatcher(fixture.db, {
      rootPath: fixture.root,
      auto: false,
      extract: false,
      debounceMs: 25,
      logger: { error: () => {} },
    });

    assert.equal(watcher.status, 'active');
    assert.equal(watcher.already_running, false);
    assert.equal(watcher.lastArchiveReview ?? null, null);
  } finally {
    await cleanupFixture(fixture);
  }
});

test('archive hook runs only after successful watcher cycle and receives bounded evidence', async () => {
  const fixture = await createFixture();
  const calls = [];

  try {
    const watcher = await startFolderWatcher(fixture.db, {
      rootPath: fixture.root,
      auto: false,
      extract: false,
      debounceMs: 25,
      logger: { error: () => {} },
      onArchiveWatchCycle: async (evidence) => {
        calls.push(evidence);
        return { candidate_id: 'archive_watch_test', review_mode: 'update_preview' };
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].source, 'watcher');
    assert.equal(calls[0].root_path, path.resolve(fixture.root));
    assert.equal(typeof calls[0].watch_root_id, 'string');
    assert.ok(calls[0].scan);
    assert.equal(calls[0].knowledge, null);
    assert.equal('executor' in calls[0], false);
    assert.equal('archive_executor' in calls[0], false);
    assert.equal('sidecar_writer' in calls[0], false);

    assert.deepEqual(watcher.lastArchiveReview, {
      status: 'ready',
      result: { candidate_id: 'archive_watch_test', review_mode: 'update_preview' },
    });
  } finally {
    await cleanupFixture(fixture);
  }
});

test('archive hook failure is surfaced as integration evidence without failing watcher startup', async () => {
  const fixture = await createFixture();

  try {
    const watcher = await startFolderWatcher(fixture.db, {
      rootPath: fixture.root,
      auto: false,
      extract: false,
      debounceMs: 25,
      logger: { error: () => {} },
      onArchiveWatchCycle: async () => {
        throw new Error('review adapter unavailable');
      },
    });

    assert.equal(watcher.status, 'active');
    assert.deepEqual(watcher.lastArchiveReview, {
      status: 'failed',
      error: 'review adapter unavailable',
    });
  } finally {
    await cleanupFixture(fixture);
  }
});

test('archive hook result is review metadata only and exposes no execution authority', async () => {
  const fixture = await createFixture();

  try {
    const watcher = await startFolderWatcher(fixture.db, {
      rootPath: fixture.root,
      auto: false,
      extract: false,
      debounceMs: 25,
      logger: { error: () => {} },
      onArchiveWatchCycle: async () => ({
        candidate_id: 'archive_watch_read_only',
        execution_allowed: false,
        automatic_approval_allowed: false,
        filesystem_mutation_allowed: false,
      }),
    });

    assert.equal(watcher.lastArchiveReview.status, 'ready');
    assert.equal(watcher.lastArchiveReview.result.execution_allowed, false);
    assert.equal(watcher.lastArchiveReview.result.automatic_approval_allowed, false);
    assert.equal(watcher.lastArchiveReview.result.filesystem_mutation_allowed, false);
    assert.equal('execute' in watcher.lastArchiveReview, false);
    assert.equal('approve' in watcher.lastArchiveReview, false);
  } finally {
    await cleanupFixture(fixture);
  }
});
