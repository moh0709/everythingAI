import { Router } from 'express';
import { openDatabase } from '../db/client.js';
import {
  approveExecutionBatch,
  createExecutionBatch,
  getExecutionBatchDetail,
  listExecutionBatchSummaries,
  runExecutionBatch,
} from '../executionBatches/executionBatchService.js';
import { parseLimit } from '../utils/request.js';

export function createExecutionBatchesRouter() {
  const router = Router();

  router.post('/execution-batches', (req, res, next) => {
    try {
      const db = openDatabase();
      const batch = createExecutionBatch(db, {
        previewIds: req.body?.previewIds,
        planningSessionId: req.body?.planningSessionId || null,
      });
      db.close();

      res.status(201).json({ batch });
    } catch (error) {
      next(error);
    }
  });

  router.get('/execution-batches', (req, res, next) => {
    try {
      const db = openDatabase();
      const batches = listExecutionBatchSummaries(db, {
        status: req.query.status?.toString(),
        planningSessionId: req.query.planningSessionId?.toString(),
        limit: parseLimit(req.query.limit, 100),
      });
      db.close();

      res.json({ batches });
    } catch (error) {
      next(error);
    }
  });

  router.get('/execution-batches/:batchId', (req, res, next) => {
    try {
      const db = openDatabase();
      const batch = getExecutionBatchDetail(db, req.params.batchId);
      db.close();

      if (!batch) {
        return res.status(404).json({ error: 'Execution batch not found.' });
      }

      return res.json({ batch });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/execution-batches/:batchId/approve', (req, res, next) => {
    try {
      const db = openDatabase();
      const batch = approveExecutionBatch(db, {
        batchId: req.params.batchId,
        approve: req.body?.approve === true,
      });
      db.close();

      res.json({ batch });
    } catch (error) {
      next(error);
    }
  });

  router.post('/execution-batches/:batchId/run', async (req, res, next) => {
    try {
      const db = openDatabase();
      const batch = await runExecutionBatch(db, {
        batchId: req.params.batchId,
        approve: req.body?.approve === true,
      });
      db.close();

      res.json({ batch });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createExecutionBatchesRouter;
