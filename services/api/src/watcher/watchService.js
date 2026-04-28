import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scanFolder } from '../indexer/fileScanner.js';
import { upsertIndexedFile, upsertWatchRoot } from '../db/client.js';
import { runLocalAutomationPipeline } from '../automation/localPipeline.js';

const activeWatchers = new Map();
const DEFAULT_DEBOUNCE_MS = Number.parseInt(process.env.EVERYTHINGAI_WATCH_DEBOUNCE_MS || '', 10) || 1000;

function watchId(rootPath) {
  return crypto.createHash('sha256').update(path.resolve(rootPath).toLowerCase()).digest('hex');
}

async function runWatchCycle(db, {
  id,
  absoluteRoot,
  insert,
  extract,
  auto,
  logger,
}) {
  await scanFolder(absoluteRoot, { onRecord: (record) => insert(record), logger });

  if (auto) {
    await runLocalAutomationPipeline(db, { extract, logger });
  }

  upsertWatchRoot(db, {
    id,
    root_path: absoluteRoot,
    status: 'active',
    last_event_at: new Date().toISOString(),
    error_message: null,
    created_at: new Date().toISOString(),
  });
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

  if (activeWatchers.has(id)) {
    return { id, rootPath: absoluteRoot, status: 'active', already_running: true };
  }

  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  let timer = null;
  let running = false;
  let pending = false;

  async function runQueuedCycle() {
    if (running) {
      pending = true;
      return;
    }

    running = true;
    try {
      do {
        pending = false;
        await runWatchCycle(db, { id, absoluteRoot, insert, extract, auto, logger });
      } while (pending);
    } catch (error) {
      logger.error(`Watcher failed for ${absoluteRoot}: ${error.message}`);
      upsertWatchRoot(db, {
        id,
        root_path: absoluteRoot,
        status: 'failed',
        last_event_at: new Date().toISOString(),
        error_message: error.message,
        created_at: new Date().toISOString(),
      });
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

  return { id, rootPath: absoluteRoot, status: 'active', already_running: false, debounceMs };
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
