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
  return path.join(os.tmpdir(), `everythingai-nested-undo-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createNestedFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-nested-undo-'));
  const nestedDir = path.join(root, 'Projects', 'Alpha');
  await fs.mkdir(nestedDir, { recursive: true });
  await fs.writeFile(path.join(nestedDir, 'Nested Undo Notes.md'), '# Nested Undo\nSupplier Alpha nested undo test');
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

function auditEvents(db, executionId, eventType) {
  return listAuditLog(db, { entityType: 'action_execution', entityId: executionId })
    .filter((event) => event.event_type === eventType);
}

test('nested undo restores the original nested relative path after approved cross-folder move', async () => {
  const root = await createNestedFixture();
  const db = openDatabase(tempDbPath());
  const originalAbsolutePath = path.join(root, 'Projects', 'Alpha', 'Nested Undo Notes.md');
  const originalRelativePath = path.join('Projects', 'Alpha', 'Nested Undo Notes.md');

  await indexFixture(root, db);

  const file = fileByName(db, 'Nested Undo Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: file.id });
  const moveSuggestion = suggestions.find((item) => item.action_type === 'move');
  const preview = await createActionPreview(db, {
    suggestionId: moveSuggestion.id,
    destinationFolder: root,
  });
  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });

  assert.notEqual(execution.target_path, originalAbsolutePath);
  assert.equal(await fs.readFile(execution.target_path, 'utf8'), '# Nested Undo\nSupplier Alpha nested undo test');

  const undone = await undoActionExecution(db, { executionId: execution.id, approve: true });
  const restoredFile = getIndexedFileById(db, file.id);
  const undoSnapshot = findRecoverySnapshots(db, { executionId: execution.id })
    .find((snapshot) => snapshot.snapshot_type === RECOVERY_SNAPSHOT_TYPES.UNDO_PRE_MUTATION);
  const undoAudit = auditEvents(db, execution.id, 'action.undone')[0];

  assert.equal(undone.status, 'undone');
  assert.equal(restoredFile.absolute_path, originalAbsolutePath);
  assert.equal(restoredFile.relative_path, originalRelativePath);
  assert.equal(restoredFile.filename, 'Nested Undo Notes.md');
  assert.equal(await fs.readFile(originalAbsolutePath, 'utf8'), '# Nested Undo\nSupplier Alpha nested undo test');
  assert.equal(Boolean(undoSnapshot), true);
  assert.equal(undoSnapshot.status, RECOVERY_SNAPSHOT_STATUSES.USED);
  assert.equal(undoSnapshot.source_path, execution.undo_source_path);
  assert.equal(undoSnapshot.target_path, execution.undo_target_path);
  assert.equal(undoAudit.payload.recovery_snapshot_id, undoSnapshot.id);

  db.close();
});
