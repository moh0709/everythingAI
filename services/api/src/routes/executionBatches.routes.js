import express from 'express';
import {
  approveExecutionBatch,
  attachExecutionToBatch,
  createExecutionBatch,
} from '../services/executionBatchService.js';

const router = express.Router();

router.post('/', (req, res, next) => {
  try {
    const batch = createExecutionBatch(req.db, {
      planningSessionId: req.body?.planningSessionId || null,
      summary: req.body?.summary || {},
    });

    res.status(201).json({ batch });
  } catch (error) {
    next(error);
  }
});

router.post('/:batchId/approve', (req, res, next) => {
  try {
    const batch = approveExecutionBatch(req.db, req.params.batchId);
    res.json({ batch });
  } catch (error) {
    next(error);
  }
});

router.post('/:batchId/executions', (req, res, next) => {
  try {
    const executions = attachExecutionToBatch(req.db, {
      executionId: req.body?.executionId,
      executionBatchId: req.params.batchId,
    });

    res.json({ executions });
  } catch (error) {
    next(error);
  }
});

export default router;
