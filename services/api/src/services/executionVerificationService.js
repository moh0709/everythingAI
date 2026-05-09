import {
  getExecutionBatchDetails,
} from './executionBatchService.js';

const VALID_BATCH_STATUSES = new Set([
  'pending_approval',
  'approved',
  'running',
  'completed',
  'failed',
  'rolled_back',
]);

export function verifyExecutionBatchIntegrity(batch) {
  const issues = [];

  if (!batch) {
    issues.push('batch_missing');

    return {
      valid: false,
      issues,
    };
  }

  if (!VALID_BATCH_STATUSES.has(batch.status)) {
    issues.push('invalid_batch_status');
  }

  if (!Array.isArray(batch.executions)) {
    issues.push('executions_missing');
  }

  if (batch.status === 'completed') {
    const failedExecutions = batch.executions.filter((execution) => (
      execution.status === 'failed'
    ));

    if (failedExecutions.length > 0) {
      issues.push('completed_batch_contains_failed_executions');
    }
  }

  if (batch.status === 'rolled_back') {
    const executedExecutions = batch.executions.filter((execution) => (
      execution.status === 'executed'
    ));

    if (executedExecutions.length > 0) {
      issues.push('rolled_back_batch_contains_active_executions');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function verifyExecutionBatchById(db, batchId) {
  const batch = getExecutionBatchDetails(db, batchId);

  return verifyExecutionBatchIntegrity(batch);
}
