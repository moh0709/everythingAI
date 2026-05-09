import {
  getExecutionBatchDetails,
} from './executionBatchService.js';
import {
  verifyExecutionBatchIntegrity,
} from './executionVerificationService.js';
import {
  calculateExecutionBatchMetrics,
} from './executionMetricsService.js';

export function evaluateExecutionBatchHealth(batch) {
  const verification = verifyExecutionBatchIntegrity(batch);
  const metrics = calculateExecutionBatchMetrics(batch);

  let health = 'healthy';

  if (!verification.valid) {
    health = 'invalid';
  } else if (metrics.failed > 0) {
    health = 'degraded';
  } else if (metrics.blocked > 0) {
    health = 'warning';
  }

  return {
    health,
    verification,
    metrics,
  };
}

export function evaluateExecutionBatchHealthById(db, batchId) {
  const batch = getExecutionBatchDetails(db, batchId);

  return evaluateExecutionBatchHealth(batch);
}
