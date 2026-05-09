import {
  getExecutionBatchDetails,
} from './executionBatchService.js';

export function calculateExecutionBatchMetrics(batch) {
  if (!batch) {
    return {
      total: 0,
      executed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      success_rate: 0,
    };
  }

  const executions = Array.isArray(batch.executions)
    ? batch.executions
    : [];

  const metrics = {
    total: executions.length,
    executed: executions.filter((e) => e.status === 'executed').length,
    failed: executions.filter((e) => e.status === 'failed').length,
    blocked: executions.filter((e) => e.status === 'blocked').length,
    skipped: executions.filter((e) => e.status === 'skipped').length,
  };

  metrics.success_rate = metrics.total === 0
    ? 0
    : Number(((metrics.executed / metrics.total) * 100).toFixed(2));

  return metrics;
}

export function getExecutionBatchMetricsById(db, batchId) {
  const batch = getExecutionBatchDetails(db, batchId);

  return calculateExecutionBatchMetrics(batch);
}
