import {
  listPotentiallyStaleActionPreviews,
  markActionPreviewStale,
  updateActionPreviewValidation,
} from '../db/repositories/previewRepository.js';

export function validateActionPreview(preview) {
  if (!preview) {
    return {
      valid: false,
      reason: 'preview_missing',
    };
  }

  if (preview.preview_status === 'stale') {
    return {
      valid: false,
      reason: 'preview_stale',
    };
  }

  if (preview.can_execute !== 1) {
    return {
      valid: false,
      reason: preview.blocked_reason || 'execution_disabled',
    };
  }

  return {
    valid: true,
    reason: null,
  };
}

export function invalidateActionPreview(db, previewId, reason = 'preview_invalidated') {
  updateActionPreviewValidation(db, {
    previewId,
    canExecute: 0,
    blockedReason: reason,
    previewStatus: 'blocked',
  });
}

export function detectAndMarkStalePreviews(db, { limit = 100 } = {}) {
  const stalePreviews = listPotentiallyStaleActionPreviews(db, { limit });

  for (const preview of stalePreviews) {
    markActionPreviewStale(db, preview.id);
  }

  return stalePreviews.map((preview) => ({
    id: preview.id,
    file_id: preview.file_id,
    preview_status: 'stale',
  }));
}
