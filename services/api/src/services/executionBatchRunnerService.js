import {
  getExecutionBatchDetails,
} from './executionBatchService.js';
import {
  getActionPreviewById,
} from '../db/client.js';
import {
  validateActionPreview,
} from './previewValidationService.js';
import {
  executeActionPreview,
} from '../actions/actionExecutor.js';

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

  return {
    batch_id: batch.id,
    status: 'completed',
    results,
  };
}
