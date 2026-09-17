import path from 'node:path';
import { createPreviewArchivePlan } from './archivePlanner.js';
import { validateArchiveProfile } from './archiveProfileModel.js';

const PREVIEW_STATES = new Set(['source_changed', 'archive_missing']);
const MANUAL_REVIEW_STATES = new Set(['archive_changed', 'conflict']);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalPath(value) {
  const normalized = normalizeString(value);
  return normalized ? path.resolve(normalized) : '';
}

function validFingerprint(value) {
  return Boolean(
    value
    && normalizeString(value.hash)
    && Number.isInteger(value.size_bytes)
    && value.size_bytes >= 0
    && Number.isFinite(value.mtime_ms),
  );
}

function fingerprintsMatch(left, right) {
  return validFingerprint(left)
    && validFingerprint(right)
    && normalizeString(left.hash) === normalizeString(right.hash)
    && left.size_bytes === right.size_bytes
    && left.mtime_ms === right.mtime_ms;
}

function frozenFingerprint(value) {
  return Object.freeze({
    hash: normalizeString(value.hash),
    size_bytes: value.size_bytes,
    mtime_ms: value.mtime_ms,
  });
}

function isSameOrNestedPath(parentPath, candidatePath) {
  const parent = canonicalPath(parentPath);
  const candidate = canonicalPath(candidatePath);
  if (!parent || !candidate) return false;
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateInputs({ candidate, profile: inputProfile, source_snapshot: sourceSnapshot } = {}) {
  if (!candidate || candidate.ignored === true || !normalizeString(candidate.candidate_id)) {
    throw new Error('WATCH_CANDIDATE_NOT_REVIEWABLE');
  }

  if (
    candidate.execution_allowed !== false
    || candidate.automatic_approval_allowed !== false
    || candidate.filesystem_mutation_allowed !== false
  ) {
    throw new Error('WATCH_CANDIDATE_AUTHORITY_INVALID');
  }

  const profileValidation = validateArchiveProfile(inputProfile);
  if (!profileValidation.valid) {
    const error = new Error('INVALID_ARCHIVE_PROFILE');
    error.validation = profileValidation;
    throw error;
  }
  const profile = profileValidation.profile;

  if (normalizeString(candidate.profile_id) !== profile.id) {
    throw new Error('WATCH_CANDIDATE_PROFILE_MISMATCH');
  }

  const candidateSourcePath = canonicalPath(candidate.source_path);
  const snapshotSourcePath = canonicalPath(sourceSnapshot?.source_path);
  if (!candidateSourcePath || candidateSourcePath !== snapshotSourcePath) {
    throw new Error('WATCH_CANDIDATE_SOURCE_MISMATCH');
  }

  if (!profile.source_roots.some((root) => isSameOrNestedPath(root.path, snapshotSourcePath))) {
    throw new Error('SOURCE_OUTSIDE_PROFILE_ROOTS');
  }

  if (!validFingerprint(candidate.source_fingerprint) || !validFingerprint(sourceSnapshot?.source_fingerprint)) {
    throw new Error('INVALID_SOURCE_SNAPSHOT');
  }

  if (!fingerprintsMatch(candidate.source_fingerprint, sourceSnapshot.source_fingerprint)) {
    throw new Error('WATCH_CANDIDATE_SOURCE_FINGERPRINT_STALE');
  }

  if (
    !candidate.prior_execution
    || canonicalPath(candidate.prior_execution.source_path) !== candidateSourcePath
  ) {
    throw new Error('WATCH_CANDIDATE_PRIOR_EXECUTION_INVALID');
  }

  const staleState = normalizeString(candidate.stale_state);
  if (!PREVIEW_STATES.has(staleState) && staleState !== 'sidecar_missing' && !MANUAL_REVIEW_STATES.has(staleState)) {
    throw new Error('WATCH_CANDIDATE_STALE_STATE_UNSUPPORTED');
  }

  return { profile, candidateSourcePath, staleState };
}

function baseResult(candidate, staleState) {
  return {
    candidate_id: normalizeString(candidate.candidate_id),
    profile_id: normalizeString(candidate.profile_id),
    stale_state: staleState,
    source_path: canonicalPath(candidate.source_path),
    source_fingerprint: frozenFingerprint(candidate.source_fingerprint),
    automatic_approval_allowed: false,
    execution_allowed: false,
    filesystem_mutation_allowed: false,
  };
}

function createPlannedPreview({ candidate, profile, sourceSnapshot, staleState }) {
  const plan = createPreviewArchivePlan({
    profile,
    source_snapshots: [{
      ...sourceSnapshot,
      source_path: canonicalPath(sourceSnapshot.source_path),
      source_fingerprint: frozenFingerprint(sourceSnapshot.source_fingerprint),
    }],
  });

  return Object.freeze({
    ...baseResult(candidate, staleState),
    proposal_type: staleState === 'source_changed' ? 'update_preview' : 'rebuild_preview',
    mode: 'preview_only',
    requires_approval: true,
    plan,
  });
}

function createSidecarPreview({ candidate, profile, staleState }) {
  const archivePath = canonicalPath(candidate.prior_execution.archive_path);
  const sidecarPath = canonicalPath(candidate.prior_execution.sidecar_path);

  if (!isSameOrNestedPath(profile.archive_destination, archivePath)) {
    throw new Error('WATCH_CANDIDATE_ARCHIVE_PATH_OUTSIDE_PROFILE');
  }
  if (!isSameOrNestedPath(profile.archive_destination, sidecarPath)) {
    throw new Error('WATCH_CANDIDATE_SIDECAR_PATH_OUTSIDE_PROFILE');
  }
  if (sidecarPath !== canonicalPath(`${archivePath}.everythingai.json`)) {
    throw new Error('WATCH_CANDIDATE_SIDECAR_PATH_MISMATCH');
  }

  return Object.freeze({
    ...baseResult(candidate, staleState),
    proposal_type: 'sidecar_regeneration_preview',
    mode: 'preview_only',
    requires_approval: true,
    archive_path: archivePath,
    sidecar_path: sidecarPath,
    plan: null,
  });
}

function createManualReview(candidate, staleState) {
  return Object.freeze({
    ...baseResult(candidate, staleState),
    proposal_type: 'manual_review',
    mode: 'manual_review_only',
    requires_approval: false,
    plan: null,
  });
}

export function createArchiveUpdatePreview(input = {}) {
  const { profile, staleState } = validateInputs(input);
  const { candidate, source_snapshot: sourceSnapshot } = input;

  if (PREVIEW_STATES.has(staleState)) {
    return createPlannedPreview({ candidate, profile, sourceSnapshot, staleState });
  }

  if (staleState === 'sidecar_missing') {
    return createSidecarPreview({ candidate, profile, staleState });
  }

  return createManualReview(candidate, staleState);
}
