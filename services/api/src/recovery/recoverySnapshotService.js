import crypto from 'node:crypto';
import {
  getRecoverySnapshotById,
  insertRecoverySnapshot,
  listRecoverySnapshots,
  markRecoverySnapshotFailed,
  markRecoverySnapshotUsed,
} from '../db/repositories/recoverySnapshotRepository.js';

export const RECOVERY_SNAPSHOT_TYPES = Object.freeze({
  EXECUTION_PRE_MUTATION: 'execution_pre_mutation',
  UNDO_PRE_MUTATION: 'undo_pre_mutation',
});

export const RECOVERY_SNAPSHOT_STATUSES = Object.freeze({
  CREATED: 'created',
  USED: 'used',
  FAILED: 'failed',
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

function normalizeMetadata(metadata = {}) {
  return {
    file: metadata.file || null,
    preview: metadata.preview || null,
    execution: metadata.execution || null,
    reason: metadata.reason || null,
    notes: metadata.notes || null,
  };
}

export function createRecoverySnapshot(db, {
  fileId,
  previewId = null,
  executionId = null,
  snapshotType = RECOVERY_SNAPSHOT_TYPES.EXECUTION_PRE_MUTATION,
  sourcePath = null,
  targetPath = null,
  metadata = {},
} = {}) {
  if (!fileId) {
    throw new Error('Recovery snapshot requires fileId.');
  }

  if (!Object.values(RECOVERY_SNAPSHOT_TYPES).includes(snapshotType)) {
    throw new Error(`Unsupported recovery snapshot type: ${snapshotType}`);
  }

  const timestamp = now();
  const snapshot = {
    id: createId('recovery-snapshot'),
    file_id: fileId,
    preview_id: previewId,
    execution_id: executionId,
    snapshot_type: snapshotType,
    status: RECOVERY_SNAPSHOT_STATUSES.CREATED,
    source_path: sourcePath,
    target_path: targetPath,
    metadata_json: JSON.stringify(normalizeMetadata(metadata)),
    created_at: timestamp,
    used_at: null,
    error_message: null,
  };

  insertRecoverySnapshot(db, snapshot);
  return getRecoverySnapshotById(db, snapshot.id);
}

export function getRecoverySnapshot(db, snapshotId) {
  return getRecoverySnapshotById(db, snapshotId);
}

export function findRecoverySnapshots(db, filters = {}) {
  return listRecoverySnapshots(db, filters);
}

export function markSnapshotUsed(db, { snapshotId, executionId } = {}) {
  markRecoverySnapshotUsed(db, { snapshotId, executionId });
  return getRecoverySnapshotById(db, snapshotId);
}

export function markSnapshotFailed(db, { snapshotId, errorMessage } = {}) {
  markRecoverySnapshotFailed(db, { snapshotId, errorMessage });
  return getRecoverySnapshotById(db, snapshotId);
}
