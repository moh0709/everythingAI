import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getActionExecutionById,
  getActionPreviewById,
  getIndexedFileById,
  insertActionExecution,
  insertAuditLog,
  markActionExecutionUndone,
  updateIndexedFileLocation,
  upsertFileLabel,
} from '../db/client.js';
import { disableActionPreviewExecution } from '../previews/actionPreviewService.js';
import {
  invalidateActionPreview,
  validateActionPreview,
} from '../services/previewValidationService.js';
import {
  createRecoverySnapshot,
  markSnapshotUsed,
  RECOVERY_SNAPSHOT_TYPES,
} from '../recovery/recoverySnapshotService.js';
import { getActiveTrashRecordByFileId } from '../recovery/trashService.js';

const SUPPORTED_ACTION_TYPES = new Set(['tag', 'category', 'rename', 'move']);

function createId(prefix) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function relativeAfterAction(originalRelativePath, targetPath, sourcePath) {
  const originalDir = path.dirname(originalRelativePath);
  const sourceDir = path.dirname(sourcePath);
  const relativeFromSourceDir = path.relative(sourceDir, targetPath);

  if (originalDir === '.') {
    return relativeFromSourceDir;
  }

  return path.join(originalDir, relativeFromSourceDir);
}

function deriveOriginalRelativePath(currentFile, restoredAbsolutePath) {
  if (!currentFile?.absolute_path || !currentFile?.relative_path) {
    return path.basename(restoredAbsolutePath);
  }

  const currentAbsolutePath = path.resolve(currentFile.absolute_path);
  const currentRelativePath = path.normalize(currentFile.relative_path);
  const lowerAbsolutePath = currentAbsolutePath.toLowerCase();
  const lowerRelativePath = currentRelativePath.toLowerCase();

  if (!lowerAbsolutePath.endsWith(lowerRelativePath)) {
    return path.basename(restoredAbsolutePath);
  }

  const rootPath = currentAbsolutePath
    .slice(0, currentAbsolutePath.length - currentRelativePath.length)
    .replace(/[\\/]+$/, '');

  const restoredRelativePath = path.relative(rootPath, restoredAbsolutePath);

  if (!restoredRelativePath || restoredRelativePath.startsWith('..') || path.isAbsolute(restoredRelativePath)) {
    return path.basename(restoredAbsolutePath);
  }

  return restoredRelativePath;
}

function audit(db, { eventType, entityType, entityId, payload }) {
  insertAuditLog(db, {
    id: createId('audit'),
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload_json: JSON.stringify(payload),
    created_at: new Date().toISOString(),
  });
}

function failExecution(db, { preview, error, executionId = createId('execution') }) {
  const failedExecution = {
    id: executionId,
    preview_id: preview?.id || null,
    file_id: preview?.file_id || null,
    action_type: preview?.action_type || 'unknown',
    status: 'failed',
    source_path: preview?.source_path || null,
    target_path: preview?.target_path || null,
    undo_source_path: null,
    undo_target_path: null,
    error_message: error.message,
    executed_at: new Date().toISOString(),
    undone_at: null,
  };

  if (preview && SUPPORTED_ACTION_TYPES.has(preview.action_type)) {
    insertActionExecution(db, failedExecution);
  }

  audit(db, {
    eventType: 'action.failed',
    entityType: 'action_execution',
    entityId: failedExecution.id,
    payload: failedExecution,
  });

  return failedExecution;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertSafeFilesystemPreview(preview) {
  if (!preview.source_path) {
    throw new Error('Preview has no source path.');
  }

  if (!preview.target_path) {
    throw new Error('Preview has no target path.');
  }

  const sourcePath = path.resolve(preview.source_path);
  const targetPath = path.resolve(preview.target_path);
  const sourceDir = path.dirname(sourcePath);
  const relativeTarget = path.relative(sourceDir, targetPath);

  if (!relativeTarget || relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
    throw new Error('Target path escapes the allowed source directory boundary.');
  }

  if (sourcePath === targetPath) {
    throw new Error('Source and target paths are identical.');
  }
}

async function assertFilesystemExecutionPreconditions(db, preview) {
  assertSafeFilesystemPreview(preview);

  if (getActiveTrashRecordByFileId(db, preview.file_id)) {
    throw new Error('Cannot execute action against active trashed file.');
  }

  if (!(await pathExists(preview.source_path))) {
    invalidateActionPreview(db, preview.id, 'source_missing');
    throw new Error('Source file no longer exists.');
  }

  if (await pathExists(preview.target_path)) {
    invalidateActionPreview(db, preview.id, 'target_exists');
    throw new Error('Target path already exists.');
  }
}

function createPreMutationSnapshot(db, { preview, executionId }) {
  const file = getIndexedFileById(db, preview.file_id);

  return createRecoverySnapshot(db, {
    fileId: preview.file_id,
    previewId: preview.id,
    executionId,
    snapshotType: RECOVERY_SNAPSHOT_TYPES.EXECUTION_PRE_MUTATION,
    sourcePath: preview.source_path,
    targetPath: preview.target_path,
    metadata: {
      file,
      preview,
      execution: { id: executionId, action_type: preview.action_type },
      reason: 'pre-mutation snapshot before filesystem action execution',
    },
  });
}

async function executeFilesystemAction(db, preview) {
  await fs.mkdir(path.dirname(preview.target_path), { recursive: true });
  await fs.rename(preview.source_path, preview.target_path);

  updateIndexedFileLocation(db, {
    fileId: preview.file_id,
    filename: path.basename(preview.target_path),
    absolutePath: preview.target_path,
    relativePath: relativeAfterAction(preview.relative_path, preview.target_path, preview.source_path),
  });
}

export async function executeActionPreview(db, { previewId, approve = false } = {}) {
  if (!approve) {
    throw new Error('Explicit approval is required to execute an action preview.');
  }

  const preview = getActionPreviewById(db, previewId);

  if (!preview) {
    throw new Error(`Action preview not found: ${previewId}`);
  }

  const validation = validateActionPreview(preview);

  if (!validation.valid) {
    throw new Error(`Action preview failed validation: ${validation.reason}`);
  }

  const executionId = createId('execution');
  let recoverySnapshot = null;

  try {
    if (!SUPPORTED_ACTION_TYPES.has(preview.action_type)) {
      throw new Error(`Unsupported action type: ${preview.action_type}`);
    }

    if (preview.preview_status !== 'ready' && preview.preview_status !== 'approved') {
      throw new Error(`Action preview is not executable: ${preview.blocked_reason || preview.preview_status}`);
    }

    const execution = {
      id: executionId,
      preview_id: preview.id,
      file_id: preview.file_id,
      action_type: preview.action_type,
      status: 'executed',
      source_path: preview.source_path,
      target_path: preview.target_path,
      undo_source_path: preview.target_path,
      undo_target_path: preview.source_path,
      error_message: null,
      executed_at: new Date().toISOString(),
      undone_at: null,
    };

    if (preview.action_type === 'rename' || preview.action_type === 'move') {
      await assertFilesystemExecutionPreconditions(db, preview);
      recoverySnapshot = createPreMutationSnapshot(db, { preview, executionId });
      await executeFilesystemAction(db, preview);
    } else if (preview.action_type === 'tag') {
      upsertFileLabel(db, { fileId: preview.file_id, tag: preview.suggested_value });
    } else if (preview.action_type === 'category') {
      upsertFileLabel(db, { fileId: preview.file_id, category: preview.suggested_value });
    }

    insertActionExecution(db, execution);

    if (recoverySnapshot) {
      markSnapshotUsed(db, {
        snapshotId: recoverySnapshot.id,
        executionId: execution.id,
      });
    }

    disableActionPreviewExecution(db, preview.id);
    audit(db, {
      eventType: 'action.executed',
      entityType: 'action_execution',
      entityId: execution.id,
      payload: {
        ...execution,
        recovery_snapshot_id: recoverySnapshot?.id || null,
      },
    });

    return execution;
  } catch (error) {
    const failedExecution = failExecution(db, { preview, error, executionId });
    throw Object.assign(error, { execution: failedExecution });
  }
}

export async function undoActionExecution(db, { executionId, approve = false } = {}) {
  if (!approve) {
    throw new Error('Explicit approval is required to undo an action execution.');
  }

  const execution = getActionExecutionById(db, executionId);

  if (!execution) {
    throw new Error(`Action execution not found: ${executionId}`);
  }

  if (execution.status !== 'executed') {
    throw new Error(`Action execution cannot be undone from status: ${execution.status}`);
  }

  if (execution.action_type === 'rename' || execution.action_type === 'move') {
    if (!(await pathExists(execution.undo_source_path))) {
      throw new Error('Undo source path no longer exists.');
    }

    if (await pathExists(execution.undo_target_path)) {
      throw new Error('Undo target path already exists.');
    }

    const currentFile = getIndexedFileById(db, execution.file_id);
    const restoredRelativePath = deriveOriginalRelativePath(currentFile, execution.undo_target_path);

    await fs.mkdir(path.dirname(execution.undo_target_path), { recursive: true });
    await fs.rename(execution.undo_source_path, execution.undo_target_path);

    updateIndexedFileLocation(db, {
      fileId: execution.file_id,
      filename: path.basename(execution.undo_target_path),
      absolutePath: execution.undo_target_path,
      relativePath: restoredRelativePath,
    });
  }

  markActionExecutionUndone(db, execution.id);
  audit(db, {
    eventType: 'action.undone',
    entityType: 'action_execution',
    entityId: execution.id,
    payload: execution,
  });

  return getActionExecutionById(db, execution.id);
}
