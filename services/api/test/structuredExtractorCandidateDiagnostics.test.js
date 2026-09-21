import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { runStructuredExtractorBenchmark } from '../src/extractors/structuredExtractorBenchmark.js';
import {
  compareStructuredExtractorCandidates,
  normalizeStructuredExtractorCandidateBundle,
  structuredExtractorCandidateDiagnostics,
} from '../src/extractors/structuredExtractorCandidateDiagnostics.js';

const fixtureRoot = path.resolve('test/fixtures/structured-document');
const manifest = JSON.parse(fs.readFileSync(
  path.resolve('test/fixtures/structured-benchmark/manifest.json'),
  'utf8',
));

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, name), 'utf8'));
}

function outputs() {
  return {
    'native-text': fixture('native-text.json'),
    'ocr-labeled-scan': fixture('ocr-labeled.json'),
    'structured-table': fixture('structured-table.json'),
  };
}

function benchmark(candidateId) {
  return runStructuredExtractorBenchmark({
    manifest,
    candidate_id: candidateId,
    outputs: outputs(),
    telemetry: {
      'native-text': { runtime_ms: 10, peak_rss_mb: 50, cold_start_ms: 3 },
    },
  });
}

function candidate(candidateId, overrides = {}) {
  return {
    candidate_id: candidateId,
    display_name: candidateId,
    runtime_executed: false,
    execution_evidence_kind: 'static_fixture_placeholder',
    software: {
      name: 'Placeholder software metadata',
      license: 'NOT-A-RUNTIME-DEPENDENCY',
      review_status: 'documented',
      source: 'repository-fixture-only',
    },
    models: [],
    packaging: {
      local_execution_supported: true,
      offline_supported: true,
      redistribution_status: 'allowed',
      commercial_use_status: 'allowed',
      offline_model_download_behavior: 'no model download in static fixture diagnostics',
      supported_platforms: ['linux', 'windows'],
      dependency_notes: 'No runtime dependency activated.',
    },
    benchmark: benchmark(candidateId),
    ...overrides,
  };
}

test('imports a candidate benchmark bundle with explicit dependency/license metadata', () => {
  const normalized = normalizeStructuredExtractorCandidateBundle(candidate('candidate-a'));

  assert.equal(normalized.candidate_id, 'candidate-a');
  assert.equal(normalized.runtime_executed, false);
  assert.equal(normalized.execution_evidence_kind, 'static_fixture_placeholder');
  assert.equal(normalized.software.review_status, 'documented');
  assert.equal(normalized.packaging.offline_supported, true);
  assert.equal(normalized.benchmark.aggregate.score_percent, 100);
});

test('produces deterministic neutral side-by-side diagnostics without ranking', () => {
  const first = compareStructuredExtractorCandidates([
    candidate('candidate-b'),
    candidate('candidate-a'),
  ]);
  const second = compareStructuredExtractorCandidates([
    candidate('candidate-a'),
    candidate('candidate-b'),
  ]);

  assert.equal(first.status, 'diagnostic_only');
  assert.equal(first.candidate_count, 2);
  assert.equal(first.case_count, 3);
  assert.equal(first.comparison_digest, second.comparison_digest);
  assert.deepEqual(first.candidates.map((entry) => entry.candidate_id), ['candidate-a', 'candidate-b']);
  assert.equal(first.automatic_ranking_allowed, false);
  assert.equal(first.automatic_winner_selection_allowed, false);
  assert.equal(first.legal_conclusion_provided, false);
  assert.equal(first.filesystem_mutation_allowed, false);
  assert.equal(first.execution_allowed, false);
  assert.equal(first.automatic_approval_allowed, false);
});

test('surfaces licensing and packaging review flags without making a legal conclusion', () => {
  const flagged = candidate('candidate-review', {
    software: {
      name: 'Candidate software',
      license: 'example-license',
      review_status: 'review_required',
      source: 'published-license-reference',
    },
    models: [{
      name: 'example-model',
      license: 'example-model-license',
      review_status: 'unknown',
      source: 'model-card-reference',
    }],
    packaging: {
      local_execution_supported: true,
      offline_supported: false,
      redistribution_status: 'review_required',
      commercial_use_status: 'unknown',
      offline_model_download_behavior: 'requires review',
      supported_platforms: ['linux'],
      dependency_notes: 'Review required before runtime adoption.',
    },
  });

  const result = compareStructuredExtractorCandidates([flagged]);
  const flags = result.candidates[0].review_flags;

  assert.ok(flags.includes('software_license:review_required'));
  assert.ok(flags.includes('model_license:example-model:unknown'));
  assert.ok(flags.includes('redistribution:review_required'));
  assert.ok(flags.includes('commercial_use:unknown'));
  assert.ok(flags.includes('offline_support:false'));
  assert.equal(result.legal_conclusion_provided, false);
});

test('rejects unsafe or mismatched benchmark bundles', () => {
  const mismatch = candidate('candidate-a');
  mismatch.benchmark = benchmark('different-id');
  assert.throws(
    () => normalizeStructuredExtractorCandidateBundle(mismatch),
    /CANDIDATE_BENCHMARK_ID_MISMATCH/,
  );

  const unsafe = candidate('candidate-a');
  unsafe.benchmark = { ...unsafe.benchmark, execution_allowed: true };
  assert.throws(
    () => normalizeStructuredExtractorCandidateBundle(unsafe),
    /UNSAFE_CANDIDATE_BENCHMARK_AUTHORITY/,
  );
});

test('rejects duplicate candidate IDs and invalid license-status metadata', () => {
  assert.throws(
    () => compareStructuredExtractorCandidates([
      candidate('candidate-a'),
      candidate('candidate-a'),
    ]),
    /DUPLICATE_STRUCTURED_EXTRACTOR_CANDIDATE:candidate-a/,
  );

  const invalid = candidate('candidate-b');
  invalid.packaging.redistribution_status = 'approved-by-assistant';
  assert.throws(
    () => normalizeStructuredExtractorCandidateBundle(invalid),
    /CANDIDATE_REDISTRIBUTION_STATUS_INVALID/,
  );
});

test('candidate diagnostics contract remains provider-neutral and non-authoritative', () => {
  assert.equal(structuredExtractorCandidateDiagnostics.mode, 'benchmark_result_import');
  assert.equal(structuredExtractorCandidateDiagnostics.automatic_ranking_allowed, false);
  assert.equal(structuredExtractorCandidateDiagnostics.automatic_winner_selection_allowed, false);
  assert.equal(structuredExtractorCandidateDiagnostics.legal_conclusion_provided, false);
  assert.equal(structuredExtractorCandidateDiagnostics.provider_neutral, true);
  assert.equal(structuredExtractorCandidateDiagnostics.filesystem_mutation_allowed, false);
  assert.equal(structuredExtractorCandidateDiagnostics.execution_allowed, false);
  assert.equal(structuredExtractorCandidateDiagnostics.automatic_approval_allowed, false);
});
