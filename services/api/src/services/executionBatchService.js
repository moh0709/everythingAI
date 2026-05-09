import crypto from 'node:crypto';
import {
  assignExecutionToBatch,
  getExecutionBatchById,
  insertExecutionBatch,
  listExecutionBatches,
  listExecutionsForBatch,
  updateExecutionBatch,
} from '../db/repositories/executionRepository.js';

function createId(prefix) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

export function createExecutionBatch(db, {
  planningSessionId = null,
  summary = {},
} = {}) {
  const now = new Date().toISOString();

  const batch = {
    id: createId('execution_batch'),
    planning_session_id: planningSessionId,
    status: 'pending_approval',
    summary_json: JSON.stringify(summary),
    error_message: null,
    created_at: now,
    updated_at: now,
    approved_at: null,
    started_at: null,
    completed_at: null,
  };

  insertExecutionBatch(db, batch);

  return getExecutionBatchById(db, batch.id);
}

export function approveExecutionBatch(db, batchId) {
  const batch = getExecutionBatchById(db, batchId);

  if (!batch) {
    throw new Error(`Execution batch not found: ${batchId}`);
  }

  if (batch.status !== 'pending_approval') {
    throw new Error(`Execution batch cannot be approved from status: ${batch.status}`);
  }

  updateExecutionBatch(db, {
    ...batch,
    summary_json: JSON.stringify(batch.summary || {}),
    status: 'approved',
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return getExecutionBatchById(db, batchId);
}

export function attachExecutionToBatch(db, {
  executionId,
  executionBatchId,
}) {
  assignExecutionToBatch(db, {
    executionId,
    executionBatchId,
  });

  return listExecutionsForBatch(db, executionBatchId);
}

export function getExecutionBatchDetails(db, batchId) {
  const batch = getExecutionBatchById(db, batchId);

  if (!batch) {
    return null;
  }

  return {
    ...batch,
    executions: listExecutionsForBatch(db, batchId),
  };
}

export function listExecutionBatchSummaries(db, filters = {}) {
  return listExecutionBatches(db, filters).map((batch) => ({
    id: batch.id,
    planning_session_id: batch.planning_session_id,
    status: batch.status,
    summary: batch.summary,
    created_at: batch.created_at,
    approved_at: batch.approved_at,
    completed_at: batch.completed_at,
  }));
}
