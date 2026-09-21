import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  qualifyStructuredDocumentFixtures,
  structuredDocumentFixtureQualification,
} from '../src/extractors/structuredDocumentFixtureQualification.js';

function fixture(name) {
  return JSON.parse(fs.readFileSync(
    path.resolve('test/fixtures/structured-document', name),
    'utf8',
  ));
}

test('qualifies accepted static fixtures deterministically with operator metrics', () => {
  const entries = [
    { name: 'native-text.json', document: fixture('native-text.json') },
    { name: 'ocr-labeled.json', document: fixture('ocr-labeled.json') },
    { name: 'structured-table.json', document: fixture('structured-table.json') },
  ];

  const first = qualifyStructuredDocumentFixtures(entries);
  const second = qualifyStructuredDocumentFixtures(entries);

  assert.equal(first.status, 'pass');
  assert.equal(first.qualification_digest, second.qualification_digest);
  assert.match(first.qualification_digest, /^structured_qualification_[a-f0-9]{24}$/);
  assert.equal(first.aggregate.fixture_count, 3);
  assert.equal(first.aggregate.passed_count, 3);
  assert.equal(first.aggregate.failed_count, 0);
  assert.deepEqual(first.aggregate.extraction_modes, ['native_text', 'ocr', 'structured_native']);
  assert.equal(first.results[0].status, 'pass');
  assert.equal(first.results[0].extractor_local, true);
  assert.equal(first.provider_neutral, true);
  assert.equal(first.model_execution_required, false);
  assert.equal(first.adapter_transport_invoked, false);
  assert.equal(first.filesystem_mutation_allowed, false);
  assert.equal(first.execution_allowed, false);
  assert.equal(first.automatic_approval_allowed, false);
});

test('reports malformed fixtures as bounded diagnostics without throwing the batch away', () => {
  const invalid = fixture('native-text.json');
  invalid.execution_allowed = true;

  const result = qualifyStructuredDocumentFixtures([
    { name: 'valid', document: fixture('native-text.json') },
    { name: 'invalid', document: invalid },
  ]);

  assert.equal(result.status, 'fail');
  assert.equal(result.aggregate.fixture_count, 2);
  assert.equal(result.aggregate.passed_count, 1);
  assert.equal(result.aggregate.failed_count, 1);
  assert.equal(result.results[1].status, 'fail');
  assert.match(result.results[1].error_code, /STRUCTURED_EXTRACTION_AUTHORITY_FORBIDDEN/);
});

test('qualification digest changes when fixture evidence changes', () => {
  const firstFixture = fixture('native-text.json');
  const changedFixture = fixture('native-text.json');
  changedFixture.plain_text = 'Changed compatibility text.';
  changedFixture.blocks[0].text = 'Changed compatibility text.';

  const first = qualifyStructuredDocumentFixtures([{ name: 'native', document: firstFixture }]);
  const changed = qualifyStructuredDocumentFixtures([{ name: 'native', document: changedFixture }]);

  assert.notEqual(first.qualification_digest, changed.qualification_digest);
});

test('qualification contract is static, model-free, provider-neutral, and non-mutating', () => {
  assert.equal(structuredDocumentFixtureQualification.mode, 'static_fixture_qualification');
  assert.equal(structuredDocumentFixtureQualification.provider_neutral, true);
  assert.equal(structuredDocumentFixtureQualification.model_execution_required, false);
  assert.equal(structuredDocumentFixtureQualification.adapter_transport_invoked, false);
  assert.equal(structuredDocumentFixtureQualification.reads_static_fixtures_only, true);
  assert.equal(structuredDocumentFixtureQualification.filesystem_mutation_allowed, false);
  assert.equal(structuredDocumentFixtureQualification.execution_allowed, false);
  assert.equal(structuredDocumentFixtureQualification.automatic_approval_allowed, false);
});

test('requires at least one fixture and rejects malformed wrapper entries', () => {
  assert.throws(() => qualifyStructuredDocumentFixtures([]), /STRUCTURED_FIXTURES_REQUIRED/);
  assert.throws(() => qualifyStructuredDocumentFixtures([null]), /INVALID_STRUCTURED_FIXTURE_ENTRY:0/);
});
