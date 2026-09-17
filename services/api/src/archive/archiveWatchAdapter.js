import crypto from 'node:crypto';
import path from 'node:path';
import { validateArchiveProfile } from './archiveProfileModel.js';
import { evaluateArchiveStaleState } from './archiveStaleState.js';

function canonicalPath(value) {
  return path.resolve(typeof value === 'string' ? value.trim() : '');
}

function isSameOrNestedPath(parentPath, candidatePath) {
  const parent = canonicalPath(parentPath);
  const candidate = canonicalPath(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function cloneFingerprint(value) {
  return Object.freeze({
    hash: value.hash,
    size_bytes: value.size_bytes,
    mtime_ms: value.mtime_ms,
  });
}

function cloneExecution(value) {
  return Object.freeze({
    source_path: canonicalPath(value.source_path),
    archive_path: canonicalPath(value.archive_path),
    sidecar_path: canonicalPath(value.sidecar_path),
    source_fingerprint: cloneFingerprint(value.source_fingerprint),
    archive_fingerprint: cloneFingerprint(value.archive_fingerprint),
  });
}

function stableCandidateId(value) {
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 24);
  return `archive_watch_${digest}`;
}

function ignoredResult({ sourcePath, staleState = null, reason }) {
  return Object.freeze({
    ignored: true,
    reason,
    candidate_id: null,
    stale_state: staleState,
    source_path: sourcePath,
    preview_required: false,
    manual_review_required: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
    filesystem_mutation_allowed: false,
  });
}

function reviewModeFor(staleState) {
  if (staleState === 'source_changed') return 'update_preview';
  if (staleState === 'archive_missing') return 'rebuild_preview';
  if (staleState === 'sidecar_missing') return 'sidecar_preview';
  if (staleState === 'archive_changed' || staleState === 'conflict') return 'manual_review';
  return 'none';
}

export function buildArchiveWatchReviewCandidate(input = {}) {
  const validation = validateArchiveProfile(input.profile);
  if (!validation.valid) {
    throw new Error(`INVALID_ARCHIVE_PROFILE:${JSON.stringify(validation.errors)}`);
  }

  const profile = validation.profile;
  const sourcePath = canonicalPath(input.source_path);
  const matchingRoots = profile.source_roots
    .filter((root) => isSameOrNestedPath(root.path, sourcePath))
    .sort((left, right) => right.path.length - left.path.length);

  if (matchingRoots.length === 0) {
    throw new Error('SOURCE_OUTSIDE_PROFILE_ROOTS');
  }

  const matchedRoot = matchingRoots[0];
  if (!matchedRoot.watch_enabled) {
    return ignoredResult({ sourcePath, reason: 'WATCH_DISABLED_FOR_SOURCE_ROOT' });
  }

  if (!input.prior_execution || canonicalPath(input.prior_execution.source_path) !== sourcePath) {
    throw new Error('SOURCE_EXECUTION_MISMATCH');
  }

  const stale = evaluateArchiveStaleState({
    execution: input.prior_execution,
    current: {
      source_exists: true,
      source_fingerprint: input.source_fingerprint,
      archive_exists: input.observed_archive?.archive_exists,
      archive_fingerprint: input.observed_archive?.archive_fingerprint,
      sidecar_exists: input.observed_archive?.sidecar_exists,
      destination_conflict: input.observed_archive?.destination_conflict,
    },
  });

  if (stale.state === 'current') {
    return ignoredResult({
      sourcePath,
      staleState: 'current',
      reason: 'NO_ARCHIVE_REVIEW_REQUIRED',
    });
  }

  const sourceFingerprint = cloneFingerprint(input.source_fingerprint);
  const priorExecution = cloneExecution(input.prior_execution);
  const semanticEvidence = {
    profile_id: profile.id,
    source_path: sourcePath,
    source_fingerprint: sourceFingerprint,
    prior_execution: priorExecution,
    observed_archive: {
      archive_exists: input.observed_archive.archive_exists,
      archive_fingerprint: input.observed_archive.archive_fingerprint,
      sidecar_exists: input.observed_archive.sidecar_exists,
      destination_conflict: input.observed_archive.destination_conflict,
    },
    stale_state: stale.state,
  };

  return Object.freeze({
    ignored: false,
    reason: stale.reason,
    candidate_id: stableCandidateId(semanticEvidence),
    profile_id: profile.id,
    source_path: sourcePath,
    source_fingerprint: sourceFingerprint,
    prior_execution: priorExecution,
    stale_state: stale.state,
    review_mode: reviewModeFor(stale.state),
    preview_required: stale.preview_required,
    manual_review_required: stale.manual_review_required,
    execution_allowed: false,
    automatic_approval_allowed: false,
    filesystem_mutation_allowed: false,
  });
}
