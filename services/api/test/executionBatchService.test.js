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
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import {
  createExecutionBatch,
  EXECUTION_BATCH_STATUSES,
  getExecutionBatchDetail,
  listExecutionBatchSummaries,
} from '../src/executionBatches/executionBatchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-execution-batch-service-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-execution-batch-service-'));
  await fs.writeFile(path.join(root, 'Batch Service Notes.md'), '# Batch Service\nSupplier contract batch service test');
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

async function createPreviews(db, { conflictMove = false, root } = {}) {
  const file = fileByName(db, 'Batch Service Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: file.id });

  const tagSuggestion = suggestions.find((item) => item.action_type === 'tag');
  const moveSuggestion = suggestions.find((item) => item.action_type === 'move');

  if (conflictMove) {
    const targetDir = path.join(root, moveSuggestion.suggested_value);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, file.filename), 'conflict target');
  }

  const tagPreview = await createActionPreview(db, { suggestionId: tagSuggestion.id });
  const movePreview = await createActionPreview(db, { suggestionId: moveSuggestion.id });

  return { file, tagPreview, movePreview };
}

function batchAuditEvents(db, batchId) {
  return listAuditLog(db, { entityType: 'execution_batch', entityId: batchId });
}

test('creates draft execution batch from selected ready preview IDs', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview, movePreview } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, {
    previewIds: [tagPreview.id, movePreview.id],
  });

  assert.equal(batch.status, EXECUTION_BATCH_STATUSES.DRAFT);
  assert.equal(batch.summary.total_previews, 2);
  assert.equal(batch.summary.ready_previews, 2);
  assert.equal(batch.summary.blocked_previews, 0);
  assert.deepEqual(batch.summary.preview_ids, [tagPreview.id, movePreview.id]);
  assert.equal(batch.summary.executed, 0);
  assert.equal(batch.summary.failed, 0);
  assert.equal(batch.summary.policy.execution_order, 'preview_creation_order');
  assert.equal(batch.summary.policy.partial_failure, 'stop_on_first_failure');
  assert.equal(batch.summary.policy.automatic_rollback, false);

  const auditEvent = batchAuditEvents(db, batch.id)[0];
  assert.equal(auditEvent.event_type, 'execution_batch.created');
  assert.equal(auditEvent.payload.id, batch.id);
  assert.equal(auditEvent.payload.status, EXECUTION_BATCH_STATUSES.DRAFT);

  db.close();
});

test('creates draft batch with blocked preview counts without executing anything', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview, movePreview, file } = await createPreviews(db, { root, conflictMove: true });
  const batch = createExecutionBatch(db, {
    previewIds: [tagPreview.id, movePreview.id],
  });

  assert.equal(batch.summary.total_previews, 2);
  assert.equal(batch.summary.ready_previews, 1);
  assert.equal(batch.summary.blocked_previews, 1);
  const blockedPreview = batch.summary.previews.find((preview) => preview.preview_id === movePreview.id);
  assert.equal(blockedPreview.validation_valid, false);
  assert.equal(blockedPreview.validation_reason, 'Target file already exists.');
  assert.equal(await fs.readFile(file.absolute_path, 'utf8'), '# Batch Service\nSupplier contract batch service test');

  db.close();
});

test('deduplicates preview IDs while preserving first-seen order', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview, movePreview } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, {
    previewIds: [tagPreview.id, movePreview.id, tagPreview.id],
  });

  assert.deepEqual(batch.summary.preview_ids, [tagPreview.id, movePreview.id]);
  assert.equal(batch.summary.total_previews, 2);

  db.close();
});

test('rejects empty or missing preview IDs', async () => {
  const db = openDatabase(tempDbPath());

  assert.throws(() => createExecutionBatch(db, { previewIds: [] }), /requires at least one preview ID/);
  assert.throws(() => createExecutionBatch(db, { previewIds: ['missing-preview'] }), /Action preview not found/);

  db.close();
});

test('lists execution batches and returns batch detail with executions array', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, {
    previewIds: [tagPreview.id],
    planningSessionId: null,
  });

  const batches = listExecutionBatchSummaries(db, { status: EXECUTION_BATCH_STATUSES.DRAFT });
  const detail = getExecutionBatchDetail(db, batch.id);

  assert.equal(batches.length, 1);
  assert.equal(batches[0].id, batch.id);
  assert.equal(detail.id, batch.id);
  assert.equal(detail.status, EXECUTION_BATCH_STATUSES.DRAFT);
  assert.deepEqual(detail.executions, []);
  assert.equal(getExecutionBatchDetail(db, 'missing-batch'), null);

  db.close();
});
