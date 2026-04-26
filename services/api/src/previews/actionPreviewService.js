import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getOrganizationSuggestionById, insertActionPreview, updateActionPreviewExecutability } from '../db/client.js';

function createPreviewId(suggestionId) {
  return crypto
    .createHash('sha256')
    .update(`${suggestionId}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function hasPathSeparators(value) {
  return value.includes('/') || value.includes('\\');
}

function isInsideDirectory(candidatePath, parentDirectory) {
  const relative = path.relative(parentDirectory, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveTargetPath(suggestion) {
  if (suggestion.action_type === 'rename') {
    if (hasPathSeparators(suggestion.suggested_value)) {
      return {
        targetPath: null,
        blockedReason: 'Rename suggestion must be a filename, not a path.',
      };
    }

    const sourceDir = path.dirname(suggestion.absolute_path);
    const targetPath = path.resolve(sourceDir, suggestion.suggested_value);

    if (!isInsideDirectory(targetPath, sourceDir)) {
      return {
        targetPath,
        blockedReason: 'Rename target escapes the source directory.',
      };
    }

    if (await pathExists(targetPath)) {
      return {
        targetPath,
        blockedReason: 'Target filename already exists.',
      };
    }

    return { targetPath, blockedReason: null };
  }

  if (suggestion.action_type === 'move') {
    if (path.isAbsolute(suggestion.suggested_value) || hasPathSeparators(suggestion.suggested_value)) {
      return {
        targetPath: null,
        blockedReason: 'Move suggestion must be a safe folder name for preview.',
      };
    }

    const sourceDir = path.dirname(suggestion.absolute_path);
    const targetDir = path.resolve(sourceDir, suggestion.suggested_value);
    const targetPath = path.resolve(targetDir, suggestion.filename);

    if (!isInsideDirectory(targetPath, sourceDir)) {
      return {
        targetPath,
        blockedReason: 'Move target escapes the source directory.',
      };
    }

    if (await pathExists(targetPath)) {
      return {
        targetPath,
        blockedReason: 'Target file already exists.',
      };
    }

    return { targetPath, blockedReason: null };
  }

  return { targetPath: null, blockedReason: null };
}

export async function createActionPreview(db, { suggestionId }) {
  const suggestion = getOrganizationSuggestionById(db, suggestionId);

  if (!suggestion) {
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }

  const { targetPath, blockedReason } = await resolveTargetPath(suggestion);
  const preview = {
    id: createPreviewId(suggestion.id),
    suggestion_id: suggestion.id,
    file_id: suggestion.file_id,
    action_type: suggestion.action_type,
    source_path: suggestion.absolute_path,
    target_path: targetPath,
    current_value: suggestion.current_value,
    suggested_value: suggestion.suggested_value,
    risk_level: suggestion.risk_level,
    requires_approval: 1,
    can_execute: blockedReason ? 0 : 1,
    blocked_reason: blockedReason,
    preview_status: blockedReason ? 'blocked' : 'ready',
    created_at: new Date().toISOString(),
  };

  insertActionPreview(db, preview);

  return preview;
}

export function disableActionPreviewExecution(db, previewId) {
  updateActionPreviewExecutability(db, { previewId, canExecute: 0 });
}
