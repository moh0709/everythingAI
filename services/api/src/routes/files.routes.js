import { Router } from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  openDatabase,
  listIndexedFiles,
  upsertIndexedFile,
  getIndexedFileById,
} from '../db/client.js';
import { scanFolder } from '../indexer/fileScanner.js';
import { extractIndexedFiles } from '../extractors/extractionRunner.js';
import { runKnowledgeIngestionPipeline } from '../automation/localPipeline.js';
import { runJob } from '../jobs/jobRunner.js';
import { JOB_TYPES } from '../jobs/jobTypes.js';
import { requireBodyString, parseLimit } from '../utils/request.js';
import { selectFolder } from '../utils/folderPicker.js';
import { filterActiveFiles } from '../recovery/trashVisibility.js';
import { createDocumentContext } from '../documents/documentContextService.js';

function includeTrashed(queryValue) {
  return queryValue?.toString().toLowerCase() === 'true';
}

function sendDocumentContext(req, res) {
  const db = openDatabase();
  const context = createDocumentContext(db, {
    fileId: req.params.fileId,
  });
  db.close();

  if (!context) {
    return res.status(404).json({ error: 'file not found' });
  }

  return res.json(context);
}

function revealFile(filePath) {
  if (process.platform === 'win32') {
    const normalizedPath = path.normalize(filePath);
    const command = `explorer.exe /select,"${normalizedPath}"`;

    spawn('cmd.exe', ['/c', command], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    }).unref();
    return;
  }

  const folder = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
    ? filePath
    : path.dirname(filePath);

  if (process.platform === 'darwin') {
    spawn('open', ['-R', filePath], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  spawn('xdg-open', [folder], { detached: true, stdio: 'ignore' }).unref();
}

export function createFilesRouter() {
  const router = Router();

  router.get('/files', (req, res) => {
    const db = openDatabase();
    const files = filterActiveFiles(db, listIndexedFiles(db, {
      limit: parseLimit(req.query.limit, 100),
      status: req.query.status?.toString(),
      query: req.query.q?.toString(),
    }), {
      includeTrashed: includeTrashed(req.query.includeTrashed),
    });
    db.close();

    res.json({ files });
  });

  router.get('/files/:fileId/preview', sendDocumentContext);

  router.get('/documents/:fileId/context', sendDocumentContext);

  router.post('/files/:fileId/reveal', (req, res, next) => {
    try {
      const db = openDatabase();
      const file = getIndexedFileById(db, req.params.fileId);
      db.close();

      if (!file) {
        return res.status(404).json({ error: 'file not found' });
      }

      if (!fs.existsSync(file.absolute_path)) {
        return res.status(404).json({ error: 'source file no longer exists', file });
      }

      revealFile(file.absolute_path);
      return res.json({ revealed: true, file });
    } catch (error) {
      return next(error);
    }
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
      let job = null;

      if (automation.enabled) {
        const jobResult = await runJob({
          type: JOB_TYPES.KNOWLEDGE_INGESTION_PIPELINE,
          input: {
            source: 'POST /api/index',
            folderPath,
            limit: parseLimit(req.body?.limit, 1000),
          },
          initialProgress: {
            currentStep: 'knowledge_ingestion',
            message: 'Running knowledge ingestion pipeline.',
          },
        }, async () => runKnowledgeIngestionPipeline(db, {
          limit: parseLimit(req.body?.limit, 1000),
          logger: console,
          useOllama: req.body?.useOllama === true,
        }));

        Object.assign(automation, jobResult.output);
        job = jobResult.job;
      }

      db.close();

      res.status(201).json({ ...result, automation, job });
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
