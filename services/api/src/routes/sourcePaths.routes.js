import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import { openDatabase, upsertIndexedFile, upsertWatchRoot } from '../db/client.js';
import { scanFolder } from '../indexer/fileScanner.js';
import { runLocalAutomationPipeline } from '../automation/localPipeline.js';
import { startFolderWatcher, stopFolderWatcher } from '../watcher/watchService.js';
import { requireBodyString, parseLimit } from '../utils/request.js';

function sourceId(rootPath) {
  return crypto.createHash('sha256').update(path.resolve(rootPath).toLowerCase()).digest('hex');
}

function mapSource(row) {
  return {
    id: row.id,
    path: row.root_path,
    status: row.status,
    watching: row.status === 'active',
    lastRun: row.last_event_at || row.created_at,
    error: row.error_message || null,
  };
}

function listSources(db) {
  return db.prepare(`
    SELECT *
    FROM watch_roots
    ORDER BY created_at DESC, root_path ASC
  `).all().map(mapSource);
}

export function createSourcePathsRouter() {
  const router = Router();

  router.get('/source-paths', (_req, res) => {
    const db = openDatabase();
    const sources = listSources(db);
    db.close();
    res.json({ sources });
  });

  router.post('/source-paths', async (req, res, next) => {
    try {
      const folderPath = requireBodyString(req, res, 'folderPath');
      if (!folderPath) return;

      const absoluteRoot = path.resolve(folderPath);
      const watch = req.body?.watch !== false;
      const db = openDatabase();
      const id = sourceId(absoluteRoot);

      upsertWatchRoot(db, {
        id,
        root_path: absoluteRoot,
        status: 'stopped',
        last_event_at: new Date().toISOString(),
        error_message: null,
        created_at: new Date().toISOString(),
      });

      let result;
      let automation;

      if (watch) {
        result = await startFolderWatcher(db, {
          rootPath: absoluteRoot,
          extract: true,
          auto: true,
          logger: console,
        });
        automation = { enabled: true, mode: 'watcher' };
      } else {
        const insertRecord = db.transaction((record) => upsertIndexedFile(db, record));
        result = await scanFolder(absoluteRoot, { onRecord: (record) => insertRecord(record) });
        automation = await runLocalAutomationPipeline(db, {
          limit: parseLimit(req.body?.limit, 1000),
          logger: console,
          useOllama: req.body?.useOllama === true,
        });
        upsertWatchRoot(db, {
          id,
          root_path: absoluteRoot,
          status: 'stopped',
          last_event_at: new Date().toISOString(),
          error_message: null,
          created_at: new Date().toISOString(),
        });
      }

      const sources = listSources(db);
      db.close();
      res.status(201).json({ source: sources.find((source) => source.id === id), sources, result, automation });
    } catch (error) {
      next(error);
    }
  });

  router.post('/source-paths/pause', (req, res, next) => {
    try {
      const folderPath = requireBodyString(req, res, 'folderPath');
      if (!folderPath) return;
      const db = openDatabase();
      const result = stopFolderWatcher(db, { rootPath: folderPath });
      const sources = listSources(db);
      db.close();
      res.json({ result, sources });
    } catch (error) {
      next(error);
    }
  });

  router.post('/source-paths/resume', async (req, res, next) => {
    try {
      const folderPath = requireBodyString(req, res, 'folderPath');
      if (!folderPath) return;
      const db = openDatabase();
      const result = await startFolderWatcher(db, {
        rootPath: folderPath,
        extract: true,
        auto: true,
        logger: console,
      });
      const sources = listSources(db);
      db.close();
      res.json({ result, sources });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/source-paths', (req, res, next) => {
    try {
      const folderPath = requireBodyString(req, res, 'folderPath');
      if (!folderPath) return;
      const db = openDatabase();
      stopFolderWatcher(db, { rootPath: folderPath });
      db.prepare('DELETE FROM watch_roots WHERE root_path = ?').run(path.resolve(folderPath));
      const sources = listSources(db);
      db.close();
      res.json({ sources });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
