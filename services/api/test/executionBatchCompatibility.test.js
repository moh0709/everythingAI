import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getActionExecutionById,
  listActionExecutions,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import { executeActionPreview } from '../src/actions/actionExecutor.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-execution-batch-compat-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-execution-batch-compat-'));
  await fs.writeFile(path.join(root, 'Batch Compat Notes.md'), '# Batch\nSupplier contract batch compatibility test');
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

async function preparePreview(db, { actionType = 'tag' } = {}) {
  const file = fileByName(db, 'Batch Compat Notes.md');
  const suggestions = generatePreviewSuggestions(db, { fileId: file.id });
  const suggestion = suggestions.find((item) => item.action_type === actionType);
  const preview = await createActionPreview(db, { suggestionId: suggestion.id });
  return { file, preview };
}

test('normal action execution keeps execution_batch_id null', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const { preview } = await preparePreview(db, { actionType: 'tag' });
  const execution = await executeActionPreview(db, { previewId: preview.id, approve: true });
  const storedExecution = getActionExecutionById(db, execution.id);

  assert.equal(execution.execution_batch_id, null);
  assert.equal(storedExecution.execution_batch_id, null);

  db.close();
});

test('successful action execution stores execution_batch_id when provided', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());
  const executionBatchId = 'batch-compat-success';

  await indexFixture(root, db);
  const { preview } = await preparePreview(db, { actionType: 'tag' });
  const execution = await executeActionPreview(db, {
    previewId: preview.id,
    approve: true,
    executionBatchId,
  });
  const storedExecution = getActionExecutionById(db, execution.id);

  assert.equal(execution.execution_batch_id, executionBatchId);
  assert.equal(storedExecution.execution_batch_id, executionBatchId);

  db.close();
});

test('failed action execution stores execution_batch_id when provided', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());
  const executionBatchId = 'batch-compat-failure';

  await indexFixture(root, db);
  const { file, preview } = await preparePreview(db, { actionType: 'move' });
  await fs.unlink(file.absolute_path);

  await assert.rejects(
    () => executeActionPreview(db, {
      previewId: preview.id,
      approve: true,
      executionBatchId,
    }),
    /Source file no longer exists/,
  );

  const executions = listActionExecutions(db, { fileId: file.id });
  assert.equal(executions.length, 1);
  assert.equal(executions[0].status, 'failed');
  assert.equal(executions[0].execution_batch_id, executionBatchId);

  db.close();
});
