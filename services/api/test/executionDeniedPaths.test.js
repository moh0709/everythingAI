import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getActionPreviewById,
  listActionExecutions,
  listAuditLog,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import { executeActionPreview } from '../src/actions/actionExecutor.js';
import { moveFileToTrash } from '../src/recovery/trashService.js';
import { findRecoverySnapshots } from '../src/recovery/recoverySnapshotService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-execution-denied-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-execution-denied-'));
  await fs.writeFile(path.join(root, 'Denied Contract Notes.md'), '# Denied\nSupplier contract denied execution test');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

function fileByName(db, filename) {
  return listIndexedFiles(db, { limit: 100 }).find((file) => file.filename === filename);
}

async function preparePreview(db, { root, actionType = 'move', conflict = false } = {}) {
  const file = fileByName(db, 'Denied Contract Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: file.id });
  const suggestion = suggestions.find((item) => item.action_type === actionType);

  if (conflict && actionType === 'move') {
    const targetDir = path.join(root, suggestion.suggested_value);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, file.filename), 'conflict target');
  }

  const preview = await createActionPreview(db, { suggestionId: suggestion.id });
  return { file, preview, suggestion };
}

function actionFailedEvents(db, executionId) {
  return listAuditLog(db, { entityType: 'action_execution', entityId: executionId })
    .filter((event) => event.event_type === 'action.failed');
}

test('execution without approval is rejected without creating execution or snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'move' });

  await assert.rejects(
    () => executeActionPreview(db, { previewId: preview.id, approve: false }),
    /Explicit approval is required/,
  );

  assert.equal(listActionExecutions(db, { fileId: file.id }).length, 0);
  assert.equal(findRecoverySnapshots(db, { fileId: file.id }).length, 0);

  db.close();
});

test('blocked preview cannot execute and is rejected before mutation', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'move', conflict: true });

  assert.equal(preview.preview_status, 'blocked');
  await assert.rejects(
    () => executeActionPreview(db, { previewId: preview.id, approve: true }),
    /Action preview failed validation/,
  );

  assert.equal(listActionExecutions(db, { fileId: file.id }).length, 0);
  assert.equal(findRecoverySnapshots(db, { fileId: file.id }).length, 0);
  assert.equal(await fs.readFile(file.absolute_path, 'utf8'), '# Denied\nSupplier contract denied execution test');

  db.close();
});

test('move preview rejects an explicit destination outside the indexed source root', async () => {
  const root = await createFixture();
  const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-outside-root-'));
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = fileByName(db, 'Denied Contract Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: file.id });
  const moveSuggestion = suggestions.find((item) => item.action_type === 'move');
  const preview = await createActionPreview(db, {
    suggestionId: moveSuggestion.id,
    destinationFolder: outsideRoot,
  });

  assert.equal(preview.preview_status, 'blocked');
  assert.equal(preview.can_execute, 0);
  assert.equal(preview.target_path, null);
  assert.match(preview.blocked_reason, /outside the indexed source root/i);
  await assert.rejects(
    () => executeActionPreview(db, { previewId: preview.id, approve: true }),
    /Action preview failed validation/,
  );
  assert.equal(await fs.readFile(file.absolute_path, 'utf8'), '# Denied\nSupplier contract denied execution test');
  assert.equal(listActionExecutions(db, { fileId: file.id }).length, 0);

  db.close();
});

test('source missing creates failed execution, failed audit, and no snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'move' });
  await fs.unlink(file.absolute_path);

  await assert.rejects(
    () => executeActionPreview(db, { previewId: preview.id, approve: true }),
    /Source file no longer exists/,
  );

  const executions = listActionExecutions(db, { fileId: file.id });
  const failedExecution = executions[0];
  const updatedPreview = getActionPreviewById(db, preview.id);

  assert.equal(executions.length, 1);
  assert.equal(failedExecution.status, 'failed');
  assert.equal(failedExecution.error_message, 'Source file no longer exists.');
  assert.equal(actionFailedEvents(db, failedExecution.id).length, 1);
  assert.equal(findRecoverySnapshots(db, { fileId: file.id }).length, 0);
  assert.equal(updatedPreview.preview_status, 'blocked');
  assert.equal(updatedPreview.blocked_reason, 'source_missing');

  db.close();
});

test('target exists creates failed execution, failed audit, and no snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'move' });
  await fs.mkdir(path.dirname(preview.target_path), { recursive: true });
  await fs.writeFile(preview.target_path, 'late target conflict');

  await assert.rejects(
    () => executeActionPreview(db, { previewId: preview.id, approve: true }),
    /Target path already exists/,
  );

  const executions = listActionExecutions(db, { fileId: file.id });
  const failedExecution = executions[0];
  const updatedPreview = getActionPreviewById(db, preview.id);

  assert.equal(executions.length, 1);
  assert.equal(failedExecution.status, 'failed');
  assert.equal(failedExecution.error_message, 'Target path already exists.');
  assert.equal(actionFailedEvents(db, failedExecution.id).length, 1);
  assert.equal(findRecoverySnapshots(db, { fileId: file.id }).length, 0);
  assert.equal(updatedPreview.preview_status, 'blocked');
  assert.equal(updatedPreview.blocked_reason, 'target_exists');
  assert.equal(await fs.readFile(file.absolute_path, 'utf8'), '# Denied\nSupplier contract denied execution test');

  db.close();
});

test('execution against active trashed file is rejected with failed audit and no snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'move' });
  moveFileToTrash(db, { fileId: file.id, approve: true });

  await assert.rejects(
    () => executeActionPreview(db, { previewId: preview.id, approve: true }),
    /Cannot execute action against active trashed file/,
  );

  const executions = listActionExecutions(db, { fileId: file.id });
  const failedExecution = executions[0];

  assert.equal(executions.length, 1);
  assert.equal(failedExecution.status, 'failed');
  assert.equal(failedExecution.error_message, 'Cannot execute action against active trashed file.');
  assert.equal(actionFailedEvents(db, failedExecution.id).length, 1);
  assert.equal(findRecoverySnapshots(db, { fileId: file.id }).length, 0);
  assert.equal(await fs.readFile(file.absolute_path, 'utf8'), '# Denied\nSupplier contract denied execution test');

  db.close();
});
