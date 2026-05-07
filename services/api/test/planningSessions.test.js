import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getPlanningSessionById,
  listOrganizationSuggestions,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import {
  createPlanningSession,
  getPlanningSessionWithSuggestions,
  listPlanningSessionRecords,
  runPlanningSession,
} from '../src/planning/planningSessionService.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import { executeActionPreview } from '../src/actions/actionExecutor.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-planning-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-planning-'));
  await fs.writeFile(path.join(root, 'Alpha Contract.md'), '# Alpha\nSupplier contract alpha renewal');
  await fs.writeFile(path.join(root, 'Project Notes.txt'), 'project beta planning notes and supplier follow-up');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

async function prepareDb() {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());
  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });
  return { root, db };
}

test('creates and lists planning sessions', async () => {
  const { db } = await prepareDb();

  const session = createPlanningSession(db, {
    source: { type: 'all_indexed_files' },
  });
  const stored = getPlanningSessionById(db, session.id);
  const sessions = listPlanningSessionRecords(db, { limit: 10 });

  assert.equal(session.status, 'draft');
  assert.equal(session.mode, 'deterministic');
  assert.equal(session.source.type, 'all_indexed_files');
  assert.equal(stored.id, session.id);
  assert.equal(sessions.some((item) => item.id === session.id), true);

  db.close();
});

test('runs a planning session and links generated suggestions to the session', async () => {
  const { db } = await prepareDb();

  const session = createPlanningSession(db, {
    source: { type: 'all_indexed_files' },
  });
  const result = runPlanningSession(db, { sessionId: session.id, limit: 100 });
  const withSuggestions = getPlanningSessionWithSuggestions(db, { sessionId: session.id, limit: 100 });

  assert.equal(result.session.status, 'ready');
  assert.equal(result.session.summary.totalFilesAnalyzed, 2);
  assert.equal(result.session.summary.totalSuggestions > 0, true);
  assert.equal(result.suggestions.length > 0, true);
  assert.equal(result.suggestions.every((suggestion) => suggestion.planning_session_id === session.id), true);
  assert.equal(withSuggestions.suggestions.length, result.suggestions.length);

  db.close();
});

test('session-aware dedupe does not let global suggestions block session suggestions', async () => {
  const { db } = await prepareDb();
  const file = db.prepare('SELECT * FROM indexed_files ORDER BY filename ASC LIMIT 1').get();

  const globalSuggestions = generatePreviewSuggestions(db, { fileId: file.id });
  const session = createPlanningSession(db, {
    source: { type: 'file_ids', fileIds: [file.id] },
  });
  const sessionResult = runPlanningSession(db, { sessionId: session.id, limit: 100 });
  const allSuggestionsForFile = listOrganizationSuggestions(db, { fileId: file.id, limit: 100 });
  const sessionSuggestions = allSuggestionsForFile.filter((suggestion) => suggestion.planning_session_id === session.id);
  const legacySuggestions = allSuggestionsForFile.filter((suggestion) => suggestion.planning_session_id === null);

  assert.equal(globalSuggestions.length > 0, true);
  assert.equal(legacySuggestions.length > 0, true);
  assert.equal(sessionResult.suggestions.length > 0, true);
  assert.equal(sessionSuggestions.length > 0, true);

  db.close();
});

test('rerunning the same planning session dedupes inside that session', async () => {
  const { db } = await prepareDb();

  const session = createPlanningSession(db, {
    source: { type: 'all_indexed_files' },
  });
  const firstRun = runPlanningSession(db, { sessionId: session.id, limit: 100 });
  const firstCount = firstRun.suggestions.length;
  const secondRun = runPlanningSession(db, { sessionId: session.id, limit: 100 });
  const secondCount = secondRun.suggestions.length;

  assert.equal(firstCount > 0, true);
  assert.equal(secondCount, firstCount);

  db.close();
});

test('previews and execution still work from session-linked suggestions', async () => {
  const { db } = await prepareDb();

  const session = createPlanningSession(db, {
    source: { type: 'all_indexed_files' },
  });
  const result = runPlanningSession(db, { sessionId: session.id, limit: 100 });
  const safeSuggestion = result.suggestions.find((suggestion) => (
    suggestion.action_type === 'tag' || suggestion.action_type === 'category'
  ));

  const preview = await createActionPreview(db, { suggestionId: safeSuggestion.id });
  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });

  assert.equal(safeSuggestion.planning_session_id, session.id);
  assert.equal(preview.suggestion_id, safeSuggestion.id);
  assert.equal(preview.can_execute, 1);
  assert.equal(execution.status, 'executed');

  db.close();
});
