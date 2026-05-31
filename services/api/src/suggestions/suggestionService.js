import crypto from 'node:crypto';
import path from 'node:path';
import { getIndexedFileById, insertOrganizationSuggestion, listOrganizationSuggestions } from '../db/client.js';
import { analyzeFileForOrganization } from '../integrations/organizor/organizationRules.js';
import { createConfiguredPlanningAnswer } from '../ai/providerRuntime.js';

const ALLOWED_ACTION_TYPES = new Set(['tag', 'category', 'rename', 'move']);
const ALLOWED_RISK_LEVELS = new Set(['low', 'medium', 'high']);

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

function clampConfidence(value, fallback = 0.5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0.01, Math.min(0.99, numeric));
}

function normalizeLabelValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 _-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function normalizeMoveValue(value) {
  const normalized = normalizeLabelValue(value);
  if (!normalized || normalized === '.' || normalized === '..') return '';
  if (normalized.includes('/') || normalized.includes('\\')) return '';
  return normalized;
}

function normalizeRenameValue(value, originalFilename) {
  const rawName = path.basename(String(value || '').trim());
  if (!rawName || rawName === '.' || rawName === '..') return '';

  const normalizedName = safeFilenameSuggestion(rawName);
  const originalExtension = path.extname(originalFilename).toLowerCase();

  if (!path.extname(normalizedName) && originalExtension) {
    return `${normalizedName}${originalExtension}`;
  }

  return normalizedName;
}

function buildDeterministicSuggestions(file, analysis, { planningSessionId = null, createdAt = new Date().toISOString() } = {}) {
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
      created_at: createdAt,
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
      created_at: createdAt,
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
      created_at: createdAt,
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
      created_at: createdAt,
    });
  }

  return suggestions;
}

function persistNewSuggestions(db, suggestions, { fileId, planningSessionId = null } = {}) {
  const existing = listOrganizationSuggestions(db, {
    fileId,
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
    id: createSuggestionId(fileId, suggestion.action_type, suggestion.suggested_value, planningSessionId),
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

function parseProviderSuggestionPayload(answer) {
  const text = String(answer || '').trim();
  if (!text) return [];

  const withoutFence = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');
  const jsonText = firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFence.slice(firstBrace, lastBrace + 1)
    : withoutFence;

  const payload = JSON.parse(jsonText);
  return Array.isArray(payload?.suggestions) ? payload.suggestions : [];
}

function normalizeProviderSuggestions(file, providerSuggestions, { planningSessionId = null, createdAt = new Date().toISOString(), provider = 'provider' } = {}) {
  return providerSuggestions.map((suggestion) => {
    const actionType = String(suggestion?.action_type || '').trim();
    if (!ALLOWED_ACTION_TYPES.has(actionType)) return null;

    let suggestedValue = '';
    if (actionType === 'rename') {
      suggestedValue = normalizeRenameValue(suggestion.suggested_value, file.filename);
    } else if (actionType === 'move') {
      suggestedValue = normalizeMoveValue(suggestion.suggested_value);
    } else {
      suggestedValue = normalizeLabelValue(suggestion.suggested_value);
    }

    if (!suggestedValue) return null;
    if (actionType === 'rename' && suggestedValue === file.filename) return null;

    const riskLevel = ALLOWED_RISK_LEVELS.has(suggestion.risk_level) ? suggestion.risk_level : actionType === 'rename' || actionType === 'move' ? 'medium' : 'low';

    return {
      planning_session_id: planningSessionId,
      file_id: file.id,
      action_type: actionType,
      current_value: actionType === 'rename' ? file.filename : actionType === 'move' ? path.dirname(file.absolute_path) : null,
      suggested_value: suggestedValue,
      reason: suggestion.reason ? `Provider ${provider}: ${String(suggestion.reason).slice(0, 240)}` : `Provider ${provider} generated this reviewable suggestion.`,
      confidence: clampConfidence(suggestion.confidence, 0.65),
      risk_level: riskLevel,
      requires_approval: 1,
      created_at: createdAt,
    };
  }).filter(Boolean);
}

function combineSuggestions(primary, secondary) {
  const combined = [];
  const seen = new Set();

  for (const suggestion of [...primary, ...secondary]) {
    const key = buildExistingKey(suggestion);
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(suggestion);
  }

  return combined;
}

export function generatePreviewSuggestions(db, { fileId, planningSessionId = null } = {}) {
  const file = getIndexedFileById(db, fileId);

  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  const now = new Date().toISOString();
  const analysis = analyzeFileForOrganization(file);
  const suggestions = buildDeterministicSuggestions(file, analysis, { planningSessionId, createdAt: now });

  return persistNewSuggestions(db, suggestions, { fileId: file.id, planningSessionId });
}

export async function generateConfiguredPreviewSuggestions(db, {
  fileId,
  planningSessionId = null,
  mode = 'hybrid',
  overrideProvider,
} = {}) {
  const file = getIndexedFileById(db, fileId);

  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  const normalizedMode = ['deterministic', 'provider', 'hybrid'].includes(mode) ? mode : 'hybrid';
  const now = new Date().toISOString();
  const analysis = analyzeFileForOrganization(file);
  const deterministicSuggestions = buildDeterministicSuggestions(file, analysis, { planningSessionId, createdAt: now });

  if (normalizedMode === 'deterministic') {
    return persistNewSuggestions(db, deterministicSuggestions, { fileId: file.id, planningSessionId });
  }

  try {
    const providerResult = await createConfiguredPlanningAnswer({
      db,
      file,
      deterministicAnalysis: analysis,
      overrideProvider,
    });

    if (providerResult.provider_status !== 'ok') {
      return persistNewSuggestions(db, deterministicSuggestions, { fileId: file.id, planningSessionId });
    }

    const providerPayload = parseProviderSuggestionPayload(providerResult.answer);
    const providerSuggestions = normalizeProviderSuggestions(file, providerPayload, {
      planningSessionId,
      createdAt: now,
      provider: providerResult.provider,
    });
    const suggestions = normalizedMode === 'provider'
      ? providerSuggestions.length ? providerSuggestions : deterministicSuggestions
      : combineSuggestions(providerSuggestions, deterministicSuggestions);

    return persistNewSuggestions(db, suggestions, { fileId: file.id, planningSessionId });
  } catch {
    return persistNewSuggestions(db, deterministicSuggestions, { fileId: file.id, planningSessionId });
  }
}
