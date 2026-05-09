import crypto from 'node:crypto';
import {
  assignExecutionToBatch,
  getExecutionBatchById,
  insertExecutionBatch,
  listExecutionBatches,
  listExecutionsForBatch,
  updateExecutionBatch,
} from '../db/repositories/executionRepository.js';

const ALLOWED_TRANSITIONS = {
  pending_approval: ['approved'],
  approved: ['running'],
  running: ['completed', 'failed'],
  completed: ['rolled_back'],
  failed: ['rolled_back'],
  rolled_back: [],
};

function createId(prefix) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function assertTransitionAllowed(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Invalid execution batch transition from ${currentStatus} to ${nextStatus}`,
    );
  }
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

export function transitionExecutionBatchStatus(db, {
  batchId,
  status,
  errorMessage = null,
} = {}) {
  const batch = getExecutionBatchById(db, batchId);

  if (!batch) {
    throw new Error(`Execution batch not found: ${batchId}`);
  }

  assertTransitionAllowed(batch.status, status);

  const now = new Date().toISOString();

  const updatedBatch = {
    ...batch,
    summary_json: JSON.stringify(batch.summary || {}),
    status,
    error_message: errorMessage,
    updated_at: now,
    approved_at: batch.approved_at,
    started_at: batch.started_at,
    completed_at: batch.completed_at,
  };

  if (status === 'approved' && !updatedBatch.approved_at) {
    updatedBatch.approved_at = now;
  }

  if (status === 'running' && !updatedBatch.started_at) {
    updatedBatch.started_at = now;
  }

  if ((status === 'completed' || status === 'rolled_back' || status === 'failed') && !updatedBatch.completed_at) {
    updatedBatch.completed_at = now;
  }

  updateExecutionBatch(db, updatedBatch);

  return getExecutionBatchById(db, batchId);
}

export function approveExecutionBatch(db, batchId) {
  const batch = getExecutionBatchById(db, batchId);

  if (!batch) {
    throw new Error(`Execution batch not found: ${batchId}`);
  }

  if (batch.status !== 'pending_approval') {
    throw new Error(`Execution batch cannot be approved from status: ${batch.status}`);
  }

  return transitionExecutionBatchStatus(db, {
    batchId,
    status: 'approved',
  });
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
