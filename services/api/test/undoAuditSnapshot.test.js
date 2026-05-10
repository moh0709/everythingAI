import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getIndexedFileById,
  listAuditLog,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import { executeActionPreview, undoActionExecution } from '../src/actions/actionExecutor.js';
import {
  findRecoverySnapshots,
  RECOVERY_SNAPSHOT_STATUSES,
  RECOVERY_SNAPSHOT_TYPES,
} from '../src/recovery/recoverySnapshotService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-undo-snapshot-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-undo-snapshot-'));
  await fs.writeFile(path.join(root, 'Undo Contract Notes.md'), '# Undo\nSupplier contract undo snapshot test');
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

async function executeMove(db) {
  const file = fileByName(db, 'Undo Contract Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: file.id });
  const moveSuggestion = suggestions.find((item) => item.action_type === 'move');
  const preview = await createActionPreview(db, { suggestionId: moveSuggestion.id });
  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });
  return { file, preview, execution };
}

function auditEvents(db, executionId, eventType) {
  return listAuditLog(db, { entityType: 'action_execution', entityId: executionId })
    .filter((event) => event.event_type === eventType);
}

test('undo without approval is rejected without audit or snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { execution } = await executeMove(db);

  await assert.rejects(
    () => undoActionExecution(db, { executionId: execution.id, approve: false }),
    /Explicit approval is required/,
  );

  assert.equal(auditEvents(db, execution.id, 'action.undo_failed').length, 0);
  assert.equal(findRecoverySnapshots(db, {
    executionId: execution.id,
    status: RECOVERY_SNAPSHOT_STATUSES.CREATED,
  }).length, 0);

  db.close();
});

test('successful filesystem undo creates used undo snapshot and audit includes snapshot id', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, execution } = await executeMove(db);
  const undone = await undoActionExecution(db, { executionId: execution.id, approve: true });
  const snapshots = findRecoverySnapshots(db, { executionId: execution.id });
  const undoSnapshot = snapshots.find((snapshot) => snapshot.snapshot_type === RECOVERY_SNAPSHOT_TYPES.UNDO_PRE_MUTATION);
  const undoAudit = auditEvents(db, execution.id, 'action.undone')[0];
  const restoredFile = getIndexedFileById(db, file.id);

  assert.equal(undone.status, 'undone');
  assert.equal(Boolean(undoSnapshot), true);
  assert.equal(undoSnapshot.status, RECOVERY_SNAPSHOT_STATUSES.USED);
  assert.equal(undoSnapshot.execution_id, execution.id);
  assert.equal(undoSnapshot.source_path, execution.undo_source_path);
  assert.equal(undoSnapshot.target_path, execution.undo_target_path);
  assert.equal(undoSnapshot.metadata.file.id, file.id);
  assert.equal(undoSnapshot.metadata.execution.id, execution.id);
  assert.equal(undoSnapshot.metadata.reason, 'pre-mutation snapshot before filesystem undo');
  assert.equal(undoAudit.payload.recovery_snapshot_id, undoSnapshot.id);
  assert.equal(restoredFile.absolute_path, execution.undo_target_path);
  assert.equal(await fs.readFile(execution.undo_target_path, 'utf8'), '# Undo\nSupplier contract undo snapshot test');

  db.close();
});

test('undo source missing is rejected and audited without snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { execution } = await executeMove(db);
  await fs.unlink(execution.undo_source_path);

  await assert.rejects(
    () => undoActionExecution(db, { executionId: execution.id, approve: true }),
    /Undo source path no longer exists/,
  );

  const failedAudit = auditEvents(db, execution.id, 'action.undo_failed')[0];
  const snapshots = findRecoverySnapshots(db, { executionId: execution.id })
    .filter((snapshot) => snapshot.snapshot_type === RECOVERY_SNAPSHOT_TYPES.UNDO_PRE_MUTATION);

  assert.equal(Boolean(failedAudit), true);
  assert.equal(failedAudit.payload.error_message, 'Undo source path no longer exists.');
  assert.equal(snapshots.length, 0);

  db.close();
});

test('undo target exists is rejected and audited without snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { execution } = await executeMove(db);
  await fs.writeFile(execution.undo_target_path, 'target conflict before undo');

  await assert.rejects(
    () => undoActionExecution(db, { executionId: execution.id, approve: true }),
    /Undo target path already exists/,
  );

  const failedAudit = auditEvents(db, execution.id, 'action.undo_failed')[0];
  const snapshots = findRecoverySnapshots(db, { executionId: execution.id })
    .filter((snapshot) => snapshot.snapshot_type === RECOVERY_SNAPSHOT_TYPES.UNDO_PRE_MUTATION);

  assert.equal(Boolean(failedAudit), true);
  assert.equal(failedAudit.payload.error_message, 'Undo target path already exists.');
  assert.equal(snapshots.length, 0);
  assert.equal(await fs.readFile(execution.undo_source_path, 'utf8'), '# Undo\nSupplier contract undo snapshot test');
  assert.equal(await fs.readFile(execution.undo_target_path, 'utf8'), 'target conflict before undo');

  db.close();
});
