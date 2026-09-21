import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  createStructuredExtractionShadowPreview,
  projectStructuredExtractionToLegacy,
  structuredExtractionBridge,
} from '../src/extractors/structuredExtractionBridge.js';
import { runStructuredPreviewShadow } from '../src/extractors/extractionRunner.js';

function fixture() {
  return JSON.parse(fs.readFileSync(
    path.resolve('test/fixtures/structured-document/native-text.json'),
    'utf8',
  ));
}

function file() {
  return {
    id: 'file-native-1',
    filename: 'native.pdf',
    absolute_path: '/fixtures/native.pdf',
    extension: '.pdf',
  };
}

function legacy(overrides = {}) {
  return {
    file_id: 'file-native-1',
    extracted_text: 'Native document text.',
    extraction_status: 'extracted',
    extractor_name: 'pdf-parse',
    extracted_at: '2026-09-20T14:00:00.000Z',
    error_message: null,
    metadata_json: '{}',
    ...overrides,
  };
}

test('projects normalized structured extraction into legacy-compatible shape without authority', () => {
  const projection = projectStructuredExtractionToLegacy(fixture());

  assert.equal(projection.file_id, 'file-native-1');
  assert.equal(projection.extracted_text, 'Native document text.');
  assert.equal(projection.extraction_status, 'extracted');
  assert.equal(projection.extractor_name, 'structured:fixture-native@1.0.0');
  assert.equal(projection.filesystem_mutation_allowed, false);
  assert.equal(projection.execution_allowed, false);
  assert.equal(projection.automatic_approval_allowed, false);

  const metadata = JSON.parse(projection.metadata_json);
  assert.equal(metadata.structured_shadow_projection, true);
  assert.equal(metadata.block_count, 1);
});

test('creates deterministic hash/count shadow comparison without persisting duplicate text', () => {
  const result = createStructuredExtractionShadowPreview({
    file: file(),
    legacy_extraction: legacy(),
    structured_extraction: fixture(),
    expected_source_fingerprint: {
      hash: 'sha256:native-001',
      size_bytes: 1024,
      mtime_ms: 1000,
    },
  });

  assert.equal(result.status, 'compared');
  assert.equal(result.mode, 'shadow_preview');
  assert.equal(result.same_text, true);
  assert.equal(result.character_count_delta, 0);
  assert.equal(result.persisted, false);
  assert.equal(result.authoritative, false);
  assert.equal(result.provider_fallback_allowed, false);
  assert.equal(result.filesystem_mutation_allowed, false);
  assert.equal(result.execution_allowed, false);
  assert.equal(result.automatic_approval_allowed, false);
  assert.equal(Object.hasOwn(result, 'extracted_text'), false);
  assert.match(result.legacy_text_sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.legacy_text_sha256, result.structured_text_sha256);
  assert.deepEqual(result.evidence_counts, {
    pages: 1,
    blocks: 1,
    tables: 0,
    figures: 0,
    warnings: 0,
  });
});

test('fails closed on file identity, source path, and optional fingerprint mismatch', () => {
  const wrongFile = fixture();
  wrongFile.file_id = 'other-file';
  assert.throws(
    () => createStructuredExtractionShadowPreview({
      file: file(),
      legacy_extraction: legacy(),
      structured_extraction: wrongFile,
    }),
    /STRUCTURED_SHADOW_FILE_MISMATCH/,
  );

  const wrongPath = fixture();
  wrongPath.source_path = '/fixtures/other.pdf';
  assert.throws(
    () => createStructuredExtractionShadowPreview({
      file: file(),
      legacy_extraction: legacy(),
      structured_extraction: wrongPath,
    }),
    /STRUCTURED_SHADOW_FILE_MISMATCH/,
  );

  assert.throws(
    () => createStructuredExtractionShadowPreview({
      file: file(),
      legacy_extraction: legacy(),
      structured_extraction: fixture(),
      expected_source_fingerprint: {
        hash: 'sha256:other',
        size_bytes: 1024,
        mtime_ms: 1000,
      },
    }),
    /STRUCTURED_SHADOW_FINGERPRINT_MISMATCH/,
  );
});

test('runner shadow helper isolates preview failure from authoritative legacy extraction', async () => {
  const result = await runStructuredPreviewShadow({
    file: file(),
    legacyResult: legacy(),
    structuredPreview: async () => {
      throw new Error('preview failed');
    },
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.mode, 'shadow_preview');
  assert.equal(result.persisted, false);
  assert.equal(result.authoritative, false);
  assert.equal(result.error_code, 'STRUCTURED_SHADOW_PREVIEW_FAILED');
  assert.match(result.message, /preview failed/);
});

test('runner shadow helper invokes injected preview once and returns comparison only', async () => {
  let calls = 0;
  const result = await runStructuredPreviewShadow({
    file: file(),
    legacyResult: legacy(),
    structuredPreview: async ({ file: receivedFile, legacy_extraction: receivedLegacy }) => {
      calls += 1;
      assert.equal(receivedFile.id, 'file-native-1');
      assert.equal(receivedLegacy.extractor_name, 'pdf-parse');
      return fixture();
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.status, 'compared');
  assert.equal(result.persisted, false);
});

test('runner shadow helper does not run for absent hook or non-extracted legacy result', async () => {
  assert.deepEqual(
    await runStructuredPreviewShadow({ file: file(), legacyResult: legacy() }),
    { status: 'not_run', mode: 'shadow_preview' },
  );

  let calls = 0;
  const skipped = await runStructuredPreviewShadow({
    file: file(),
    legacyResult: legacy({ extraction_status: 'unsupported' }),
    structuredPreview: async () => {
      calls += 1;
      return fixture();
    },
  });
  assert.deepEqual(skipped, { status: 'not_run', mode: 'shadow_preview' });
  assert.equal(calls, 0);
});

test('bridge contract explicitly keeps legacy persistence authoritative and disables execution authority', () => {
  assert.equal(structuredExtractionBridge.legacy_persistence_authoritative, true);
  assert.equal(structuredExtractionBridge.structured_persistence_enabled, false);
  assert.equal(structuredExtractionBridge.provider_fallback_allowed, false);
  assert.equal(structuredExtractionBridge.filesystem_mutation_allowed, false);
  assert.equal(structuredExtractionBridge.execution_allowed, false);
  assert.equal(structuredExtractionBridge.automatic_approval_allowed, false);
});
