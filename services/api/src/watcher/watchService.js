import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scanFolder } from '../indexer/fileScanner.js';
import { createSkipUnchanged } from '../indexer/skipUnchanged.js';
import { openDatabase, upsertIndexedFile, upsertWatchRoot } from '../db/client.js';
import { runKnowledgeIngestionPipeline } from '../automation/localPipeline.js';
import { runJob } from '../jobs/jobRunner.js';
import { JOB_TYPES } from '../jobs/jobTypes.js';

const activeWatchers = new Map();
const DEFAULT_DEBOUNCE_MS = Number.parseInt(process.env.EVERYTHINGAI_WATCH_DEBOUNCE_MS || '', 10) || 1000;

function watchId(rootPath) {
  return crypto.createHash('sha256').update(path.resolve(rootPath).toLowerCase()).digest('hex');
}

function resolveWatcherDatabasePath(db) {
  return db?.name || process.env.EVERYTHINGAI_DB_PATH;
}

async function runWatchCycle({
  id,
  absoluteRoot,
  databasePath,
  extract,
  auto,
  logger,
}) {
  const cycleDb = openDatabase(databasePath);
  const insert = cycleDb.transaction((record) => upsertIndexedFile(cycleDb, record));

  try {
    return await runJob({
      type: JOB_TYPES.WATCHER_CYCLE,
      input: {
        source: 'watcher',
        watchRootId: id,
        rootPath: absoluteRoot,
        auto,
        extract,
      },
      initialProgress: {
        currentStep: 'watcher_cycle',
        message: 'Running watcher scan and knowledge ingestion cycle.',
      },
    }, async () => {
      const scan = await scanFolder(absoluteRoot, {
        onRecord: (record) => insert(record),
        shouldSkipUnchanged: createSkipUnchanged(cycleDb),
        logger,
      });
      let knowledge = null;

      if (auto) {
        knowledge = await runKnowledgeIngestionPipeline(cycleDb, { extract, logger });
      }

      upsertWatchRoot(cycleDb, {
        id,
        root_path: absoluteRoot,
        status: 'active',
        last_event_at: new Date().toISOString(),
        error_message: null,
        created_at: new Date().toISOString(),
      });

      return {
        scan,
        knowledge,
      };
    });
  } finally {
    cycleDb.close();
  }
}

function markWatchRootFailed({ id, absoluteRoot, databasePath, error }) {
  const db = openDatabase(databasePath);
  try {
    upsertWatchRoot(db, {
      id,
      root_path: absoluteRoot,
      status: 'failed',
      last_event_at: new Date().toISOString(),
      error_message: error.message,
      created_at: new Date().toISOString(),
    });
  } finally {
    db.close();
  }
}

function snapshotRuntimeState(id, state) {
  return {
    id,
    rootPath: state.absoluteRoot,
    status: 'active',
    running: Boolean(state.running),
    pending: Boolean(state.pending),
    scheduled: Boolean(state.timer),
    debounceMs: state.debounceMs,
    lastJob: state.lastJob,
    lastCycleAt: state.lastCycleAt,
  };
}

export function listActiveWatcherStatuses() {
  return Array.from(activeWatchers.entries()).map(([id, state]) => snapshotRuntimeState(id, state));
}

export function listPersistedActiveWatchRoots(db) {
  return db.prepare(`
    SELECT *
    FROM watch_roots
    WHERE status = 'active'
    ORDER BY root_path ASC
  `).all();
}

export async function startFolderWatcher(db, {
  rootPath,
  extract = true,
  auto = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  logger = console,
} = {}) {
  if (!rootPath) throw new Error('rootPath is required');

  const absoluteRoot = path.resolve(rootPath);
  const id = watchId(absoluteRoot);
  const databasePath = resolveWatcherDatabasePath(db);

  if (!fs.existsSync(absoluteRoot)) {
    const error = new Error(`Watch root does not exist: ${absoluteRoot}`);
    markWatchRootFailed({ id, absoluteRoot, databasePath, error });
    throw error;
  }

  if (activeWatchers.has(id)) {
    return { ...snapshotRuntimeState(id, activeWatchers.get(id)), already_running: true };
  }

  const state = {
    absoluteRoot,
    debounceMs,
    timer: null,
    running: false,
    pending: false,
    lastJob: null,
    lastCycleAt: null,
    close: null,
  };

  async function runQueuedCycle() {
    if (state.running) {
      state.pending = true;
      return;
    }

    state.running = true;
    try {
      do {
        state.pending = false;
        const jobResult = await runWatchCycle({ id, absoluteRoot, databasePath, extract, auto, logger });
        state.lastJob = jobResult.job;
        state.lastCycleAt = new Date().toISOString();
      } while (state.pending);
    } catch (error) {
      logger.error(`Watcher failed for ${absoluteRoot}: ${error.message}`);
      markWatchRootFailed({ id, absoluteRoot, databasePath, error });
    } finally {
      state.running = false;
    }
  }

  function scheduleCycle() {
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = null;
      runQueuedCycle();
    }, debounceMs);
  }

  activeWatchers.set(id, state);

  try {
    await runQueuedCycle();

    const watcher = fs.watch(absoluteRoot, { recursive: true }, () => {
      scheduleCycle();
    });

    state.close = () => {
      if (state.timer) clearTimeout(state.timer);
      watcher.close();
    };
  } catch (error) {
    activeWatchers.delete(id);
    markWatchRootFailed({ id, absoluteRoot, databasePath, error });
    throw error;
  }

  upsertWatchRoot(db, {
    id,
    root_path: absoluteRoot,
    status: 'active',
    last_event_at: null,
    error_message: null,
    created_at: new Date().toISOString(),
  });

  return { ...snapshotRuntimeState(id, state), already_running: false, job: state.lastJob };
}

export function stopFolderWatcher(db, { rootPath }) {
  const absoluteRoot = path.resolve(rootPath);
  const id = watchId(absoluteRoot);
  const watcher = activeWatchers.get(id);

  if (watcher) {
    watcher.close?.();
    activeWatchers.delete(id);
  }

  upsertWatchRoot(db, {
    id,
    root_path: absoluteRoot,
    status: 'stopped',
    last_event_at: new Date().toISOString(),
    error_message: null,
    created_at: new Date().toISOString(),
  });

  return { id, rootPath: absoluteRoot, status: 'stopped' };
}

export async function resumePersistedWatchers(db, {
  logger = console,
  startWatcher = startFolderWatcher,
} = {}) {
  const activeRoots = listPersistedActiveWatchRoots(db);
  const results = [];

  for (const root of activeRoots) {
    try {
      const result = await startWatcher(db, {
        rootPath: root.root_path,
        extract: true,
        auto: true,
        logger,
      });
      results.push({ rootPath: root.root_path, status: 'active', result });
    } catch (error) {
      results.push({ rootPath: root.root_path, status: 'failed', error: error.message });
    }
  }

  return {
    resumed: results.filter((result) => result.status === 'active').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
}
