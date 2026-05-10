import crypto from 'node:crypto';
import {
  getActionPreviewById,
  insertAuditLog,
} from '../db/client.js';
import {
  getExecutionBatchById,
  insertExecutionBatch,
  listExecutionBatches,
  listExecutionsForBatch,
  updateExecutionBatch,
} from '../db/repositories/executionRepository.js';
import { executeActionPreview } from '../actions/actionExecutor.js';
import { validateActionPreview } from '../services/previewValidationService.js';

export const EXECUTION_BATCH_STATUSES = Object.freeze({
  DRAFT: 'draft',
  APPROVED: 'approved',
  RUNNING: 'running',
  COMPLETED: 'completed',
  COMPLETED_WITH_ERRORS: 'completed_with_errors',
  FAILED: 'failed',
  UNDONE: 'undone',
});

function createId(prefix) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function now() {
  return new Date().toISOString();
}

function audit(db, { eventType, entityType, entityId, payload }) {
  insertAuditLog(db, {
    id: createId('audit'),
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload_json: JSON.stringify(payload),
    created_at: now(),
  });
}

function auditBatch(db, { eventType, batch }) {
  audit(db, {
    eventType,
    entityType: 'execution_batch',
    entityId: batch.id,
    payload: {
      id: batch.id,
      planning_session_id: batch.planning_session_id,
      status: batch.status,
      summary: batch.summary,
      error_message: batch.error_message,
      approved_at: batch.approved_at,
      started_at: batch.started_at,
      completed_at: batch.completed_at,
    },
  });
}

function normalizePreviewIds(previewIds = []) {
  if (!Array.isArray(previewIds)) {
    throw new Error('Execution batch requires previewIds to be an array.');
  }

  const normalized = previewIds
    .map((id) => id?.toString().trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function buildDraftSummary(previews) {
  const previewSummaries = previews.map((preview) => {
    const validation = validateActionPreview(preview);

    return {
      preview_id: preview.id,
      file_id: preview.file_id,
      action_type: preview.action_type,
      preview_status: preview.preview_status,
      can_execute: preview.can_execute === 1,
      validation_valid: validation.valid,
      validation_reason: validation.reason,
      risk_level: preview.risk_level,
      created_at: preview.created_at,
    };
  });

  const readyPreviews = previewSummaries.filter((preview) => preview.validation_valid);
  const blockedPreviews = previewSummaries.filter((preview) => !preview.validation_valid);

  return {
    preview_ids: previewSummaries.map((preview) => preview.preview_id),
    previews: previewSummaries,
    total_previews: previewSummaries.length,
    ready_previews: readyPreviews.length,
    blocked_previews: blockedPreviews.length,
    executed: 0,
    failed: 0,
    execution_ids: [],
    failed_execution_id: null,
    failed_preview_id: null,
    error_message: null,
    stopped_on_first_failure: true,
    policy: {
      execution_order: 'preview_creation_order',
      partial_failure: 'stop_on_first_failure',
      automatic_rollback: false,
    },
  };
}

function persistBatch(db, batch, overrides = {}) {
  const updated = {
    id: batch.id,
    planning_session_id: batch.planning_session_id,
    status: overrides.status ?? batch.status,
    summary_json: JSON.stringify(overrides.summary ?? batch.summary),
    error_message: overrides.error_message ?? batch.error_message,
    created_at: batch.created_at,
    updated_at: overrides.updated_at ?? now(),
    approved_at: overrides.approved_at ?? batch.approved_at,
    started_at: overrides.started_at ?? batch.started_at,
    completed_at: overrides.completed_at ?? batch.completed_at,
  };

  updateExecutionBatch(db, updated);
  return getExecutionBatchById(db, batch.id);
}

export function createExecutionBatch(db, { previewIds, planningSessionId = null } = {}) {
  const normalizedPreviewIds = normalizePreviewIds(previewIds);

  if (normalizedPreviewIds.length === 0) {
    throw new Error('Execution batch requires at least one preview ID.');
  }

  const previews = normalizedPreviewIds.map((previewId) => {
    const preview = getActionPreviewById(db, previewId);
    if (!preview) {
      throw new Error(`Action preview not found: ${previewId}`);
    }
    return preview;
  });

  const timestamp = now();
  const summary = buildDraftSummary(previews);
  const batch = {
    id: createId('execution-batch'),
    planning_session_id: planningSessionId,
    status: EXECUTION_BATCH_STATUSES.DRAFT,
    summary_json: JSON.stringify(summary),
    error_message: null,
    created_at: timestamp,
    updated_at: timestamp,
    approved_at: null,
    started_at: null,
    completed_at: null,
  };

  insertExecutionBatch(db, batch);

  const createdBatch = getExecutionBatchById(db, batch.id);
  auditBatch(db, { eventType: 'execution_batch.created', batch: createdBatch });

  return createdBatch;
}

export function approveExecutionBatch(db, { batchId, approve = false } = {}) {
  if (!approve) {
    throw new Error('Explicit approval is required to approve an execution batch.');
  }

  const batch = getExecutionBatchById(db, batchId);

  if (!batch) {
    throw new Error(`Execution batch not found: ${batchId}`);
  }

  if (batch.status !== EXECUTION_BATCH_STATUSES.DRAFT) {
    throw new Error(`Execution batch cannot be approved from status: ${batch.status}`);
  }

  if (!batch.summary?.total_previews || batch.summary.total_previews < 1) {
    throw new Error('Execution batch cannot be approved without previews.');
  }

  if (batch.summary.blocked_previews > 0) {
    throw new Error('Execution batch cannot be approved while it contains blocked previews.');
  }

  const approvedAt = now();
  const approvedBatch = persistBatch(db, batch, {
    status: EXECUTION_BATCH_STATUSES.APPROVED,
    approved_at: approvedAt,
    updated_at: approvedAt,
  });

  auditBatch(db, { eventType: 'execution_batch.approved', batch: approvedBatch });

  return approvedBatch;
}

export async function runExecutionBatch(db, { batchId, approve = false } = {}) {
  if (!approve) {
    throw new Error('Explicit approval is required to run an execution batch.');
  }

  const batch = getExecutionBatchById(db, batchId);

  if (!batch) {
    throw new Error(`Execution batch not found: ${batchId}`);
  }

  if (batch.status !== EXECUTION_BATCH_STATUSES.APPROVED) {
    throw new Error(`Execution batch cannot run from status: ${batch.status}`);
  }

  const startedAt = now();
  let runningBatch = persistBatch(db, batch, {
    status: EXECUTION_BATCH_STATUSES.RUNNING,
    started_at: startedAt,
    updated_at: startedAt,
  });
  auditBatch(db, { eventType: 'execution_batch.started', batch: runningBatch });

  const summary = {
    ...runningBatch.summary,
    executed: 0,
    failed: 0,
    execution_ids: [],
    failed_execution_id: null,
    failed_preview_id: null,
    error_message: null,
    stopped_on_first_failure: true,
  };

  for (const previewId of summary.preview_ids) {
    try {
      const execution = await executeActionPreview(db, {
        previewId,
        approve: true,
        executionBatchId: runningBatch.id,
      });

      summary.executed += 1;
      summary.execution_ids.push(execution.id);
    } catch (error) {
      summary.failed += 1;
      summary.failed_execution_id = error.execution?.id || null;
      summary.failed_preview_id = previewId;
      summary.error_message = error.message;
      if (error.execution?.id) {
        summary.execution_ids.push(error.execution.id);
      }
      break;
    }
  }

  const completedAt = now();
  const finalStatus = summary.failed > 0
    ? (summary.executed > 0
      ? EXECUTION_BATCH_STATUSES.COMPLETED_WITH_ERRORS
      : EXECUTION_BATCH_STATUSES.FAILED)
    : EXECUTION_BATCH_STATUSES.COMPLETED;

  const finalBatch = persistBatch(db, runningBatch, {
    status: finalStatus,
    summary,
    error_message: summary.error_message,
    completed_at: completedAt,
    updated_at: completedAt,
  });

  const finalEventType = finalStatus === EXECUTION_BATCH_STATUSES.COMPLETED
    ? 'execution_batch.completed'
    : finalStatus === EXECUTION_BATCH_STATUSES.COMPLETED_WITH_ERRORS
      ? 'execution_batch.completed_with_errors'
      : 'execution_batch.failed';

  auditBatch(db, { eventType: finalEventType, batch: finalBatch });

  return finalBatch;
}

export function getExecutionBatchDetail(db, batchId) {
  const batch = getExecutionBatchById(db, batchId);
  if (!batch) return null;

  return {
    ...batch,
    executions: listExecutionsForBatch(db, batch.id),
  };
}

export function listExecutionBatchSummaries(db, filters = {}) {
  return listExecutionBatches(db, filters);
}
