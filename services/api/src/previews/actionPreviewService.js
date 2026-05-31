import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAppSetting, getOrganizationSuggestionById, insertActionPreview, updateActionPreviewExecutability } from '../db/client.js';
import { getDefaultAiProviderSettings, mergeAiProviderSettings } from '../settings/aiProviderSettings.js';

const SETTINGS_KEY = 'ai_provider_settings';

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

function isDryRunOnly(db) {
  try {
    const settings = mergeAiProviderSettings(getAppSetting(db, SETTINGS_KEY) || getDefaultAiProviderSettings());
    return settings.planning?.dryRunOnly === true;
  } catch {
    return false;
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveTargetPath(suggestion, destinationFolder = null) {
  if (suggestion.action_type === 'rename') {
    if (hasPathSeparators(suggestion.suggested_value)) {
      return {
        targetPath: null,
        blockedReason: 'Rename suggestion must be a filename, not a path.',
      };
    }

    const sourceDir = path.dirname(suggestion.absolute_path);
    const targetPath = path.resolve(sourceDir, suggestion.suggested_value);

    if (path.resolve(suggestion.absolute_path) === targetPath) {
      return {
        targetPath,
        blockedReason: 'Rename target is identical to the current filename.',
      };
    }

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

    const baseDir = (destinationFolder && path.isAbsolute(destinationFolder))
      ? destinationFolder
      : path.dirname(suggestion.absolute_path);
    const targetDir = path.resolve(baseDir, suggestion.suggested_value);
    const targetPath = path.resolve(targetDir, suggestion.filename);

    if (path.resolve(suggestion.absolute_path) === targetPath) {
      return {
        targetPath,
        blockedReason: 'File is already in the target folder.',
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

export async function createActionPreview(db, { suggestionId, destinationFolder = null }) {
  const suggestion = getOrganizationSuggestionById(db, suggestionId);

  if (!suggestion) {
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }

  const { targetPath, blockedReason } = await resolveTargetPath(suggestion, destinationFolder);
  const dryRunBlockedReason = isDryRunOnly(db) ? 'Planning rules are set to dry-run-only mode.' : null;
  const finalBlockedReason = dryRunBlockedReason || blockedReason;
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
    requires_approval: suggestion.requires_approval === 1 ? 1 : 0,
    can_execute: finalBlockedReason ? 0 : 1,
    blocked_reason: finalBlockedReason,
    preview_status: finalBlockedReason ? 'blocked' : 'ready',
    created_at: new Date().toISOString(),
  };

  insertActionPreview(db, preview);

  return preview;
}

export function disableActionPreviewExecution(db, previewId) {
  updateActionPreviewExecutability(db, { previewId, canExecute: 0 });
}
