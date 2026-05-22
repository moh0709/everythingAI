import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getIndexedFileById,
  listFileEmbeddings,
  openDatabase,
  upsertFileExtraction,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { generateEmbeddings } from '../src/embeddings/embeddingService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-embedding-skip-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-embedding-skip-'));
  await fs.writeFile(path.join(root, 'embedding-notes.txt'), 'supplier alpha payment terms');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

test('embedding generation skips unchanged extracted text and regenerates changed text', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const first = generateEmbeddings(db, { limit: 10 });
  const second = generateEmbeddings(db, { limit: 10 });
  const file = getIndexedFileById(db, first.results[0].fileId);
  const beforeEmbedding = listFileEmbeddings(db, { limit: 10 })[0];

  upsertFileExtraction(db, {
    file_id: file.id,
    extracted_text: `${file.extracted_text}\nnew supplier beta renewal terms`,
    extraction_status: 'extracted',
    extractor_name: 'test-mutator',
    extracted_at: new Date().toISOString(),
    error_message: null,
    metadata_json: '{}',
  });

  const third = generateEmbeddings(db, { limit: 10 });
  const afterEmbedding = listFileEmbeddings(db, { limit: 10 })[0];

  assert.equal(first.generated, 1);
  assert.equal(first.skipped_unchanged, 0);
  assert.equal(second.generated, 0);
  assert.equal(second.skipped_unchanged, 1);
  assert.equal(second.skipped[0].reason, 'unchanged');
  assert.equal(third.generated, 1);
  assert.equal(third.skipped_unchanged, 0);
  assert.notEqual(beforeEmbedding.vector_json, afterEmbedding.vector_json);

  db.close();
});
