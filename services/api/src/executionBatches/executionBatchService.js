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
} from '../db/repositories/executionRepository.js';
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

  audit(db, {
    eventType: 'execution_batch.created',
    entityType: 'execution_batch',
    entityId: createdBatch.id,
    payload: {
      id: createdBatch.id,
      planning_session_id: createdBatch.planning_session_id,
      status: createdBatch.status,
      summary: createdBatch.summary,
    },
  });

  return createdBatch;
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
