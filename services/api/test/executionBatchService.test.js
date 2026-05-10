import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  listActionExecutions,
  listAuditLog,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import {
  approveExecutionBatch,
  createExecutionBatch,
  EXECUTION_BATCH_STATUSES,
  getExecutionBatchDetail,
  listExecutionBatchSummaries,
  runExecutionBatch,
} from '../src/executionBatches/executionBatchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-execution-batch-service-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture(filename = 'Batch Service Notes.md') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-execution-batch-service-'));
  await fs.writeFile(path.join(root, filename), '# Batch Service\nSupplier contract batch service test');
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

async function createPreviews(db, { conflictMove = false, root, filename = 'Batch Service Notes.md' } = {}) {
  const file = fileByName(db, filename);
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

test('approves a draft execution batch with explicit approval', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview, movePreview } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, { previewIds: [tagPreview.id, movePreview.id] });
  const approved = approveExecutionBatch(db, { batchId: batch.id, approve: true });

  assert.equal(approved.status, EXECUTION_BATCH_STATUSES.APPROVED);
  assert.equal(typeof approved.approved_at, 'string');
  assert.equal(approved.summary.total_previews, 2);
  assert.equal(approved.summary.blocked_previews, 0);

  const events = batchAuditEvents(db, batch.id);
  assert.deepEqual(events.map((event) => event.event_type).sort(), [
    'execution_batch.approved',
    'execution_batch.created',
  ].sort());
  const approvedEvent = events.find((event) => event.event_type === 'execution_batch.approved');
  assert.equal(approvedEvent.payload.status, EXECUTION_BATCH_STATUSES.APPROVED);
  assert.equal(approvedEvent.payload.approved_at, approved.approved_at);

  db.close();
});

test('rejects batch approval without explicit approval', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, { previewIds: [tagPreview.id] });

  assert.throws(
    () => approveExecutionBatch(db, { batchId: batch.id, approve: false }),
    /Explicit approval is required/,
  );
  assert.equal(getExecutionBatchDetail(db, batch.id).status, EXECUTION_BATCH_STATUSES.DRAFT);
  assert.equal(batchAuditEvents(db, batch.id).filter((event) => event.event_type === 'execution_batch.approved').length, 0);

  db.close();
});

test('rejects approval for blocked-preview and missing batches', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview, movePreview } = await createPreviews(db, { root, conflictMove: true });
  const blockedBatch = createExecutionBatch(db, { previewIds: [tagPreview.id, movePreview.id] });

  assert.throws(
    () => approveExecutionBatch(db, { batchId: blockedBatch.id, approve: true }),
    /contains blocked previews/,
  );
  assert.throws(
    () => approveExecutionBatch(db, { batchId: 'missing-batch', approve: true }),
    /Execution batch not found/,
  );
  assert.equal(getExecutionBatchDetail(db, blockedBatch.id).status, EXECUTION_BATCH_STATUSES.DRAFT);

  db.close();
});

test('rejects approving a batch that is no longer draft', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, { previewIds: [tagPreview.id] });
  approveExecutionBatch(db, { batchId: batch.id, approve: true });

  assert.throws(
    () => approveExecutionBatch(db, { batchId: batch.id, approve: true }),
    /cannot be approved from status: approved/,
  );

  db.close();
});

test('runs an approved execution batch through the safe executor', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview, movePreview, file } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, { previewIds: [tagPreview.id, movePreview.id] });
  approveExecutionBatch(db, { batchId: batch.id, approve: true });
  const completed = await runExecutionBatch(db, { batchId: batch.id, approve: true });
  const detail = getExecutionBatchDetail(db, batch.id);

  assert.equal(completed.status, EXECUTION_BATCH_STATUSES.COMPLETED);
  assert.equal(completed.summary.executed, 2);
  assert.equal(completed.summary.failed, 0);
  assert.equal(completed.summary.execution_ids.length, 2);
  assert.equal(typeof completed.started_at, 'string');
  assert.equal(typeof completed.completed_at, 'string');
  assert.equal(detail.executions.length, 2);
  assert.equal(detail.executions.every((execution) => execution.execution_batch_id === batch.id), true);
  assert.equal(detail.executions.every((execution) => execution.status === 'executed'), true);
  assert.notEqual(file.absolute_path, detail.executions.find((execution) => execution.action_type === 'move').target_path);

  const eventTypes = batchAuditEvents(db, batch.id).map((event) => event.event_type);
  assert.equal(eventTypes.includes('execution_batch.started'), true);
  assert.equal(eventTypes.includes('execution_batch.completed'), true);

  db.close();
});

test('rejects running batch without explicit approval or from wrong status', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, { previewIds: [tagPreview.id] });

  await assert.rejects(
    () => runExecutionBatch(db, { batchId: batch.id, approve: false }),
    /Explicit approval is required/,
  );
  await assert.rejects(
    () => runExecutionBatch(db, { batchId: batch.id, approve: true }),
    /cannot run from status: draft/,
  );
  await assert.rejects(
    () => runExecutionBatch(db, { batchId: 'missing-batch', approve: true }),
    /Execution batch not found/,
  );

  db.close();
});

test('stops execution batch on first failure and marks completed_with_errors after partial success', async () => {
  const root = await createFixture('Batch Service Notes.md');
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { tagPreview, movePreview, file } = await createPreviews(db, { root });
  const batch = createExecutionBatch(db, { previewIds: [tagPreview.id, movePreview.id] });
  approveExecutionBatch(db, { batchId: batch.id, approve: true });
  await fs.unlink(file.absolute_path);

  const finalBatch = await runExecutionBatch(db, { batchId: batch.id, approve: true });
  const detail = getExecutionBatchDetail(db, batch.id);

  assert.equal(finalBatch.status, EXECUTION_BATCH_STATUSES.COMPLETED_WITH_ERRORS);
  assert.equal(finalBatch.summary.executed, 1);
  assert.equal(finalBatch.summary.failed, 1);
  assert.equal(finalBatch.summary.execution_ids.length, 2);
  assert.equal(finalBatch.summary.failed_preview_id, movePreview.id);
  assert.match(finalBatch.summary.error_message, /Source file no longer exists/);
  assert.equal(detail.executions.length, 2);
  assert.equal(detail.executions.some((execution) => execution.status === 'failed'), true);
  assert.equal(batchAuditEvents(db, batch.id).some((event) => event.event_type === 'execution_batch.completed_with_errors'), true);

  db.close();
});
