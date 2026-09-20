import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  createStructuredEvidenceId,
  normalizeStructuredDocumentExtraction,
} from '../src/extractors/structuredDocumentContract.js';

function fixture(name) {
  return JSON.parse(fs.readFileSync(
    path.resolve('test/fixtures/structured-document', name),
    'utf8',
  ));
}

test('normalizes native-text fixture into immutable read-only provider-neutral contract', () => {
  const normalized = normalizeStructuredDocumentExtraction(fixture('native-text.json'));

  assert.equal(normalized.schema_version, '1.0');
  assert.equal(normalized.extraction_mode, 'native_text');
  assert.equal(normalized.extractor.local, true);
  assert.equal(normalized.filesystem_mutation_allowed, false);
  assert.equal(normalized.execution_allowed, false);
  assert.equal(normalized.automatic_approval_allowed, false);
  assert.equal(normalized.blocks[0].evidence_mode, 'native');
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized.blocks), true);
});

test('accepts OCR-labeled fixture without executing or selecting an OCR provider', () => {
  const normalized = normalizeStructuredDocumentExtraction(fixture('ocr-labeled.json'));

  assert.equal(normalized.extraction_mode, 'ocr');
  assert.equal(normalized.pages[0].ocr_used, true);
  assert.equal(normalized.blocks[0].evidence_mode, 'ocr');
  assert.equal(normalized.blocks[0].confidence.value, 0.82);
  assert.equal(normalized.extractor.provider, null);
  assert.equal(normalized.extractor.model, null);
});

test('validates structured table cell identities and page linkage', () => {
  const normalized = normalizeStructuredDocumentExtraction(fixture('structured-table.json'));

  assert.equal(normalized.tables.length, 1);
  assert.equal(normalized.tables[0].cells.length, 4);
  assert.equal(normalized.tables[0].page_id, 'page-1');
  assert.deepEqual(normalized.tables[0].cells.map((cell) => cell.cell_id), ['cell-1', 'cell-2', 'cell-3', 'cell-4']);
});

test('creates deterministic evidence IDs bound to source fingerprint', () => {
  const input = {
    file_id: 'file-1',
    source_fingerprint_hash: 'sha256:abc',
    evidence_kind: 'block',
    page_number: 1,
    stable_position_key: 'reading-order:2',
    normalized_content_prefix: 'hello world',
  };

  const first = createStructuredEvidenceId(input);
  const second = createStructuredEvidenceId(input);
  const changed = createStructuredEvidenceId({ ...input, source_fingerprint_hash: 'sha256:def' });

  assert.equal(first, second);
  assert.notEqual(first, changed);
  assert.match(first, /^evidence_[a-f0-9]{24}$/);
});

test('rejects unsafe authority flags', () => {
  const input = fixture('native-text.json');
  input.execution_allowed = true;
  assert.throws(() => normalizeStructuredDocumentExtraction(input), /STRUCTURED_EXTRACTION_AUTHORITY_FORBIDDEN/);
});

test('rejects geometry outside normalized 0..1 coordinate space', () => {
  const input = fixture('native-text.json');
  input.blocks[0].bbox.x = 1.1;
  assert.throws(() => normalizeStructuredDocumentExtraction(input), /INVALID_NORMALIZED_BBOX/);
});

test('rejects duplicate identities and broken cross references', () => {
  const duplicate = fixture('structured-table.json');
  duplicate.tables[0].cells[1].cell_id = 'cell-1';
  assert.throws(() => normalizeStructuredDocumentExtraction(duplicate), /DUPLICATE_STRUCTURED_ID:cell-1/);

  const broken = fixture('native-text.json');
  broken.blocks[0].page_id = 'missing-page';
  assert.throws(() => normalizeStructuredDocumentExtraction(broken), /UNKNOWN_PAGE_REFERENCE:missing-page/);
});

test('rejects fabricated or malformed confidence values', () => {
  const input = fixture('ocr-labeled.json');
  input.blocks[0].confidence = { value: 1.5, scale: '0_1', source: 'fixture' };
  assert.throws(() => normalizeStructuredDocumentExtraction(input), /INVALID_CONFIDENCE/);
});

test('rejects secret-bearing extractor provenance and source values', () => {
  const keyed = fixture('native-text.json');
  keyed.extractor.api_key = 'secret';
  assert.throws(() => normalizeStructuredDocumentExtraction(keyed), /SENSITIVE_FIELD_FORBIDDEN/);

  const url = fixture('native-text.json');
  url.source_path = 'https://example.test/file?token=secret';
  assert.throws(() => normalizeStructuredDocumentExtraction(url), /SECRET_BEARING_VALUE_FORBIDDEN/);
});

test('rejects unsupported semantic extraction and evidence modes', () => {
  const input = fixture('native-text.json');
  input.extraction_mode = 'vendor_magic';
  assert.throws(() => normalizeStructuredDocumentExtraction(input), /INVALID_EXTRACTION_MODE/);

  const evidence = fixture('native-text.json');
  evidence.blocks[0].evidence_mode = 'guess';
  assert.throws(() => normalizeStructuredDocumentExtraction(evidence), /INVALID_EVIDENCE_MODE/);
});
