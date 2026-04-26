import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { scanFolder } from '../indexer/fileScanner.js';
import { extractIndexedFiles } from '../extractors/extractionRunner.js';
import { upsertIndexedFile, upsertWatchRoot } from '../db/client.js';

const activeWatchers = new Map();

function watchId(rootPath) {
  return crypto.createHash('sha256').update(path.resolve(rootPath).toLowerCase()).digest('hex');
}

export async function startFolderWatcher(db, { rootPath, extract = true, logger = console } = {}) {
  if (!rootPath) throw new Error('rootPath is required');

  const absoluteRoot = path.resolve(rootPath);
  const id = watchId(absoluteRoot);

  if (activeWatchers.has(id)) {
    return { id, rootPath: absoluteRoot, status: 'active', already_running: true };
  }

  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  await scanFolder(absoluteRoot, { onRecord: (record) => insert(record), logger });
  if (extract) await extractIndexedFiles(db, { logger });

  const watcher = fs.watch(absoluteRoot, { recursive: true }, async () => {
    try {
      await scanFolder(absoluteRoot, { onRecord: (record) => insert(record), logger });
      if (extract) await extractIndexedFiles(db, { logger });
      upsertWatchRoot(db, {
        id,
        root_path: absoluteRoot,
        status: 'active',
        last_event_at: new Date().toISOString(),
        error_message: null,
        created_at: new Date().toISOString(),
      });
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
    }
  });

  activeWatchers.set(id, watcher);
  upsertWatchRoot(db, {
    id,
    root_path: absoluteRoot,
    status: 'active',
    last_event_at: null,
    error_message: null,
    created_at: new Date().toISOString(),
  });

  return { id, rootPath: absoluteRoot, status: 'active', already_running: false };
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
