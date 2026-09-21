import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { runStructuredExtractorBenchmark } from '../services/api/src/extractors/structuredExtractorBenchmark.js';

const fixtureRoot = path.resolve(process.cwd(), 'services/api/test/fixtures/structured-document');
const manifestPath = path.resolve(process.cwd(), 'services/api/test/fixtures/structured-benchmark/manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const outputs = Object.fromEntries(
  manifest.cases.map((entry) => [
    entry.case_id,
    JSON.parse(fs.readFileSync(path.join(fixtureRoot, entry.fixture), 'utf8')),
  ]),
);

const result = runStructuredExtractorBenchmark({
  manifest,
  candidate_id: 'phase11-static-fixture-baseline',
  outputs,
});

console.log('EverythingAI Structured Extractor Benchmark Foundation');
console.log(`Status: ${result.status.toUpperCase()}`);
console.log(`Benchmark: ${result.benchmark_id}`);
console.log(`Digest: ${result.benchmark_digest}`);
console.log(`Cases: ${result.aggregate.passed_case_count}/${result.aggregate.case_count} fully passed`);
console.log(`Criteria: ${result.aggregate.passed_criteria}/${result.aggregate.total_criteria} passed (${result.aggregate.score_percent}%)`);
console.log('Authority: static result comparison only; no extractor/model execution, adapter transport, filesystem mutation, execution, automatic approval, or automatic winner selection.');

for (const entry of result.results) {
  console.log(`${entry.status.toUpperCase()} ${entry.case_id}: score=${entry.score_percent}% digest=${entry.result_digest}`);
}

if (result.status !== 'pass') process.exitCode = 1;
