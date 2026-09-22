import fs from 'node:fs';

const failures = [];

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`missing Phase 12.4 artifact: ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function requireText(file, text) {
  const content = read(file);
  if (content && !content.includes(text)) {
    failures.push(`${file} missing required text: ${text}`);
  }
}

function forbidText(file, text) {
  const content = read(file);
  if (content.includes(text)) {
    failures.push(`${file} contains forbidden text: ${text}`);
  }
}

const runtimeFile =
  'services/api/src/extractors/structuredExtractorLocalBenchmarkRuntime.js';
const lockFile =
  'services/api/config/structured-extractor-runtime-lock.json';
const adapterFile =
  'tools/structured-extractors/local_adapter.py';
const runnerFile =
  'scripts/run-phase12-local-extractor-benchmark.mjs';
const testFile =
  'services/api/test/structuredExtractorLocalBenchmarkRuntime.test.js';
const corpusFile =
  'services/api/test/fixtures/structured-benchmark-real/ocr-scan.pbm';
const planFile =
  'docs/PHASE12_LOCAL_EXTRACTOR_BENCHMARK_PLAN_2026-09-22.md';
const diagnosticsFile =
  'services/api/src/extractors/structuredExtractorCandidateDiagnostics.js';

[
  runtimeFile,
  lockFile,
  adapterFile,
  runnerFile,
  testFile,
  corpusFile,
  planFile,
  diagnosticsFile,
].forEach(read);

requireText(runtimeFile, "mode: 'explicit_local_benchmark_only'");
requireText(runtimeFile, "if (explicit_benchmark_invocation !== true)");
requireText(runtimeFile, "throw new Error('LOCAL_EXTRACTOR_EXPLICIT_INVOCATION_REQUIRED')");
requireText(runtimeFile, "throw new Error('LOCAL_EXTRACTOR_SOURCE_OUTSIDE_CORPUS')");
requireText(runtimeFile, "shell: false");
requireText(runtimeFile, "delete env.HTTP_PROXY");
requireText(runtimeFile, "delete env.HTTPS_PROXY");
requireText(runtimeFile, "LOCAL_EXTRACTOR_NONDETERMINISTIC_OUTPUT");
requireText(runtimeFile, "validateStructuredAdapterResponse");
requireText(runtimeFile, "automatic_indexing_allowed: false");
requireText(runtimeFile, "persistence_allowed: false");
requireText(runtimeFile, "production_route_allowed: false");
requireText(runtimeFile, "filesystem_mutation_allowed: false");
requireText(runtimeFile, "automatic_winner_selection_allowed: false");

forbidText(runtimeFile, 'exec(');
forbidText(runtimeFile, 'execSync(');
forbidText(runtimeFile, 'fetch(');
forbidText(runtimeFile, 'axios');
forbidText(runtimeFile, 'http.request');
forbidText(runtimeFile, 'https.request');

requireText(adapterFile, 'verify_source_fingerprint');
requireText(adapterFile, 'sha256_file(source)');
requireText(adapterFile, 'SOFTWARE_VERSION_MISMATCH');
requireText(adapterFile, 'MODEL_LOCK_MARKER_MISSING');
requireText(adapterFile, 'enable_remote_services=False');
requireText(adapterFile, 'allow_external_plugins=False');
requireText(adapterFile, 'do_table_structure=False');
requireText(adapterFile, 'TesseractCliOcrOptions');
requireText(adapterFile, 'AcceleratorDevice.CPU');
requireText(adapterFile, 'shell=False');
requireText(adapterFile, 'DocumentStream');
requireText(adapterFile, 'image.convert("RGB").save(buffer, format="PNG")');

for (const forbidden of [
  'import requests',
  'from requests',
  'import httpx',
  'from httpx',
  'urllib.request',
  'socket.create_connection',
]) {
  forbidText(adapterFile, forbidden);
}

requireText(runnerFile, "candidateKey = argument('--candidate')");
requireText(runnerFile, "['docling', 'tesseract']");
requireText(runnerFile, "case_id: 'ocr-scan'");
requireText(runnerFile, "sourcePath = path.join(corpusRoot, 'ocr-scan.pbm')");
requireText(runnerFile, 'explicit_benchmark_invocation: true');
requireText(runnerFile, 'repeat_count: 2');
requireText(runnerFile, "runtime_executed: true");
requireText(runnerFile, "execution_evidence_kind: 'explicit_local_runtime_benchmark'");

requireText(diagnosticsFile, 'version: value.version == null');
requireText(diagnosticsFile, 'revision: value.revision == null');
requireText(
  'services/api/test/structuredExtractorCandidateDiagnostics.test.js',
  "assert.equal(normalized.software.version, '0.0.0-fixture')",
);

const lock = JSON.parse(read(lockFile) || '{}');
const authority = lock.authority ?? {};
const requiredAuthority = {
  benchmark_only: true,
  local_only: true,
  remote_processing_allowed: false,
  automatic_indexing_allowed: false,
  persistence_allowed: false,
  production_route_allowed: false,
  filesystem_mutation_allowed: false,
  automatic_winner_selection_allowed: false,
};
for (const [key, expected] of Object.entries(requiredAuthority)) {
  if (authority[key] !== expected) {
    failures.push(`${lockFile} authority mismatch: ${key}`);
  }
}

const candidateKeys = Object.keys(lock.candidates ?? {}).sort();
if (JSON.stringify(candidateKeys) !== JSON.stringify(['docling', 'tesseract'])) {
  failures.push(`${lockFile} must contain exactly docling and tesseract candidates`);
}

const docling = lock.candidates?.docling;
const tesseract = lock.candidates?.tesseract;
if (docling?.software?.version !== '2.129.0') {
  failures.push('Docling runtime must remain pinned to 2.129.0 for Phase 12.4');
}
if (docling?.software?.license !== 'MIT') {
  failures.push('Docling software license metadata must remain MIT');
}
if (
  docling?.models?.find((entry) => entry.name === 'docling-layout-heron')
    ?.revision !== '8f39ad3'
) {
  failures.push('Heron model revision must remain pinned to 8f39ad3');
}
if (
  docling?.models?.find((entry) => entry.name === 'docling-layout-heron')
    ?.license !== 'Apache-2.0'
) {
  failures.push('Heron model license metadata must remain Apache-2.0');
}
if (tesseract?.software?.version !== '5.5.3') {
  failures.push('Tesseract runtime must remain pinned to 5.5.3');
}
if (tesseract?.software?.license !== 'Apache-2.0') {
  failures.push('Tesseract software license metadata must remain Apache-2.0');
}

const tessRevision = 'e12c65a915945e4c28e237a9b52bc4a8f39a0cec';
for (const [candidateName, candidate] of Object.entries({
  docling,
  tesseract,
})) {
  if (
    candidate?.models?.find((entry) => entry.name === 'tessdata_best-eng')
      ?.revision !== tessRevision
  ) {
    failures.push(`${candidateName} tessdata revision is not pinned to Phase 12.4 baseline`);
  }
  if (
    JSON.stringify(candidate?.allowed_case_ids ?? []) !==
    JSON.stringify(['ocr-scan'])
  ) {
    failures.push(`${candidateName} is authorized for an unexpected benchmark case`);
  }
}

for (const candidate of [docling, tesseract]) {
  for (const model of candidate?.models ?? []) {
    if (!model.revision || !model.license || model.review_status !== 'documented') {
      failures.push(
        `model metadata incomplete: ${candidate?.candidate_id ?? 'unknown'}:${model.name ?? 'unknown'}`,
      );
    }
  }
}

if (docling?.runtime?.forced_environment?.HF_HUB_OFFLINE !== '1') {
  failures.push('Docling must force HF_HUB_OFFLINE=1');
}
if (docling?.runtime?.forced_environment?.TRANSFORMERS_OFFLINE !== '1') {
  failures.push('Docling must force TRANSFORMERS_OFFLINE=1');
}
if (docling?.runtime?.forced_environment?.DOCLING_ENABLE_REMOTE_SERVICES !== '0') {
  failures.push('Docling must force DOCLING_ENABLE_REMOTE_SERVICES=0');
}

const corpus = read(corpusFile);
if (!corpus.startsWith('P1\n')) {
  failures.push(`${corpusFile} must remain a deterministic ASCII PBM fixture`);
}
if (!corpus.includes('EverythingAI Phase 12.4 fixed OCR benchmark')) {
  failures.push(`${corpusFile} missing fixed corpus identity comment`);
}

requireText(planFile, 'benchmark-only local process authority');
requireText(planFile, 'does not activate production extraction');
requireText(planFile, 'green PR therefore proves the benchmark runner is safely bounded');
requireText(planFile, 'does not claim that real candidate benchmark numbers have already been produced');
requireText(planFile, 'TableFormer and all other Docling model families are deferred');

for (const file of [
  'services/api/src/extractors/extractionRunner.js',
  'services/api/src/server.js',
  'services/api/src/index.js',
]) {
  forbidText(file, 'structuredExtractorLocalBenchmarkRuntime');
  forbidText(file, 'run-phase12-local-extractor-benchmark');
}

requireText('PROJECT_STATE.md', 'Phase 12 — Structured Extractor Candidate Qualification is ACTIVE through Phase 12.2');
requireText('PROJECT_STATE.md', 'PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_PASS');
requireText('AI_BOOTSTRAP.md', 'PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_PASS');

if (failures.length) {
  console.error('PHASE12_LOCAL_EXTRACTOR_BENCHMARK_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE12_LOCAL_EXTRACTOR_BENCHMARK_QUALIFICATION_VALID');
console.log('Candidates: Docling 2.129.0 + Tesseract 5.5.3 only.');
console.log('Corpus: one fixed synthetic OCR scan only.');
console.log('Authority: explicit local benchmark execution only; offline, no production route, no persistence, no indexing, no filesystem mutation, no automatic winner selection.');
console.log('CI qualification does not claim real candidate benchmark results have been executed.');
