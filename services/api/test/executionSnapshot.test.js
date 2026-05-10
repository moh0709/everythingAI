import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getIndexedFileById,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import { executeActionPreview } from '../src/actions/actionExecutor.js';
import {
  findRecoverySnapshots,
  RECOVERY_SNAPSHOT_STATUSES,
  RECOVERY_SNAPSHOT_TYPES,
} from '../src/recovery/recoverySnapshotService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-execution-snapshot-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-execution-snapshot-'));
  await fs.writeFile(path.join(root, 'Snapshot Contract Notes.md'), '# Snapshot\nSupplier contract execution snapshot test');
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

async function preparePreview(db, { root, actionType }) {
  const file = fileByName(db, 'Snapshot Contract Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: file.id });
  const suggestion = suggestions.find((item) => item.action_type === actionType);
  const preview = await createActionPreview(db, { suggestionId: suggestion.id });
  assert.equal(preview.preview_status, 'ready');
  return { file, preview, root };
}

test('move execution creates and uses recovery snapshot before filesystem mutation', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'move' });
  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });
  const snapshots = findRecoverySnapshots(db, { fileId: file.id });
  const snapshot = snapshots[0];
  const updatedFile = getIndexedFileById(db, file.id);

  assert.equal(snapshots.length, 1);
  assert.equal(snapshot.file_id, file.id);
  assert.equal(snapshot.preview_id, preview.id);
  assert.equal(snapshot.execution_id, execution.id);
  assert.equal(snapshot.snapshot_type, RECOVERY_SNAPSHOT_TYPES.EXECUTION_PRE_MUTATION);
  assert.equal(snapshot.status, RECOVERY_SNAPSHOT_STATUSES.USED);
  assert.equal(typeof snapshot.used_at, 'string');
  assert.equal(snapshot.source_path, preview.source_path);
  assert.equal(snapshot.target_path, preview.target_path);
  assert.equal(snapshot.metadata.file.id, file.id);
  assert.equal(snapshot.metadata.preview.id, preview.id);
  assert.equal(snapshot.metadata.execution.id, execution.id);
  assert.equal(snapshot.metadata.reason, 'pre-mutation snapshot before filesystem action execution');
  assert.equal(updatedFile.absolute_path, preview.target_path);
  assert.equal(await fs.readFile(preview.target_path, 'utf8'), '# Snapshot\nSupplier contract execution snapshot test');
  await assert.rejects(() => fs.access(preview.source_path));

  db.close();
});

test('rename execution creates and uses recovery snapshot before filesystem mutation', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'rename' });
  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });
  const snapshots = findRecoverySnapshots(db, { previewId: preview.id });
  const snapshot = snapshots[0];
  const updatedFile = getIndexedFileById(db, file.id);

  assert.equal(snapshots.length, 1);
  assert.equal(snapshot.status, RECOVERY_SNAPSHOT_STATUSES.USED);
  assert.equal(snapshot.execution_id, execution.id);
  assert.equal(snapshot.source_path, preview.source_path);
  assert.equal(snapshot.target_path, preview.target_path);
  assert.equal(updatedFile.filename, path.basename(preview.target_path));
  assert.equal(updatedFile.absolute_path, preview.target_path);
  assert.equal(await fs.readFile(preview.target_path, 'utf8'), '# Snapshot\nSupplier contract execution snapshot test');
  await assert.rejects(() => fs.access(preview.source_path));

  db.close();
});

test('app-level label execution does not create filesystem recovery snapshot', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { root, actionType: 'tag' });
  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });
  const snapshots = findRecoverySnapshots(db, { fileId: file.id });
  const updatedFile = getIndexedFileById(db, file.id);

  assert.equal(execution.status, 'executed');
  assert.equal(snapshots.length, 0);
  assert.equal(updatedFile.absolute_path, file.absolute_path);
  assert.equal(await fs.readFile(file.absolute_path, 'utf8'), '# Snapshot\nSupplier contract execution snapshot test');

  db.close();
});
