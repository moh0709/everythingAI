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
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { generateFileInsights } from '../src/insights/insightService.js';
import { moveFileToTrash } from '../src/recovery/trashService.js';
import { createDocumentContext } from '../src/documents/documentContextService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-document-context-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-document-context-'));
  await fs.writeFile(path.join(root, 'Active Context.txt'), 'Active document context source reference text.');
  await fs.writeFile(path.join(root, 'Trash Context.txt'), 'Trash document context text.');
  await fs.writeFile(path.join(root, 'Stale Context.txt'), 'This file will become stale.');
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

function assertContextContract(context, filename) {
  assert.equal(context.file.filename, filename);
  assert.equal(typeof context.file.id, 'string');
  assert.equal(typeof context.file.absolute_path, 'string');
  assert.equal(typeof context.file.relative_path, 'string');
  assert.equal(typeof context.file.index_status, 'string');
  assert.equal(typeof context.file.recovery_status, 'string');
  assert.equal(typeof context.source_reference, 'object');
  assert.equal(context.source_reference.file_id, context.file.id);
  assert.equal(context.source_reference.filename, context.file.filename);
  assert.equal(context.source_reference.absolute_path, context.file.absolute_path);
  assert.equal(context.source_reference.relative_path, context.file.relative_path);
  assert.equal(context.source_reference.source_type, 'local_file');
}

test('document context includes active file metadata, preview text, source reference, and insight', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });
  await generateFileInsights(db, { limit: 10 });

  const activeFile = fileByName(db, 'Active Context.txt');
  const context = createDocumentContext(db, { fileId: activeFile.id });

  assertContextContract(context, 'Active Context.txt');
  assert.equal(context.file.recovery_status, 'active');
  assert.equal(context.file.extraction_status, 'extracted');
  assert.equal(context.file.extraction_error_message, null);
  assert.match(context.previewText, /Active document context/);
  assert.equal(Boolean(context.insight), true);

  db.close();
});

test('document context marks trashed files without hiding context', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const trashFile = fileByName(db, 'Trash Context.txt');
  moveFileToTrash(db, { fileId: trashFile.id });
  const context = createDocumentContext(db, { fileId: trashFile.id });

  assertContextContract(context, 'Trash Context.txt');
  assert.equal(context.file.recovery_status, 'trashed');
  assert.equal(context.file.extraction_status, 'extracted');
  assert.match(context.previewText, /Trash document context/);

  db.close();
});

test('document context exposes failed stale file state clearly', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  const staleFile = fileByName(db, 'Stale Context.txt');
  await fs.unlink(path.join(root, 'Stale Context.txt'));
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const failedFile = getIndexedFileById(db, staleFile.id);
  const context = createDocumentContext(db, { fileId: staleFile.id });

  assert.equal(failedFile.index_status, 'failed');
  assertContextContract(context, 'Stale Context.txt');
  assert.equal(context.file.index_status, 'failed');
  assert.match(context.file.index_error_message, /no longer exists on disk/);
  assert.equal(context.file.extraction_status, null);
  assert.equal(context.previewText, '');

  db.close();
});
