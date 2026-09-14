import crypto from 'node:crypto';
import path from 'node:path';
import { validateArchiveProfile } from './archiveProfileModel.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stableId(prefix, value) {
  const digest = crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
  return `${prefix}_${digest}`;
}

function isSameOrNestedPath(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeEvidenceRefs(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({
    type: normalizeString(entry?.type),
    source_path: normalizeString(entry?.source_path),
    locator: normalizeString(entry?.locator),
  })).filter((entry) => entry.type && entry.source_path);
}

function normalizeAiFields(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeString).filter(Boolean))].sort();
}

function validateSourceSnapshot(snapshot, profile) {
  const sourcePath = normalizeString(snapshot?.source_path);
  const hash = normalizeString(snapshot?.source_fingerprint?.hash ?? snapshot?.hash);
  const sizeBytes = snapshot?.source_fingerprint?.size_bytes ?? snapshot?.size_bytes;
  const mtimeMs = snapshot?.source_fingerprint?.mtime_ms ?? snapshot?.mtime_ms;

  if (!sourcePath || !hash || !Number.isInteger(sizeBytes) || sizeBytes < 0 || !Number.isFinite(mtimeMs)) {
    throw new Error('INVALID_SOURCE_SNAPSHOT');
  }

  if (!profile.source_roots.some((root) => isSameOrNestedPath(root.path, sourcePath))) {
    throw new Error('SOURCE_OUTSIDE_PROFILE_ROOTS');
  }

  return {
    source_path: path.resolve(sourcePath),
    source_fingerprint: {
      hash,
      size_bytes: sizeBytes,
      mtime_ms: mtimeMs,
    },
    suggested_relative_path: normalizeString(snapshot?.suggested_relative_path),
    ai_generated_fields: normalizeAiFields(snapshot?.ai_generated_fields),
    evidence_refs: normalizeEvidenceRefs(snapshot?.evidence_refs),
  };
}

function buildDestination(profile, snapshot) {
  const relativePath = snapshot.suggested_relative_path || path.basename(snapshot.source_path);
  if (path.isAbsolute(relativePath)) throw new Error('ABSOLUTE_ARCHIVE_RELATIVE_PATH_FORBIDDEN');

  const destination = path.resolve(profile.archive_destination, relativePath);
  if (!isSameOrNestedPath(profile.archive_destination, destination)) {
    throw new Error('ARCHIVE_PATH_ESCAPE_FORBIDDEN');
  }

  return destination;
}

export function createPreviewArchivePlan({ profile: inputProfile, source_snapshots: sourceSnapshots } = {}) {
  const profileValidation = validateArchiveProfile(inputProfile);
  if (!profileValidation.valid) {
    const error = new Error('INVALID_ARCHIVE_PROFILE');
    error.validation = profileValidation;
    throw error;
  }

  if (!Array.isArray(sourceSnapshots) || sourceSnapshots.length === 0) {
    throw new Error('SOURCE_SNAPSHOTS_REQUIRED');
  }

  const profile = profileValidation.profile;
  const snapshots = sourceSnapshots
    .map((snapshot) => validateSourceSnapshot(snapshot, profile))
    .sort((a, b) => a.source_path.localeCompare(b.source_path));

  const destinationKeys = new Set();
  const planItems = snapshots.map((snapshot) => {
    const suggestedArchivePath = buildDestination(profile, snapshot);
    const destinationKey = process.platform === 'win32'
      ? suggestedArchivePath.toLowerCase()
      : suggestedArchivePath;

    if (destinationKeys.has(destinationKey)) {
      throw new Error('DUPLICATE_ARCHIVE_DESTINATION');
    }
    destinationKeys.add(destinationKey);

    const stableContract = {
      profile_id: profile.id,
      source_path: snapshot.source_path,
      source_fingerprint: snapshot.source_fingerprint,
      suggested_archive_path: suggestedArchivePath,
      ai_generated_fields: snapshot.ai_generated_fields,
      evidence_refs: snapshot.evidence_refs,
    };

    return Object.freeze({
      plan_item_id: stableId('archive_item', stableContract),
      source_path: snapshot.source_path,
      source_fingerprint: Object.freeze({ ...snapshot.source_fingerprint }),
      suggested_archive_path: suggestedArchivePath,
      sidecar_path: `${suggestedArchivePath}.everythingai.json`,
      action: 'copy',
      requires_approval: true,
      approval_status: 'pending',
      conflict_status: 'none',
      ai_generated_fields: Object.freeze([...snapshot.ai_generated_fields]),
      evidence_refs: Object.freeze(snapshot.evidence_refs.map((entry) => Object.freeze({ ...entry }))),
    });
  });

  const planContract = {
    profile_id: profile.id,
    profile_name: profile.name,
    archive_destination: profile.archive_destination,
    items: planItems.map((item) => ({
      plan_item_id: item.plan_item_id,
      source_path: item.source_path,
      source_fingerprint: item.source_fingerprint,
      suggested_archive_path: item.suggested_archive_path,
      sidecar_path: item.sidecar_path,
      action: item.action,
      ai_generated_fields: item.ai_generated_fields,
      evidence_refs: item.evidence_refs,
    })),
  };

  return Object.freeze({
    plan_id: stableId('archive_plan', planContract),
    profile_id: profile.id,
    archive_destination: profile.archive_destination,
    mode: 'preview_only',
    filesystem_mutation_allowed: false,
    items: Object.freeze(planItems),
  });
}
