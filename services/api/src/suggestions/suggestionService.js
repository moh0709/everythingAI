import crypto from 'node:crypto';
import path from 'node:path';
import { getIndexedFileById, insertOrganizationSuggestion, listOrganizationSuggestions } from '../db/client.js';
import { analyzeFileForOrganization } from '../integrations/organizor/organizationRules.js';

function createSuggestionId(fileId, actionType, suggestedValue) {
  return crypto
    .createHash('sha256')
    .update(`${fileId}:${actionType}:${suggestedValue}:${Date.now()}:${Math.random()}`)
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

export function generatePreviewSuggestions(db, { fileId }) {
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

  const existing = listOrganizationSuggestions(db, { fileId: file.id, limit: 500 });
  const existingKeys = new Set(existing.map((suggestion) => (
    `${suggestion.action_type}:${suggestion.suggested_value}`
  )));
  const saved = suggestions.filter((suggestion) => (
    !existingKeys.has(`${suggestion.action_type}:${suggestion.suggested_value}`)
  )).map((suggestion) => ({
    id: createSuggestionId(file.id, suggestion.action_type, suggestion.suggested_value),
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
