import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  listAuditLog,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import {
  listTrashRecords,
  moveFileToTrash,
  restoreTrashRecord,
} from '../src/recovery/trashService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-recovery-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createRecoveryFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-recovery-'));
  await fs.writeFile(path.join(root, 'Recovery Notes.txt'), 'Recoverable local MVP file');
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

test('moves a file to local recovery trash with retention metadata and audit event', async () => {
  const root = await createRecoveryFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = fileByName(db, 'Recovery Notes.txt');
  const trashRecord = moveFileToTrash(db, { fileId: file.id, retentionDays: 7 });
  const trashRecords = listTrashRecords(db, { status: 'trashed', limit: 10 });
  const auditEvents = listAuditLog(db, { entityType: 'trash_record', entityId: trashRecord.id });

  assert.equal(trashRecord.file_id, file.id);
  assert.equal(trashRecord.status, 'trashed');
  assert.equal(trashRecord.original_absolute_path, file.absolute_path);
  assert.equal(trashRecord.original_relative_path, file.relative_path);
  assert.equal(trashRecords.length, 1);
  assert.equal(trashRecords[0].filename, 'Recovery Notes.txt');
  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].event_type, 'file.trashed');
  assert.equal(auditEvents[0].payload.retention_days, 7);

  db.close();
});

test('prevents duplicate active trash records for the same file', async () => {
  const root = await createRecoveryFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = fileByName(db, 'Recovery Notes.txt');
  const firstTrashRecord = moveFileToTrash(db, { fileId: file.id });

  assert.throws(
    () => moveFileToTrash(db, { fileId: file.id }),
    (error) => error.statusCode === 409 && error.trashRecord.id === firstTrashRecord.id,
  );

  db.close();
});

test('restores a trashed file record and records recovery audit event', async () => {
  const root = await createRecoveryFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = fileByName(db, 'Recovery Notes.txt');
  const trashRecord = moveFileToTrash(db, { fileId: file.id });
  const restored = restoreTrashRecord(db, {
    trashId: trashRecord.id,
    reason: 'Recovery test restore',
  });
  const activeTrashRecords = listTrashRecords(db, { status: 'trashed', limit: 10 });
  const restoredRecords = listTrashRecords(db, { status: 'restored', limit: 10 });
  const auditEvents = listAuditLog(db, { entityType: 'trash_record', entityId: trashRecord.id });

  assert.equal(restored.status, 'restored');
  assert.equal(restored.restore_reason, 'Recovery test restore');
  assert.equal(Boolean(restored.restored_at), true);
  assert.equal(activeTrashRecords.length, 0);
  assert.equal(restoredRecords.length, 1);
  assert.deepEqual(auditEvents.map((event) => event.event_type).sort(), ['file.restored', 'file.trashed']);

  db.close();
});

test('prevents restoring a trash record more than once', async () => {
  const root = await createRecoveryFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const file = fileByName(db, 'Recovery Notes.txt');
  const trashRecord = moveFileToTrash(db, { fileId: file.id });
  restoreTrashRecord(db, { trashId: trashRecord.id });

  assert.throws(
    () => restoreTrashRecord(db, { trashId: trashRecord.id }),
    (error) => error.statusCode === 409 && /cannot be restored/.test(error.message),
  );

  db.close();
});
