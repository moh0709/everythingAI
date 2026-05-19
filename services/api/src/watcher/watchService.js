import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scanFolder } from '../indexer/fileScanner.js';
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
      const scan = await scanFolder(absoluteRoot, { onRecord: (record) => insert(record), logger });
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

  if (activeWatchers.has(id)) {
    return { id, rootPath: absoluteRoot, status: 'active', already_running: true };
  }

  let timer = null;
  let running = false;
  let pending = false;
  let lastJob = null;

  async function runQueuedCycle() {
    if (running) {
      pending = true;
      return;
    }

    running = true;
    try {
      do {
        pending = false;
        const jobResult = await runWatchCycle({ id, absoluteRoot, databasePath, extract, auto, logger });
        lastJob = jobResult.job;
      } while (pending);
    } catch (error) {
      logger.error(`Watcher failed for ${absoluteRoot}: ${error.message}`);
      markWatchRootFailed({ id, absoluteRoot, databasePath, error });
    } finally {
      running = false;
    }
  }

  function scheduleCycle() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      runQueuedCycle();
    }, debounceMs);
  }

  await runQueuedCycle();

  const watcher = fs.watch(absoluteRoot, { recursive: true }, () => {
    scheduleCycle();
  });

  activeWatchers.set(id, {
    close() {
      if (timer) clearTimeout(timer);
      watcher.close();
    },
  });

  upsertWatchRoot(db, {
    id,
    root_path: absoluteRoot,
    status: 'active',
    last_event_at: null,
    error_message: null,
    created_at: new Date().toISOString(),
  });

  return { id, rootPath: absoluteRoot, status: 'active', already_running: false, debounceMs, job: lastJob };
}

export function stopFolderWatcher(db, { rootPath }) {
  const absoluteRoot = path.resolve(rootPath);
  const id = watchId(absoluteRoot);
  const watcher = activeWatchers.get(id);

  if (watcher) {
    watcher.close();
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
