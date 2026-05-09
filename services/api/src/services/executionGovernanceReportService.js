import {
  evaluateExecutionBatchHealth,
} from './executionHealthService.js';
import {
  calculateExecutionBatchMetrics,
} from './executionMetricsService.js';
import {
  verifyExecutionBatchIntegrity,
} from './executionVerificationService.js';

export function buildExecutionGovernanceReport(batch) {
  const verification = verifyExecutionBatchIntegrity(batch);
  const metrics = calculateExecutionBatchMetrics(batch);
  const health = evaluateExecutionBatchHealth(batch);

  return {
    batch_id: batch?.id || null,
    status: batch?.status || 'unknown',
    governance: {
      verification_valid: verification.valid,
      health_status: health.health,
      metrics,
    },
    issues: verification.issues,
    generated_at: new Date().toISOString(),
  };
}
