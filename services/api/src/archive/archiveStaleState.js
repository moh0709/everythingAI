function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidFingerprint(value) {
  return Boolean(
    value
    && normalizeString(value.hash)
    && Number.isInteger(value.size_bytes)
    && value.size_bytes >= 0
    && Number.isFinite(value.mtime_ms),
  );
}

function fingerprintsEqual(left, right) {
  return left.hash === right.hash
    && left.size_bytes === right.size_bytes
    && left.mtime_ms === right.mtime_ms;
}

function validateExecutionEvidence(execution) {
  if (
    !execution
    || !normalizeString(execution.source_path)
    || !normalizeString(execution.archive_path)
    || !normalizeString(execution.sidecar_path)
    || !isValidFingerprint(execution.source_fingerprint)
    || !isValidFingerprint(execution.archive_fingerprint)
  ) {
    throw new Error('INVALID_ARCHIVE_EXECUTION_EVIDENCE');
  }
}

function validateObservationEvidence(current) {
  if (
    !current
    || current.source_exists !== true
    || !isValidFingerprint(current.source_fingerprint)
    || typeof current.archive_exists !== 'boolean'
    || typeof current.sidecar_exists !== 'boolean'
    || typeof current.destination_conflict !== 'boolean'
    || (current.archive_exists && !isValidFingerprint(current.archive_fingerprint))
    || (!current.archive_exists && current.archive_fingerprint != null)
  ) {
    throw new Error('INVALID_ARCHIVE_OBSERVATION_EVIDENCE');
  }
}

function result(state, reason, { previewRequired = false, manualReviewRequired = false } = {}) {
  return Object.freeze({
    state,
    reason,
    preview_required: previewRequired,
    manual_review_required: manualReviewRequired,
    filesystem_mutation_allowed: false,
  });
}

export function evaluateArchiveStaleState({ execution, current } = {}) {
  validateExecutionEvidence(execution);
  validateObservationEvidence(current);

  if (current.destination_conflict) {
    return result('conflict', 'UNEXPECTED_DESTINATION_CONFLICT', { manualReviewRequired: true });
  }

  if (!current.archive_exists) {
    return result('archive_missing', 'ARCHIVE_OUTPUT_MISSING', { previewRequired: true });
  }

  if (!fingerprintsEqual(execution.archive_fingerprint, current.archive_fingerprint)) {
    return result('archive_changed', 'ARCHIVE_FINGERPRINT_CHANGED', { manualReviewRequired: true });
  }

  if (!fingerprintsEqual(execution.source_fingerprint, current.source_fingerprint)) {
    return result('source_changed', 'SOURCE_FINGERPRINT_CHANGED', { previewRequired: true });
  }

  if (!current.sidecar_exists) {
    return result('sidecar_missing', 'METADATA_SIDECAR_MISSING', { previewRequired: true });
  }

  return result('current', 'SOURCE_AND_ARCHIVE_MATCH_ACCEPTED_EXECUTION');
}
