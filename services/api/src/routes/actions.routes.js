import { Router } from 'express';
import {
  openDatabase,
  listActionExecutions,
  listAuditLog,
  listFileLabels,
} from '../db/client.js';
import { generatePreviewSuggestions } from '../suggestions/suggestionService.js';
import { createActionPreview } from '../previews/actionPreviewService.js';
import { executeActionPreview, undoActionExecution } from '../actions/actionExecutor.js';
import { requireBodyString, parseLimit } from '../utils/request.js';

export function createActionsRouter() {
  const router = Router();

  router.post('/suggestions', (req, res, next) => {
    try {
      const fileId = requireBodyString(req, res, 'fileId');
      if (!fileId) return;

      const db = openDatabase();
      const suggestions = generatePreviewSuggestions(db, { fileId });
      db.close();

      res.status(201).json({ suggestions });
    } catch (error) {
      next(error);
    }
  });

  router.post('/action-previews', async (req, res, next) => {
    try {
      const suggestionId = requireBodyString(req, res, 'suggestionId');
      if (!suggestionId) return;

      const db = openDatabase();
      const preview = await createActionPreview(db, { suggestionId });
      db.close();

      res.status(201).json({ preview });
    } catch (error) {
      next(error);
    }
  });

  router.post('/action-executions', async (req, res, next) => {
    try {
      const previewId = requireBodyString(req, res, 'previewId');
      if (!previewId) return;

      const db = openDatabase();
      const execution = await executeActionPreview(db, {
        previewId,
        approve: req.body?.approve === true,
      });
      db.close();

      res.status(201).json({ execution });
    } catch (error) {
      next(error);
    }
  });

  router.post('/action-executions/:executionId/undo', async (req, res, next) => {
    try {
      const db = openDatabase();
      const execution = await undoActionExecution(db, {
        executionId: req.params.executionId,
        approve: req.body?.approve === true,
      });
      db.close();

      res.json({ execution });
    } catch (error) {
      next(error);
    }
  });

  router.get('/action-executions', (req, res) => {
    const db = openDatabase();
    const executions = listActionExecutions(db, {
      fileId: req.query.fileId?.toString(),
      limit: parseLimit(req.query.limit, 100),
    });
    db.close();

    res.json({ executions });
  });

  router.get('/audit-log', (req, res) => {
    const db = openDatabase();
    const events = listAuditLog(db, {
      entityType: req.query.entityType?.toString(),
      entityId: req.query.entityId?.toString(),
      limit: parseLimit(req.query.limit, 100),
    });
    db.close();

    res.json({ events });
  });

  router.get('/labels', (req, res) => {
    const db = openDatabase();
    const labels = listFileLabels(db, {
      fileId: req.query.fileId?.toString(),
      limit: parseLimit(req.query.limit, 100),
    });
    db.close();

    res.json({ labels });
  });

  return router;
}
