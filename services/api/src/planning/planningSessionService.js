import crypto from 'node:crypto';
import {
  getPlanningSessionById,
  insertPlanningSession,
  listIndexedFiles,
  listOrganizationSuggestions,
  listPlanningSessions,
  updatePlanningSession,
} from '../db/client.js';
import { generatePreviewSuggestions } from '../suggestions/suggestionService.js';

export const PLANNING_SESSION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  RUNNING: 'running',
  READY: 'ready',
  FAILED: 'failed',
  ARCHIVED: 'archived',
});

export const PLANNING_SESSION_MODES = Object.freeze({
  DETERMINISTIC: 'deterministic',
  PROVIDER: 'provider',
  HYBRID: 'hybrid',
});

const DEFAULT_SETTINGS = Object.freeze({
  allowRename: true,
  allowMove: true,
  allowTag: true,
  allowCategory: true,
  requireApproval: true,
  confidenceThreshold: 0.3,
  includeContent: true,
  includeInsights: true,
  includeEntities: true,
});

const DEFAULT_SUMMARY = Object.freeze({
  totalFilesAnalyzed: 0,
  totalSuggestions: 0,
  totalCategorySuggestions: 0,
  totalTagSuggestions: 0,
  totalMoveSuggestions: 0,
  totalRenameSuggestions: 0,
  failedFiles: 0,
  skippedFiles: 0,
});

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return crypto
    .createHash('sha256')
    .update(`${prefix}:${Date.now()}:${Math.random()}`)
    .digest('hex');
}

function normalizeMode(mode) {
  if (Object.values(PLANNING_SESSION_MODES).includes(mode)) {
    return mode;
  }

  return PLANNING_SESSION_MODES.DETERMINISTIC;
}

function normalizeSource(source = {}) {
  const type = source?.type || 'all_indexed_files';

  if (type === 'file_ids') {
    return {
      type,
      fileIds: Array.isArray(source.fileIds) ? source.fileIds.filter(Boolean) : [],
    };
  }

  return { type: 'all_indexed_files' };
}

function normalizeSettings(settings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
}

function serializeSession(session) {
  return {
    id: session.id,
    status: session.status,
    mode: session.mode,
    source_json: JSON.stringify(session.source),
    settings_json: JSON.stringify(session.settings),
    summary_json: JSON.stringify(session.summary),
    error_message: session.error_message || null,
    created_at: session.created_at,
    updated_at: session.updated_at,
    completed_at: session.completed_at || null,
  };
}

function countSuggestions(suggestions) {
  const summary = { ...DEFAULT_SUMMARY };
  summary.totalSuggestions = suggestions.length;

  for (const suggestion of suggestions) {
    if (suggestion.action_type === 'category') summary.totalCategorySuggestions += 1;
    if (suggestion.action_type === 'tag') summary.totalTagSuggestions += 1;
    if (suggestion.action_type === 'move') summary.totalMoveSuggestions += 1;
    if (suggestion.action_type === 'rename') summary.totalRenameSuggestions += 1;
  }

  return summary;
}

function getFilesForPlanning(db, source, { limit = 1000 } = {}) {
  if (source.type === 'file_ids') {
    const requested = new Set(source.fileIds || []);
    return listIndexedFiles(db, { limit }).filter((file) => requested.has(file.id));
  }

  return listIndexedFiles(db, { limit });
}

export function createPlanningSession(db, {
  mode = PLANNING_SESSION_MODES.DETERMINISTIC,
  source = { type: 'all_indexed_files' },
  settings = {},
} = {}) {
  const timestamp = now();
  const session = {
    id: createId('planning-session'),
    status: PLANNING_SESSION_STATUSES.DRAFT,
    mode: normalizeMode(mode),
    source: normalizeSource(source),
    settings: normalizeSettings(settings),
    summary: { ...DEFAULT_SUMMARY },
    error_message: null,
    created_at: timestamp,
    updated_at: timestamp,
    completed_at: null,
  };

  insertPlanningSession(db, serializeSession(session));

  return getPlanningSessionById(db, session.id);
}

export function getPlanningSession(db, { sessionId }) {
  return getPlanningSessionById(db, sessionId);
}

export function getPlanningSessionWithSuggestions(db, { sessionId, limit = 500 }) {
  const session = getPlanningSessionById(db, sessionId);

  if (!session) return null;

  return {
    session,
    suggestions: listOrganizationSuggestions(db, { planningSessionId: sessionId, limit }),
  };
}

export function listPlanningSessionRecords(db, { limit = 100, status } = {}) {
  return listPlanningSessions(db, { limit, status });
}

export function runPlanningSession(db, { sessionId, limit = 1000 } = {}) {
  const session = getPlanningSessionById(db, sessionId);

  if (!session) {
    throw new Error(`Planning session not found: ${sessionId}`);
  }

  const startedAt = now();
  const runningSession = {
    ...session,
    status: PLANNING_SESSION_STATUSES.RUNNING,
    updated_at: startedAt,
    error_message: null,
  };
  updatePlanningSession(db, serializeSession(runningSession));

  try {
    const files = getFilesForPlanning(db, session.source, { limit });
    const suggestions = [];
    let failedFiles = 0;

    for (const file of files) {
      try {
        const generated = generatePreviewSuggestions(db, {
          fileId: file.id,
          planningSessionId: session.id,
        });
        suggestions.push(...generated.filter((suggestion) => suggestion.planning_session_id === session.id));
      } catch {
        failedFiles += 1;
      }
    }

    const summary = {
      ...countSuggestions(suggestions),
      totalFilesAnalyzed: files.length,
      failedFiles,
      skippedFiles: 0,
    };
    const completedAt = now();
    const readySession = {
      ...session,
      status: PLANNING_SESSION_STATUSES.READY,
      summary,
      error_message: null,
      updated_at: completedAt,
      completed_at: completedAt,
    };

    updatePlanningSession(db, serializeSession(readySession));

    return {
      session: getPlanningSessionById(db, session.id),
      suggestions: listOrganizationSuggestions(db, { planningSessionId: session.id, limit: Math.max(limit * 10, 500) }),
    };
  } catch (error) {
    const failedAt = now();
    const failedSession = {
      ...session,
      status: PLANNING_SESSION_STATUSES.FAILED,
      error_message: error.message,
      updated_at: failedAt,
      completed_at: failedAt,
    };

    updatePlanningSession(db, serializeSession(failedSession));
    throw error;
  }
}
