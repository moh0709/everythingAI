import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {
  openDatabase,
  upsertWatchRoot,
} from '../src/db/client.js';
import {
  listPersistedActiveWatchRoots,
  resumePersistedWatchers,
} from '../src/watcher/watchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-source-watchers-${Date.now()}-${Math.random()}.sqlite`);
}

function watchRootId(rootPath) {
  return crypto.createHash('sha256').update(path.resolve(rootPath).toLowerCase()).digest('hex');
}

function insertWatchRoot(db, { rootPath, status }) {
  upsertWatchRoot(db, {
    id: watchRootId(rootPath),
    root_path: path.resolve(rootPath),
    status,
    last_event_at: new Date().toISOString(),
    error_message: null,
    created_at: new Date().toISOString(),
  });
}

test('persisted active source paths are selected for restart resume', () => {
  const db = openDatabase(tempDbPath());
  const activeRoot = path.join(os.tmpdir(), 'everythingai-active-source');
  const stoppedRoot = path.join(os.tmpdir(), 'everythingai-stopped-source');

  try {
    insertWatchRoot(db, { rootPath: activeRoot, status: 'active' });
    insertWatchRoot(db, { rootPath: stoppedRoot, status: 'stopped' });

    const activeRoots = listPersistedActiveWatchRoots(db);

    assert.equal(activeRoots.length, 1);
    assert.equal(activeRoots[0].root_path, path.resolve(activeRoot));
  } finally {
    db.close();
  }
});

test('resumePersistedWatchers restarts only persisted active source paths', async () => {
  const db = openDatabase(tempDbPath());
  const activeOne = path.join(os.tmpdir(), 'everythingai-active-one');
  const activeTwo = path.join(os.tmpdir(), 'everythingai-active-two');
  const stopped = path.join(os.tmpdir(), 'everythingai-stopped');
  const started = [];

  try {
    insertWatchRoot(db, { rootPath: activeOne, status: 'active' });
    insertWatchRoot(db, { rootPath: activeTwo, status: 'active' });
    insertWatchRoot(db, { rootPath: stopped, status: 'stopped' });

    const result = await resumePersistedWatchers(db, {
      logger: { error: () => {}, log: () => {} },
      startWatcher: async (_db, options) => {
        started.push(path.resolve(options.rootPath));
        return { rootPath: path.resolve(options.rootPath), already_running: false };
      },
    });

    assert.equal(result.resumed, 2);
    assert.equal(result.failed, 0);
    assert.deepEqual(started.sort(), [path.resolve(activeOne), path.resolve(activeTwo)].sort());
    assert.equal(started.includes(path.resolve(stopped)), false);
  } finally {
    db.close();
  }
});

test('resumePersistedWatchers reports failed persisted source paths without aborting remaining resumes', async () => {
  const db = openDatabase(tempDbPath());
  const goodRoot = path.join(os.tmpdir(), 'everythingai-good-source');
  const badRoot = path.join(os.tmpdir(), 'everythingai-bad-source');

  try {
    insertWatchRoot(db, { rootPath: badRoot, status: 'active' });
    insertWatchRoot(db, { rootPath: goodRoot, status: 'active' });

    const result = await resumePersistedWatchers(db, {
      logger: { error: () => {}, log: () => {} },
      startWatcher: async (_db, options) => {
        if (path.resolve(options.rootPath) === path.resolve(badRoot)) {
          throw new Error('simulated missing source path');
        }
        return { rootPath: path.resolve(options.rootPath), already_running: false };
      },
    });

    assert.equal(result.resumed, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.results.some((item) => item.rootPath === path.resolve(goodRoot) && item.status === 'active'), true);
    assert.equal(result.results.some((item) => item.rootPath === path.resolve(badRoot) && item.status === 'failed' && /simulated/.test(item.error)), true);
  } finally {
    db.close();
  }
});
