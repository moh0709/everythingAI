import {
  getExecutionBatchDetails,
  transitionExecutionBatchStatus,
} from './executionBatchService.js';
import {
  getActionPreviewById,
  insertAuditLog,
} from '../db/client.js';
import {
  validateActionPreview,
} from './previewValidationService.js';
import {
  executeActionPreview,
  undoActionExecution,
} from '../actions/actionExecutor.js';
import crypto from 'node:crypto';

function createId(prefix) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function audit(db, { eventType, entityId, payload }) {
  insertAuditLog(db, {
    id: createId('audit'),
    event_type: eventType,
    entity_type: 'execution_batch',
    entity_id: entityId,
    payload_json: JSON.stringify(payload),
    created_at: new Date().toISOString(),
  });
}

export async function executeExecutionBatch(db, {
  batchId,
  approve = false,
} = {}) {
  if (!approve) {
    throw new Error('Explicit approval is required to execute an execution batch.');
  }

  const batch = getExecutionBatchDetails(db, batchId);

  if (!batch) {
    throw new Error(`Execution batch not found: ${batchId}`);
  }

  if (batch.status !== 'approved') {
    throw new Error(`Execution batch cannot execute from status: ${batch.status}`);
  }

  transitionExecutionBatchStatus(db, {
    batchId: batch.id,
    status: 'running',
  });

  audit(db, {
    eventType: 'execution_batch.started',
    entityId: batch.id,
    payload: {
      batch_id: batch.id,
      execution_count: batch.executions.length,
    },
  });

  const results = [];

  for (const execution of batch.executions) {
    if (!execution.preview_id) {
      results.push({
        execution_id: execution.id,
        status: 'skipped',
        reason: 'missing_preview_reference',
      });

      continue;
    }

    const preview = getActionPreviewById(db, execution.preview_id);
    const validation = validateActionPreview(preview);

    if (!validation.valid) {
      results.push({
        execution_id: execution.id,
        preview_id: execution.preview_id,
        status: 'blocked',
        reason: validation.reason,
      });

      continue;
    }

    try {
      const executed = await executeActionPreview(db, {
        previewId: execution.preview_id,
        approve: true,
      });

      results.push({
        execution_id: executed.id,
        preview_id: execution.preview_id,
        status: 'executed',
      });
    } catch (error) {
      results.push({
        execution_id: execution.id,
        preview_id: execution.preview_id,
        status: 'failed',
        reason: error.message,
      });
    }
  }

  const summary = {
    batch_id: batch.id,
    status: 'completed',
    executed_count: results.filter((r) => r.status === 'executed').length,
    blocked_count: results.filter((r) => r.status === 'blocked').length,
    failed_count: results.filter((r) => r.status === 'failed').length,
    skipped_count: results.filter((r) => r.status === 'skipped').length,
    results,
  };

  transitionExecutionBatchStatus(db, {
    batchId: batch.id,
    status: 'completed',
  });

  audit(db, {
    eventType: 'execution_batch.completed',
    entityId: batch.id,
    payload: summary,
  });

  return summary;
}

export async function rollbackExecutionBatch(db, {
  batchId,
  approve = false,
} = {}) {
  if (!approve) {
    throw new Error('Explicit approval is required to rollback an execution batch.');
  }

  const batch = getExecutionBatchDetails(db, batchId);

  if (!batch) {
    throw new Error(`Execution batch not found: ${batchId}`);
  }

  audit(db, {
    eventType: 'execution_batch.rollback_started',
    entityId: batch.id,
    payload: {
      batch_id: batch.id,
      execution_count: batch.executions.length,
    },
  });

  const rollbackResults = [];

  for (const execution of [...batch.executions].reverse()) {
    if (execution.status !== 'executed') {
      rollbackResults.push({
        execution_id: execution.id,
        status: 'skipped',
        reason: 'execution_not_executed',
      });

      continue;
    }

    try {
      const undone = await undoActionExecution(db, {
        executionId: execution.id,
        approve: true,
      });

      rollbackResults.push({
        execution_id: execution.id,
        status: 'undone',
        undone_at: undone.undone_at,
      });
    } catch (error) {
      rollbackResults.push({
        execution_id: execution.id,
        status: 'failed',
        reason: error.message,
      });
    }
  }

  const summary = {
    batch_id: batch.id,
    status: 'rolled_back',
    undone_count: rollbackResults.filter((r) => r.status === 'undone').length,
    failed_count: rollbackResults.filter((r) => r.status === 'failed').length,
    skipped_count: rollbackResults.filter((r) => r.status === 'skipped').length,
    results: rollbackResults,
  };

  transitionExecutionBatchStatus(db, {
    batchId: batch.id,
    status: 'rolled_back',
  });

  audit(db, {
    eventType: 'execution_batch.rollback_completed',
    entityId: batch.id,
    payload: summary,
  });

  return summary;
}
