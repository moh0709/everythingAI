import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  listFileEmbeddings,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { generateEmbeddings, searchEmbeddings } from '../src/embeddings/embeddingService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-embedding-provider-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-embedding-provider-'));
  await fs.writeFile(path.join(root, 'provider-notes.txt'), 'supplier alpha payment terms');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

test('embedding generation accepts a custom synchronous provider while default search remains stable', async () => {
  const root = await createFixture();
  const db = openDatabase(tempDbPath());
  const calls = [];
  const provider = {
    id: 'test-provider',
    model: 'test-neural-provider-v1',
    embed(text) {
      calls.push(text);
      return {
        model: 'test-neural-provider-v1',
        vector: [1, 0, 0, 0],
        tokenCount: text.split(/\s+/).filter(Boolean).length,
      };
    },
  };

  await indexFixture(root, db);
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const result = generateEmbeddings(db, { limit: 10, provider });
  const stored = listFileEmbeddings(db, { limit: 10 })[0];
  const searchResults = searchEmbeddings(db, { query: 'supplier alpha', limit: 5 });

  assert.equal(result.embedding_model, 'test-neural-provider-v1');
  assert.equal(result.generated, 1);
  assert.equal(calls.length, 1);
  assert.equal(stored.embedding_model, 'test-neural-provider-v1');
  assert.deepEqual(JSON.parse(stored.vector_json), [1, 0, 0, 0]);
  assert.equal(Array.isArray(searchResults), true);

  db.close();
});
