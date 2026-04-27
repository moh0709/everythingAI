import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import { startFolderWatcher, stopFolderWatcher } from '../watcher/watchService.js';
import { requireBodyString } from '../utils/request.js';

export function createWatchRouter() {
  const router = Router();

  router.post('/watch', async (req, res, next) => {
    try {
      const folderPath = requireBodyString(req, res, 'folderPath');
      if (!folderPath) return;

      const db = openDatabase();
      const result = await startFolderWatcher(db, { rootPath: folderPath, extract: req.body?.extract !== false });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/unwatch', (req, res, next) => {
    try {
      const folderPath = requireBodyString(req, res, 'folderPath');
      if (!folderPath) return;

      const db = openDatabase();
      const result = stopFolderWatcher(db, { rootPath: folderPath });
      db.close();

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
