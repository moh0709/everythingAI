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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function executeFilesystemAction(db, preview) {
  if (!preview.target_path) {
    throw new Error('Preview has no target path.');
  }

  if (!(await pathExists(preview.source_path))) {
    throw new Error('Source file no longer exists.');
  }

  if (await pathExists(preview.target_path)) {
    throw new Error('Target path already exists.');
  }

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

  if (preview.preview_status !== 'ready' || preview.can_execute !== 1) {
    throw new Error(`Action preview is not executable: ${preview.blocked_reason || preview.preview_status}`);
  }

  const execution = {
    id: createId('execution'),
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
    await executeFilesystemAction(db, preview);
  } else if (preview.action_type === 'tag') {
    upsertFileLabel(db, { fileId: preview.file_id, tag: preview.suggested_value });
  } else if (preview.action_type === 'category') {
    upsertFileLabel(db, { fileId: preview.file_id, category: preview.suggested_value });
  }

  insertActionExecution(db, execution);
  disableActionPreviewExecution(db, preview.id);
  audit(db, {
    eventType: 'action.executed',
    entityType: 'action_execution',
    entityId: execution.id,
    payload: execution,
  });

  return execution;
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
