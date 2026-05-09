import express from 'express';
import {
  approveExecutionBatch,
  attachExecutionToBatch,
  createExecutionBatch,
  getExecutionBatchDetails,
  listExecutionBatchSummaries,
} from '../services/executionBatchService.js';
import {
  executeExecutionBatch,
  rollbackExecutionBatch,
} from '../services/executionBatchRunnerService.js';

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const batches = listExecutionBatchSummaries(req.db, {
      status: req.query?.status,
      planningSessionId: req.query?.planningSessionId,
      limit: req.query?.limit ? Number(req.query.limit) : undefined,
    });

    res.json({ batches });
  } catch (error) {
    next(error);
  }
});

router.get('/:batchId', (req, res, next) => {
  try {
    const batch = getExecutionBatchDetails(req.db, req.params.batchId);

    if (!batch) {
      return res.status(404).json({
        error: 'Execution batch not found.',
      });
    }

    return res.json({ batch });
  } catch (error) {
    return next(error);
  }
});

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

router.post('/:batchId/execute', async (req, res, next) => {
  try {
    const result = await executeExecutionBatch(req.db, {
      batchId: req.params.batchId,
      approve: req.body?.approve === true,
    });

    res.json({ result });
  } catch (error) {
    next(error);
  }
});

router.post('/:batchId/rollback', async (req, res, next) => {
  try {
    const result = await rollbackExecutionBatch(req.db, {
      batchId: req.params.batchId,
      approve: req.body?.approve === true,
    });

    res.json({ result });
  } catch (error) {
    next(error);
  }
});

export default router;
