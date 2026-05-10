import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import {
  createRecoverySnapshot,
  findRecoverySnapshots,
  markSnapshotFailed,
  markSnapshotUsed,
  RECOVERY_SNAPSHOT_STATUSES,
  RECOVERY_SNAPSHOT_TYPES,
} from '../src/recovery/recoverySnapshotService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-recovery-snapshot-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-recovery-snapshot-'));
  await fs.writeFile(path.join(root, 'Snapshot Source.txt'), 'snapshot test content');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

function firstIndexedFile(db) {
  return listIndexedFiles(db, { limit: 10 })[0];
}

test('creates recovery snapshot with replay metadata', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = firstIndexedFile(db);
  const snapshot = createRecoverySnapshot(db, {
    fileId: file.id,
    previewId: 'preview-1',
    snapshotType: RECOVERY_SNAPSHOT_TYPES.EXECUTION_PRE_MUTATION,
    sourcePath: file.absolute_path,
    targetPath: path.join(root, 'Renamed Snapshot Source.txt'),
    metadata: {
      file,
      preview: { id: 'preview-1', action_type: 'rename' },
      reason: 'test pre-mutation snapshot',
    },
  });

  assert.equal(typeof snapshot.id, 'string');
  assert.equal(snapshot.file_id, file.id);
  assert.equal(snapshot.preview_id, 'preview-1');
  assert.equal(snapshot.execution_id, null);
  assert.equal(snapshot.snapshot_type, RECOVERY_SNAPSHOT_TYPES.EXECUTION_PRE_MUTATION);
  assert.equal(snapshot.status, RECOVERY_SNAPSHOT_STATUSES.CREATED);
  assert.equal(snapshot.source_path, file.absolute_path);
  assert.match(snapshot.target_path, /Renamed Snapshot Source/);
  assert.equal(snapshot.used_at, null);
  assert.equal(snapshot.error_message, null);
  assert.equal(snapshot.metadata.file.id, file.id);
  assert.equal(snapshot.metadata.preview.action_type, 'rename');
  assert.equal(snapshot.metadata.reason, 'test pre-mutation snapshot');

  db.close();
});

test('lists recovery snapshots by file, preview, execution, and status', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = firstIndexedFile(db);
  const snapshot = createRecoverySnapshot(db, {
    fileId: file.id,
    previewId: 'preview-filter',
    executionId: 'execution-filter',
    snapshotType: RECOVERY_SNAPSHOT_TYPES.UNDO_PRE_MUTATION,
    sourcePath: file.absolute_path,
    targetPath: path.join(root, 'Undo Target.txt'),
  });

  assert.equal(findRecoverySnapshots(db, { fileId: file.id }).length, 1);
  assert.equal(findRecoverySnapshots(db, { previewId: 'preview-filter' }).length, 1);
  assert.equal(findRecoverySnapshots(db, { executionId: 'execution-filter' }).length, 1);
  assert.equal(findRecoverySnapshots(db, { status: RECOVERY_SNAPSHOT_STATUSES.CREATED }).length, 1);
  assert.equal(findRecoverySnapshots(db, { fileId: 'missing-file-id' }).length, 0);
  assert.equal(findRecoverySnapshots(db, { previewId: 'missing-preview-id' }).length, 0);
  assert.equal(findRecoverySnapshots(db, { executionId: 'missing-execution-id' }).length, 0);
  assert.equal(findRecoverySnapshots(db, { status: RECOVERY_SNAPSHOT_STATUSES.FAILED }).length, 0);
  assert.equal(snapshot.snapshot_type, RECOVERY_SNAPSHOT_TYPES.UNDO_PRE_MUTATION);

  db.close();
});

test('marks recovery snapshot used and failed', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = firstIndexedFile(db);
  const usedSnapshot = createRecoverySnapshot(db, {
    fileId: file.id,
    previewId: 'preview-used',
    sourcePath: file.absolute_path,
    targetPath: path.join(root, 'Used Target.txt'),
  });
  const failedSnapshot = createRecoverySnapshot(db, {
    fileId: file.id,
    previewId: 'preview-failed',
    sourcePath: file.absolute_path,
    targetPath: path.join(root, 'Failed Target.txt'),
  });

  const used = markSnapshotUsed(db, {
    snapshotId: usedSnapshot.id,
    executionId: 'execution-used',
  });
  const failed = markSnapshotFailed(db, {
    snapshotId: failedSnapshot.id,
    errorMessage: 'snapshot failed during test',
  });

  assert.equal(used.status, RECOVERY_SNAPSHOT_STATUSES.USED);
  assert.equal(used.execution_id, 'execution-used');
  assert.equal(typeof used.used_at, 'string');
  assert.equal(used.error_message, null);

  assert.equal(failed.status, RECOVERY_SNAPSHOT_STATUSES.FAILED);
  assert.equal(failed.execution_id, null);
  assert.equal(failed.used_at, null);
  assert.equal(failed.error_message, 'snapshot failed during test');

  db.close();
});

test('rejects invalid recovery snapshot requests', async () => {
  const db = openDatabase(tempDbPath());

  assert.throws(() => createRecoverySnapshot(db, {}), /requires fileId/);
  assert.throws(() => createRecoverySnapshot(db, {
    fileId: 'file-1',
    snapshotType: 'invalid_type',
  }), /Unsupported recovery snapshot type/);

  db.close();
});
