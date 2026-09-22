import fs from 'node:fs';
import path from 'node:path';

import {
  runStructuredExtractorLocalBenchmarkCase,
} from '../services/api/src/extractors/structuredExtractorLocalBenchmarkRuntime.js';
import {
  runStructuredExtractorBenchmark,
} from '../services/api/src/extractors/structuredExtractorBenchmark.js';
import {
  normalizeStructuredExtractorCandidateBundle,
} from '../services/api/src/extractors/structuredExtractorCandidateDiagnostics.js';

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const candidateKey = argument('--candidate');
if (!['docling', 'tesseract'].includes(candidateKey)) {
  throw new Error('PHASE12_CANDIDATE_REQUIRED: use --candidate docling|tesseract');
}

const repositoryRoot = path.resolve('.');
const runtimeLockPath = 'services/api/config/structured-extractor-runtime-lock.json';
const runtimeLock = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, runtimeLockPath), 'utf8'),
);

const corpusRoot = path.resolve(
  argument(
    '--corpus-root',
    'services/api/test/fixtures/structured-benchmark-real',
  ),
);
const sourcePath = path.join(corpusRoot, 'ocr-scan.pbm');

const caseResult = await runStructuredExtractorLocalBenchmarkCase({
  runtime_lock: runtimeLock,
  runtime_lock_path: runtimeLockPath,
  candidate_key: candidateKey,
  case_id: 'ocr-scan',
  corpus_root: corpusRoot,
  source_path: sourcePath,
  mime_type: 'image/x-portable-bitmap',
  repository_root: repositoryRoot,
  explicit_benchmark_invocation: true,
  repeat_count: 2,
  timeout_ms: Number(argument('--timeout-ms', '120000')),
});

const candidate = runtimeLock.candidates[candidateKey];

const manifest = {
  schema_version: '1.0',
  benchmark_id: runtimeLock.benchmark_id,
  authority: {
    provider_neutral: true,
    model_execution_required: false,
    adapter_transport_invoked: false,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  },
  cases: [{
    case_id: 'ocr-scan',
    fixture: 'ocr-scan.pbm',
    document_class: 'scanned_text_image',
    expected: {
      extraction_mode: 'ocr',
      min_pages: 1,
      min_blocks: 1,
      min_tables: 0,
      ocr_used: true,
      min_plain_text_characters: 1,
    },
  }],
  deferred_case_ids: [
    'native-text-pdf',
    'structured-table-pdf',
    'hybrid-native-scan',
    'multicolumn',
    'table-complex',
    'chart-caption',
    'rotated-scan',
    'low-quality-scan',
  ],
};

const benchmark = runStructuredExtractorBenchmark({
  manifest,
  candidate_id: candidate.candidate_id,
  outputs: {
    'ocr-scan': caseResult.extraction,
  },
  telemetry: {
    'ocr-scan': caseResult.telemetry,
  },
});

const candidateBundle = normalizeStructuredExtractorCandidateBundle({
  candidate_id: candidate.candidate_id,
  display_name: candidate.display_name,
  runtime_executed: true,
  execution_evidence_kind: 'explicit_local_runtime_benchmark',
  software: candidate.software,
  models: candidate.models,
  packaging: {
    local_execution_supported: true,
    offline_supported: true,
    redistribution_status: 'allowed',
    commercial_use_status: 'allowed',
    offline_model_download_behavior:
      'models must be pre-fetched and exact revision-marked before offline benchmark execution',
    supported_platforms: ['linux'],
    dependency_notes:
      'Phase 12.4 benchmark-only. No production route, persistence, indexing, or filesystem mutation authority.',
  },
  benchmark,
});

process.stdout.write(
  JSON.stringify({
    candidate_bundle: candidateBundle,
    determinism: caseResult.determinism,
    authority: caseResult.authority,
  }, null, 2) + '\n',
);
