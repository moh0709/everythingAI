import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  normalizeStructuredExtractorBenchmarkManifest,
  runStructuredExtractorBenchmark,
  structuredExtractorBenchmark,
} from '../src/extractors/structuredExtractorBenchmark.js';

const fixtureRoot = path.resolve('test/fixtures/structured-document');
const benchmarkManifestPath = path.resolve('test/fixtures/structured-benchmark/manifest.json');

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, name), 'utf8'));
}

function manifest() {
  return JSON.parse(fs.readFileSync(benchmarkManifestPath, 'utf8'));
}

function outputs() {
  return {
    'native-text': fixture('native-text.json'),
    'ocr-labeled-scan': fixture('ocr-labeled.json'),
    'structured-table': fixture('structured-table.json'),
  };
}

test('static Phase 11 fixtures achieve deterministic complete benchmark coverage', () => {
  const first = runStructuredExtractorBenchmark({
    manifest: manifest(),
    candidate_id: 'phase11-static-fixture-baseline',
    outputs: outputs(),
  });
  const second = runStructuredExtractorBenchmark({
    manifest: manifest(),
    candidate_id: 'phase11-static-fixture-baseline',
    outputs: outputs(),
  });

  assert.equal(first.status, 'pass');
  assert.equal(first.aggregate.case_count, 3);
  assert.equal(first.aggregate.passed_case_count, 3);
  assert.equal(first.aggregate.partial_case_count, 0);
  assert.equal(first.aggregate.failed_case_count, 0);
  assert.equal(first.aggregate.missing_case_count, 0);
  assert.equal(first.aggregate.score_percent, 100);
  assert.equal(first.benchmark_digest, second.benchmark_digest);
  assert.match(first.benchmark_digest, /^structured_benchmark_[a-f0-9]{24}$/);
  assert.equal(first.automatic_winner_selection_allowed, false);
  assert.equal(first.model_execution_required, false);
  assert.equal(first.adapter_transport_invoked, false);
  assert.equal(first.filesystem_mutation_allowed, false);
  assert.equal(first.execution_allowed, false);
  assert.equal(first.automatic_approval_allowed, false);
});

test('benchmark reports criterion-level partial evidence without selecting a winner', () => {
  const changed = outputs();
  changed['ocr-labeled-scan'].pages[0].ocr_used = false;

  const result = runStructuredExtractorBenchmark({
    manifest: manifest(),
    candidate_id: 'candidate-with-ocr-label-gap',
    outputs: changed,
  });

  const ocrCase = result.results.find((entry) => entry.case_id === 'ocr-labeled-scan');
  assert.equal(result.status, 'incomplete');
  assert.equal(ocrCase.status, 'partial');
  assert.ok(ocrCase.score_percent > 0 && ocrCase.score_percent < 100);
  assert.equal(
    ocrCase.criteria.find((entry) => entry.name === 'ocr_labeling').passed,
    false,
  );
  assert.equal(result.automatic_winner_selection_allowed, false);
});

test('benchmark fails a malformed or unsafe structured output without aborting other cases', () => {
  const changed = outputs();
  changed['structured-table'].execution_allowed = true;

  const result = runStructuredExtractorBenchmark({
    manifest: manifest(),
    candidate_id: 'unsafe-candidate-output',
    outputs: changed,
  });

  const tableCase = result.results.find((entry) => entry.case_id === 'structured-table');
  assert.equal(result.status, 'incomplete');
  assert.equal(tableCase.status, 'fail');
  assert.match(tableCase.error_code, /STRUCTURED_EXTRACTION_AUTHORITY_FORBIDDEN/);
  assert.equal(result.results.find((entry) => entry.case_id === 'native-text').status, 'pass');
});

test('benchmark digest changes when normalized candidate evidence changes', () => {
  const firstOutputs = outputs();
  const changedOutputs = outputs();
  changedOutputs['native-text'].plain_text = 'Changed benchmark text.';
  changedOutputs['native-text'].blocks[0].text = 'Changed benchmark text.';

  const first = runStructuredExtractorBenchmark({
    manifest: manifest(),
    candidate_id: 'candidate-a',
    outputs: firstOutputs,
  });
  const changed = runStructuredExtractorBenchmark({
    manifest: manifest(),
    candidate_id: 'candidate-a',
    outputs: changedOutputs,
  });

  assert.notEqual(first.benchmark_digest, changed.benchmark_digest);
});

test('benchmark accepts optional non-negative telemetry without treating it as synthetic accuracy', () => {
  const result = runStructuredExtractorBenchmark({
    manifest: manifest(),
    candidate_id: 'telemetry-example',
    outputs: outputs(),
    telemetry: {
      'native-text': {
        runtime_ms: 12.5,
        peak_rss_mb: 48,
        cold_start_ms: 5,
      },
    },
  });

  assert.deepEqual(result.telemetry['native-text'], {
    runtime_ms: 12.5,
    peak_rss_mb: 48,
    cold_start_ms: 5,
  });
  assert.equal(result.aggregate.score_percent, 100);

  assert.throws(
    () => runStructuredExtractorBenchmark({
      manifest: manifest(),
      candidate_id: 'bad-telemetry',
      outputs: outputs(),
      telemetry: { 'native-text': { runtime_ms: -1 } },
    }),
    /INVALID_BENCHMARK_TELEMETRY:native-text:runtime_ms/,
  );
});

test('manifest rejects unsafe authority and duplicate benchmark case IDs', () => {
  const unsafe = manifest();
  unsafe.authority.model_execution_required = true;
  assert.throws(
    () => normalizeStructuredExtractorBenchmarkManifest(unsafe),
    /STRUCTURED_BENCHMARK_AUTHORITY_FORBIDDEN/,
  );

  const duplicate = manifest();
  duplicate.cases.push({ ...duplicate.cases[0] });
  assert.throws(
    () => normalizeStructuredExtractorBenchmarkManifest(duplicate),
    /DUPLICATE_BENCHMARK_CASE_ID:native-text/,
  );
});

test('benchmark contract remains comparison-only and model/provider free', () => {
  assert.equal(structuredExtractorBenchmark.mode, 'static_result_benchmark');
  assert.equal(structuredExtractorBenchmark.comparison_only, true);
  assert.equal(structuredExtractorBenchmark.automatic_winner_selection_allowed, false);
  assert.equal(structuredExtractorBenchmark.provider_neutral, true);
  assert.equal(structuredExtractorBenchmark.model_execution_required, false);
  assert.equal(structuredExtractorBenchmark.adapter_transport_invoked, false);
  assert.equal(structuredExtractorBenchmark.filesystem_mutation_allowed, false);
  assert.equal(structuredExtractorBenchmark.execution_allowed, false);
  assert.equal(structuredExtractorBenchmark.automatic_approval_allowed, false);
});
