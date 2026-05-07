import crypto from 'node:crypto';
import path from 'node:path';
import { getIndexedFileById, insertOrganizationSuggestion, listOrganizationSuggestions } from '../db/client.js';
import { analyzeFileForOrganization } from '../integrations/organizor/organizationRules.js';

function createSuggestionId(fileId, actionType, suggestedValue, planningSessionId = null) {
  return crypto
    .createHash('sha256')
    .update(`${planningSessionId || 'legacy'}:${fileId}:${actionType}:${suggestedValue}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function safeFilenameSuggestion(filename) {
  const extension = path.extname(filename);
  const base = path.basename(filename, extension);
  const normalized = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized ? `${normalized}${extension.toLowerCase()}` : filename;
}

function semanticFilenameSuggestion(file, analysis) {
  const extension = path.extname(file.filename).toLowerCase();
  const base = analysis.suggestedBaseName || safeFilenameSuggestion(file.filename).replace(extension, '');
  return `${base}${extension}`;
}

function buildExistingKey(suggestion) {
  return `${suggestion.action_type}:${suggestion.suggested_value}`;
}

export function generatePreviewSuggestions(db, { fileId, planningSessionId = null } = {}) {
  const file = getIndexedFileById(db, fileId);

  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  const now = new Date().toISOString();
  const analysis = analyzeFileForOrganization(file);
  const category = analysis.category;
  const safeName = semanticFilenameSuggestion(file, analysis);
  const suggestions = [
    {
      planning_session_id: planningSessionId,
      file_id: file.id,
      action_type: 'category',
      current_value: null,
      suggested_value: category,
      reason: analysis.reason,
      confidence: analysis.confidence,
      risk_level: 'low',
      requires_approval: 1,
      created_at: now,
    },
    ...analysis.tags.map((tag) => ({
      planning_session_id: planningSessionId,
      file_id: file.id,
      action_type: 'tag',
      current_value: null,
      suggested_value: tag,
      reason: `Suggested by ${analysis.source} from metadata and extracted content.`,
      confidence: Math.max(0.5, analysis.confidence - 0.05),
      risk_level: 'low',
      requires_approval: 1,
      created_at: now,
    })),
    {
      planning_session_id: planningSessionId,
      file_id: file.id,
      action_type: 'move',
      current_value: path.dirname(file.absolute_path),
      suggested_value: analysis.folder,
      reason: `Preview-only folder suggestion from ${analysis.source}. This does not move the source file.`,
      confidence: Math.max(0.35, analysis.confidence - 0.15),
      risk_level: 'medium',
      requires_approval: 1,
      created_at: now,
    },
  ];

  if (safeName && safeName !== file.filename) {
    suggestions.push({
      planning_session_id: planningSessionId,
      file_id: file.id,
      action_type: 'rename',
      current_value: file.filename,
      suggested_value: safeName,
      reason: 'Preview-only normalized filename suggestion. This does not rename the source file.',
      confidence: 0.45,
      risk_level: 'medium',
      requires_approval: 1,
      created_at: now,
    });
  }

  const existing = listOrganizationSuggestions(db, {
    fileId: file.id,
    planningSessionId: planningSessionId || undefined,
    limit: 500,
  }).filter((suggestion) => {
    if (planningSessionId) return suggestion.planning_session_id === planningSessionId;
    return suggestion.planning_session_id === null;
  });
  const existingKeys = new Set(existing.map(buildExistingKey));
  const saved = suggestions.filter((suggestion) => (
    !existingKeys.has(buildExistingKey(suggestion))
  )).map((suggestion) => ({
    id: createSuggestionId(file.id, suggestion.action_type, suggestion.suggested_value, planningSessionId),
    ...suggestion,
  }));

  if (!saved.length) {
    return existing;
  }

  const insert = db.transaction((records) => {
    for (const record of records) insertOrganizationSuggestion(db, record);
  });
  insert(saved);

  return [...saved, ...existing];
}
