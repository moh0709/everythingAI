import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  listIndexedFiles,
  openDatabase,
  upsertFileLabel,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { generateFileInsights } from '../src/insights/insightService.js';
import { generatePreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { moveFileToTrash } from '../src/recovery/trashService.js';
import { semanticSearchFiles } from '../src/search/semanticSearch.js';
import { unifiedSearch } from '../src/search/unifiedSearchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-unified-search-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-unified-search-'));
  await fs.writeFile(path.join(root, 'Active Unified Supplier.txt'), 'sharedtoken active supplier contract technical notes');
  await fs.writeFile(path.join(root, 'Trashed Unified Supplier.txt'), 'sharedtoken trashed supplier contract technical notes');
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

function hasFilename(rows, filename) {
  return rows.some((row) => row.filename === filename);
}

function assertNoTrashedLeak(result, trashedFilename) {
  assert.equal(hasFilename(result.files, trashedFilename), false);
  assert.equal(hasFilename(result.semantic, trashedFilename), false);
  assert.equal(hasFilename(result.ranked_files, trashedFilename), false);
  assert.equal(hasFilename(result.insights, trashedFilename), false);
  assert.equal(hasFilename(result.labels, trashedFilename), false);
  assert.equal(hasFilename(result.suggestions, trashedFilename), false);
}

test('semantic search hides trashed files by default and includes them when requested', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const trashedFile = fileByName(db, 'Trashed Unified Supplier.txt');
  moveFileToTrash(db, { fileId: trashedFile.id });

  const normalResults = semanticSearchFiles(db, { query: 'sharedtoken supplier', limit: 10 });
  const recoveryResults = semanticSearchFiles(db, { query: 'sharedtoken supplier', limit: 10, includeTrashed: true });

  assert.equal(hasFilename(normalResults, 'Active Unified Supplier.txt'), true);
  assert.equal(hasFilename(normalResults, 'Trashed Unified Supplier.txt'), false);
  assert.equal(hasFilename(recoveryResults, 'Trashed Unified Supplier.txt'), true);
  assert.equal(recoveryResults.find((row) => row.filename === 'Trashed Unified Supplier.txt').recovery_status, 'trashed');

  db.close();
});

test('unified search does not leak trashed file-linked rows by default', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });
  await generateFileInsights(db, { limit: 10 });

  const activeFile = fileByName(db, 'Active Unified Supplier.txt');
  const trashedFile = fileByName(db, 'Trashed Unified Supplier.txt');

  upsertFileLabel(db, { fileId: activeFile.id, tag: 'sharedtoken', category: 'supplier' });
  upsertFileLabel(db, { fileId: trashedFile.id, tag: 'sharedtoken', category: 'supplier' });
  generatePreviewSuggestions(db, { fileId: activeFile.id });
  generatePreviewSuggestions(db, { fileId: trashedFile.id });
  moveFileToTrash(db, { fileId: trashedFile.id });

  const normalResult = unifiedSearch(db, { query: 'sharedtoken', limit: 10 });
  const recoveryResult = unifiedSearch(db, { query: 'sharedtoken', limit: 10, includeTrashed: true });

  assertNoTrashedLeak(normalResult, 'Trashed Unified Supplier.txt');
  assert.equal(hasFilename(normalResult.files, 'Active Unified Supplier.txt'), true);
  assert.equal(hasFilename(normalResult.semantic, 'Active Unified Supplier.txt'), true);
  assert.equal(hasFilename(normalResult.ranked_files, 'Active Unified Supplier.txt'), true);
  assert.equal(hasFilename(normalResult.insights, 'Active Unified Supplier.txt'), true);
  assert.equal(hasFilename(normalResult.labels, 'Active Unified Supplier.txt'), true);

  assert.equal(hasFilename(recoveryResult.files, 'Trashed Unified Supplier.txt'), true);
  assert.equal(hasFilename(recoveryResult.semantic, 'Trashed Unified Supplier.txt'), true);
  assert.equal(hasFilename(recoveryResult.ranked_files, 'Trashed Unified Supplier.txt'), true);
  assert.equal(hasFilename(recoveryResult.insights, 'Trashed Unified Supplier.txt'), true);
  assert.equal(hasFilename(recoveryResult.labels, 'Trashed Unified Supplier.txt'), true);
  assert.equal(recoveryResult.files.find((row) => row.filename === 'Trashed Unified Supplier.txt').recovery_status, 'trashed');
  assert.equal(recoveryResult.ranked_files.find((row) => row.filename === 'Trashed Unified Supplier.txt').recovery_status, 'trashed');
  assert.equal(recoveryResult.insights.find((row) => row.filename === 'Trashed Unified Supplier.txt').recovery_status, 'trashed');
  assert.equal(recoveryResult.labels.find((row) => row.filename === 'Trashed Unified Supplier.txt').recovery_status, 'trashed');

  db.close();
});
