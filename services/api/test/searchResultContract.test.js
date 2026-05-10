import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { searchFiles } from '../src/search/searchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-search-contract-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-search-contract-'));
  await fs.writeFile(path.join(root, 'Supplier Contract Notes.txt'), 'Supplier contract renewal and source reference validation.');
  const nested = path.join(root, 'nested-source-folder');
  await fs.mkdir(nested);
  await fs.writeFile(path.join(nested, 'Context Manual.md'), '# Context\nEverythingAI source path validation.');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

function assertSearchResultContract(result) {
  assert.equal(typeof result.id, 'string');
  assert.equal(typeof result.filename, 'string');
  assert.equal(typeof result.absolute_path, 'string');
  assert.equal(typeof result.relative_path, 'string');
  assert.equal(typeof result.extension, 'string');
  assert.equal(typeof result.mime_type, 'string');
  assert.equal(typeof result.size_bytes, 'number');
  assert.equal(typeof result.index_status, 'string');
  assert.equal(typeof result.recovery_status, 'string');
  assert.equal(typeof result.source_reference, 'object');
  assert.equal(result.source_reference.file_id, result.id);
  assert.equal(result.source_reference.filename, result.filename);
  assert.equal(result.source_reference.absolute_path, result.absolute_path);
  assert.equal(result.source_reference.relative_path, result.relative_path);
  assert.equal(result.source_reference.source_type, 'local_file');
  assert.equal(typeof result.source_reference.source_label, 'string');
}

test('content search results include stable source references', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const results = searchFiles(db, { query: 'renewal', limit: 10 });
  const contract = results.find((result) => result.filename === 'Supplier Contract Notes.txt');

  assert.equal(Boolean(contract), true);
  assertSearchResultContract(contract);
  assert.match(contract.snippet, /renewal/i);
  assert.equal(contract.extraction_status, 'extracted');

  db.close();
});

test('filename and path search results include stable source references', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const filenameResults = searchFiles(db, { query: 'Context Manual', limit: 10 });
  const pathResults = searchFiles(db, { query: 'nested-source-folder', limit: 10 });
  const filenameMatch = filenameResults.find((result) => result.filename === 'Context Manual.md');
  const pathMatch = pathResults.find((result) => result.filename === 'Context Manual.md');

  assert.equal(Boolean(filenameMatch), true);
  assert.equal(Boolean(pathMatch), true);
  assertSearchResultContract(filenameMatch);
  assertSearchResultContract(pathMatch);
  assert.match(pathMatch.source_reference.relative_path, /nested-source-folder/);

  db.close();
});
