import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  createIndexedFileSourceFingerprint,
  projectStructuredExtractionToLegacy,
  runStructuredExtractionShadow,
} from '../src/extractors/structuredExtractionShadowBridge.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import {
  getIndexedFileById,
  listIndexedFiles,
  openDatabase,
  upsertIndexedFile,
} from '../src/db/client.js';

function fixture(name = 'native-text.json') {
  return JSON.parse(fs.readFileSync(
    path.resolve('test/fixtures/structured-document', name),
    'utf8',
  ));
}

function indexedFile(overrides = {}) {
  return {
    id: 'file-native-1',
    absolute_path: '/fixtures/native.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    modified_at: '1970-01-01T00:00:01.000Z',
    content_hash: 'sha256:native-001',
    ...overrides,
  };
}

function responseFor(request, text = 'Native document text.') {
  const extraction = fixture();
  extraction.file_id = request.file.file_id;
  extraction.source_path = request.file.source_path;
  extraction.source_fingerprint = { ...request.file.source_fingerprint };
  extraction.extractor.id = request.adapter.id;
  extraction.extractor.version = request.adapter.version;
  extraction.extractor.local = true;
  extraction.plain_text = text;

  return {
    protocol_version: '1.0',
    request_id: request.request_id,
    status: 'ok',
    adapter: { ...request.adapter },
    extraction,
  };
}

test('creates indexed-file fingerprint from existing indexed metadata', () => {
  assert.deepEqual(createIndexedFileSourceFingerprint(indexedFile()), {
    hash: 'sha256:native-001',
    size_bytes: 1024,
    mtime_ms: 1000,
  });

  assert.throws(
    () => createIndexedFileSourceFingerprint(indexedFile({ content_hash: null })),
    /STRUCTURED_SHADOW_SOURCE_FINGERPRINT_UNAVAILABLE/,
  );
});

test('projects structured extraction to deterministic legacy text without authority expansion', () => {
  const projected = projectStructuredExtractionToLegacy(fixture());

  assert.equal(projected.extracted_text, 'Native document text.');
  assert.match(projected.extractor_name, /^structured-shadow:/);
  assert.equal(projected.metadata.page_count, 1);
  assert.equal(projected.filesystem_mutation_allowed, false);
  assert.equal(projected.execution_allowed, false);
  assert.equal(projected.automatic_approval_allowed, false);
});

test('shadow bridge reports match/difference without replacing legacy result', async () => {
  const file = indexedFile();
  const adapter = { id: 'fixture-adapter', version: '1.0.0' };
  const legacy = {
    extraction_status: 'extracted',
    extractor_name: 'pdf-parse',
    extracted_text: 'Native document text.',
  };

  const matched = await runStructuredExtractionShadow({
    file,
    legacy_result: legacy,
    adapter,
    invoke: async (request) => responseFor(request),
  });
  assert.equal(matched.status, 'match');
  assert.equal(matched.legacy_extractor_name, 'pdf-parse');

  const different = await runStructuredExtractionShadow({
    file,
    legacy_result: legacy,
    adapter,
    invoke: async (request) => responseFor(request, 'Different structured text.'),
  });
  assert.equal(different.status, 'different');
  assert.equal(legacy.extracted_text, 'Native document text.');
});

test('shadow bridge fails closed on stale fingerprint mismatch', async () => {
  const file = indexedFile();
  await assert.rejects(
    () => runStructuredExtractionShadow({
      file,
      legacy_result: {
        extraction_status: 'extracted',
        extractor_name: 'pdf-parse',
        extracted_text: 'Native document text.',
      },
      adapter: { id: 'fixture-adapter', version: '1.0.0' },
      invoke: async (request) => {
        const response = responseFor(request);
        response.extraction.source_fingerprint.hash = 'sha256:stale';
        return response;
      },
    }),
    /STRUCTURED_ADAPTER_FINGERPRINT_MISMATCH/,
  );
});

test('extraction runner persists legacy extraction unchanged when shadow adapter fails', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'everythingai-shadow-'));
  const dbPath = path.join(root, 'test.sqlite');
  const filePath = path.join(root, 'example.txt');
  await fsp.writeFile(filePath, 'Legacy text remains authoritative.');

  const stat = await fsp.stat(filePath);
  const db = openDatabase(dbPath);
  upsertIndexedFile(db, {
    id: 'shadow-file-1',
    filename: 'example.txt',
    absolute_path: filePath,
    relative_path: 'example.txt',
    extension: '.txt',
    mime_type: 'text/plain',
    size_bytes: stat.size,
    created_at: stat.birthtime.toISOString(),
    modified_at: stat.mtime.toISOString(),
    content_hash: 'sha256:shadow-fixture',
    index_status: 'indexed',
    last_indexed_at: new Date().toISOString(),
    error_message: null,
  });

  const result = await extractIndexedFiles(db, {
    structuredShadow: {
      adapter: { id: 'fixture-adapter', version: '1.0.0' },
      invoke: async () => {
        throw new Error('shadow adapter unavailable');
      },
      timeout_ms: 100,
    },
    logger: { error: () => {} },
  });

  const stored = getIndexedFileById(db, 'shadow-file-1');
  assert.equal(result.extracted, 1);
  assert.equal(result.structured_shadow_checked, 1);
  assert.equal(result.structured_shadow_failed, 1);
  assert.equal(stored.extraction_status, 'extracted');
  assert.equal(stored.extracted_text, 'Legacy text remains authoritative.');
  assert.equal(stored.extractor_name, 'plain-text');

  db.close();
});

test('extraction runner does not invoke structured shadow unless explicitly configured', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'everythingai-shadow-off-'));
  const db = openDatabase(path.join(root, 'test.sqlite'));
  const filePath = path.join(root, 'example.txt');
  await fsp.writeFile(filePath, 'No shadow invocation.');
  const stat = await fsp.stat(filePath);

  upsertIndexedFile(db, {
    id: 'shadow-off-1',
    filename: 'example.txt',
    absolute_path: filePath,
    relative_path: 'example.txt',
    extension: '.txt',
    mime_type: 'text/plain',
    size_bytes: stat.size,
    created_at: stat.birthtime.toISOString(),
    modified_at: stat.mtime.toISOString(),
    content_hash: 'sha256:shadow-off',
    index_status: 'indexed',
    last_indexed_at: new Date().toISOString(),
    error_message: null,
  });

  const result = await extractIndexedFiles(db, { logger: { error: () => {} } });
  assert.equal(result.structured_shadow_checked, 0);
  assert.deepEqual(result.structuredShadowItems, []);

  db.close();
});
