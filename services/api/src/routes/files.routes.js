import { Router } from 'express';
import {
  openDatabase,
  listIndexedFiles,
  upsertIndexedFile,
  listFileInsights,
  getIndexedFileById,
} from '../db/client.js';
import { scanFolder } from '../indexer/fileScanner.js';
import { extractIndexedFiles } from '../extractors/extractionRunner.js';
import { runLocalAutomationPipeline } from '../automation/localPipeline.js';
import { requireBodyString, parseLimit } from '../utils/request.js';
import { selectFolder } from '../utils/folderPicker.js';

export function createFilesRouter() {
  const router = Router();

  router.get('/files', (req, res) => {
    const db = openDatabase();
    const files = listIndexedFiles(db, {
      limit: parseLimit(req.query.limit, 100),
      status: req.query.status?.toString(),
      query: req.query.q?.toString(),
    });
    db.close();

    res.json({ files });
  });

  router.get('/files/:fileId/preview', (req, res) => {
    const db = openDatabase();
    const file = getIndexedFileById(db, req.params.fileId);
    const insights = listFileInsights(db, { fileId: req.params.fileId, limit: 1 });
    db.close();

    if (!file) {
      return res.status(404).json({ error: 'file not found' });
    }

    return res.json({
      file,
      insight: insights[0] || null,
      previewText: (file.extracted_text || '').slice(0, 5000),
    });
  });

  router.post('/index', async (req, res, next) => {
    try {
      const folderPath = requireBodyString(req, res, 'folderPath');
      if (!folderPath) return;

      const db = openDatabase();
      const insertRecord = db.transaction((record) => upsertIndexedFile(db, record));
      const result = await scanFolder(folderPath, {
        onRecord: (record) => insertRecord(record),
      });
      const automation = {
        enabled: req.body?.auto !== false,
      };

      if (automation.enabled) {
        Object.assign(automation, await runLocalAutomationPipeline(db, {
          limit: parseLimit(req.body?.limit, 1000),
          logger: console,
          useOllama: req.body?.useOllama === true,
        }));
      }

      db.close();

      res.status(201).json({ ...result, automation });
    } catch (error) {
      next(error);
    }
  });

  router.post('/select-folder', async (_req, res, next) => {
    try {
      res.json(await selectFolder());
    } catch (error) {
      next(error);
    }
  });

  router.post('/extract', async (req, res, next) => {
    try {
      const db = openDatabase();
      const result = await extractIndexedFiles(db, {
        fileId: req.body?.fileId,
        limit: parseLimit(req.body?.limit, 1000),
      });
      db.close();

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
