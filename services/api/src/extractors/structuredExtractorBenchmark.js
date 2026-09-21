import crypto from 'node:crypto';

import { normalizeStructuredDocumentExtraction } from './structuredDocumentContract.js';
import { projectStructuredExtractionToLegacy } from './structuredExtractionShadowBridge.js';

function stableDigest(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 24);
}

function requireString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function requireNonNegativeInteger(value, code) {
  if (!Number.isInteger(value) || value < 0) throw new Error(code);
  return value;
}

function normalizeExpected(expected = {}, caseId) {
  return Object.freeze({
    extraction_mode: requireString(expected.extraction_mode, `BENCHMARK_EXTRACTION_MODE_REQUIRED:${caseId}`),
    min_pages: requireNonNegativeInteger(expected.min_pages, `BENCHMARK_MIN_PAGES_INVALID:${caseId}`),
    min_blocks: requireNonNegativeInteger(expected.min_blocks, `BENCHMARK_MIN_BLOCKS_INVALID:${caseId}`),
    min_tables: requireNonNegativeInteger(expected.min_tables, `BENCHMARK_MIN_TABLES_INVALID:${caseId}`),
    ocr_used: expected.ocr_used === true,
    min_plain_text_characters: requireNonNegativeInteger(
      expected.min_plain_text_characters,
      `BENCHMARK_MIN_TEXT_INVALID:${caseId}`,
    ),
  });
}

export function normalizeStructuredExtractorBenchmarkManifest(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('STRUCTURED_BENCHMARK_MANIFEST_REQUIRED');
  }

  const authority = input.authority;
  if (!authority || typeof authority !== 'object' || Array.isArray(authority)) {
    throw new Error('STRUCTURED_BENCHMARK_AUTHORITY_REQUIRED');
  }

  if (
    authority.provider_neutral !== true
    || authority.model_execution_required !== false
    || authority.adapter_transport_invoked !== false
    || authority.filesystem_mutation_allowed !== false
    || authority.execution_allowed !== false
    || authority.automatic_approval_allowed !== false
  ) {
    throw new Error('STRUCTURED_BENCHMARK_AUTHORITY_FORBIDDEN');
  }

  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    throw new Error('STRUCTURED_BENCHMARK_CASES_REQUIRED');
  }

  const ids = new Set();
  const cases = input.cases.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`INVALID_STRUCTURED_BENCHMARK_CASE:${index}`);
    }

    const caseId = requireString(entry.case_id, `BENCHMARK_CASE_ID_REQUIRED:${index}`);
    if (ids.has(caseId)) throw new Error(`DUPLICATE_BENCHMARK_CASE_ID:${caseId}`);
    ids.add(caseId);

    return Object.freeze({
      case_id: caseId,
      fixture: requireString(entry.fixture, `BENCHMARK_FIXTURE_REQUIRED:${caseId}`),
      document_class: requireString(entry.document_class, `BENCHMARK_DOCUMENT_CLASS_REQUIRED:${caseId}`),
      expected: normalizeExpected(entry.expected, caseId),
    });
  });

  const deferred = Array.isArray(input.deferred_case_ids)
    ? [...new Set(input.deferred_case_ids.map((value) => requireString(value, 'INVALID_DEFERRED_BENCHMARK_CASE')))].sort()
    : [];

  return Object.freeze({
    schema_version: requireString(input.schema_version, 'STRUCTURED_BENCHMARK_SCHEMA_VERSION_REQUIRED'),
    benchmark_id: requireString(input.benchmark_id, 'STRUCTURED_BENCHMARK_ID_REQUIRED'),
    authority: Object.freeze({
      provider_neutral: true,
      model_execution_required: false,
      adapter_transport_invoked: false,
      filesystem_mutation_allowed: false,
      execution_allowed: false,
      automatic_approval_allowed: false,
    }),
    cases: Object.freeze(cases),
    deferred_case_ids: Object.freeze(deferred),
  });
}

function collectEvidenceIds(extraction) {
  return [
    ...extraction.blocks.map((entry) => entry.evidence_id),
    ...extraction.tables.map((entry) => entry.evidence_id),
    ...extraction.figures.map((entry) => entry.evidence_id),
  ].filter(Boolean);
}

function criterion(name, passed, details) {
  return Object.freeze({ name, passed: passed === true, details });
}

function scoreCase(benchmarkCase, document) {
  try {
    const extraction = normalizeStructuredDocumentExtraction(document);
    const projection = projectStructuredExtractionToLegacy(extraction);
    const evidenceIds = collectEvidenceIds(extraction);
    const expected = benchmarkCase.expected;
    const ocrUsed = extraction.pages.some((page) => page.ocr_used === true);

    const criteria = Object.freeze([
      criterion('contract_valid', true, extraction.schema_version),
      criterion(
        'extraction_mode',
        extraction.extraction_mode === expected.extraction_mode,
        `expected=${expected.extraction_mode};actual=${extraction.extraction_mode}`,
      ),
      criterion(
        'page_attribution',
        extraction.pages.length >= expected.min_pages
          && extraction.pages.every((page) => Number.isInteger(page.page_number) && page.page_number >= 1),
        `expected_min=${expected.min_pages};actual=${extraction.pages.length}`,
      ),
      criterion(
        'block_coverage',
        extraction.blocks.length >= expected.min_blocks,
        `expected_min=${expected.min_blocks};actual=${extraction.blocks.length}`,
      ),
      criterion(
        'table_coverage',
        extraction.tables.length >= expected.min_tables,
        `expected_min=${expected.min_tables};actual=${extraction.tables.length}`,
      ),
      criterion(
        'ocr_labeling',
        ocrUsed === expected.ocr_used,
        `expected=${expected.ocr_used};actual=${ocrUsed}`,
      ),
      criterion(
        'evidence_identity_unique',
        new Set(evidenceIds).size === evidenceIds.length,
        `evidence_ids=${evidenceIds.length}`,
      ),
      criterion(
        'legacy_compatibility_projection',
        projection.extracted_text.length >= expected.min_plain_text_characters,
        `expected_min_chars=${expected.min_plain_text_characters};actual=${projection.extracted_text.length}`,
      ),
      criterion(
        'local_read_only_authority',
        extraction.extractor.local === true
          && extraction.filesystem_mutation_allowed === false
          && extraction.execution_allowed === false
          && extraction.automatic_approval_allowed === false
          && projection.filesystem_mutation_allowed === false
          && projection.execution_allowed === false
          && projection.automatic_approval_allowed === false,
        `extractor_local=${extraction.extractor.local}`,
      ),
    ]);

    const passedCount = criteria.filter((entry) => entry.passed).length;
    const scorePercent = Math.round((passedCount / criteria.length) * 100);

    const digestContract = {
      case_id: benchmarkCase.case_id,
      source_fingerprint_hash: extraction.source_fingerprint.hash,
      extractor: {
        id: extraction.extractor.id,
        version: extraction.extractor.version,
        provider: extraction.extractor.provider,
        model: extraction.extractor.model,
        configuration_hash: extraction.extractor.configuration_hash,
        local: extraction.extractor.local,
      },
      extraction_mode: extraction.extraction_mode,
      criteria: criteria.map((entry) => ({ ...entry })),
      projection_text: projection.extracted_text,
    };

    return Object.freeze({
      case_id: benchmarkCase.case_id,
      document_class: benchmarkCase.document_class,
      status: criteria.every((entry) => entry.passed) ? 'pass' : 'partial',
      score_percent: scorePercent,
      passed_criteria: passedCount,
      total_criteria: criteria.length,
      criteria,
      extractor_id: extraction.extractor.id,
      extractor_version: extraction.extractor.version,
      source_fingerprint_hash: extraction.source_fingerprint.hash,
      result_digest: `structured_benchmark_case_${stableDigest(digestContract)}`,
    });
  } catch (error) {
    return Object.freeze({
      case_id: benchmarkCase.case_id,
      document_class: benchmarkCase.document_class,
      status: 'fail',
      score_percent: 0,
      passed_criteria: 0,
      total_criteria: 9,
      criteria: Object.freeze([
        criterion('contract_valid', false, error?.message || 'UNKNOWN_BENCHMARK_ERROR'),
      ]),
      error_code: error?.message || 'UNKNOWN_BENCHMARK_ERROR',
      result_digest: `structured_benchmark_case_${stableDigest({
        case_id: benchmarkCase.case_id,
        error_code: error?.message || 'UNKNOWN_BENCHMARK_ERROR',
      })}`,
    });
  }
}

export function runStructuredExtractorBenchmark({
  manifest: inputManifest,
  candidate_id: candidateId = 'unidentified-candidate',
  outputs = {},
  telemetry = {},
} = {}) {
  const manifest = normalizeStructuredExtractorBenchmarkManifest(inputManifest);

  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
    throw new Error('STRUCTURED_BENCHMARK_OUTPUTS_REQUIRED');
  }
  if (!telemetry || typeof telemetry !== 'object' || Array.isArray(telemetry)) {
    throw new Error('INVALID_STRUCTURED_BENCHMARK_TELEMETRY');
  }

  const results = manifest.cases.map((benchmarkCase) => {
    if (!(benchmarkCase.case_id in outputs)) {
      return Object.freeze({
        case_id: benchmarkCase.case_id,
        document_class: benchmarkCase.document_class,
        status: 'missing',
        score_percent: 0,
        passed_criteria: 0,
        total_criteria: 9,
        criteria: Object.freeze([]),
        error_code: 'BENCHMARK_OUTPUT_MISSING',
        result_digest: `structured_benchmark_case_${stableDigest({
          case_id: benchmarkCase.case_id,
          error_code: 'BENCHMARK_OUTPUT_MISSING',
        })}`,
      });
    }
    return scoreCase(benchmarkCase, outputs[benchmarkCase.case_id]);
  });

  const normalizedTelemetry = {};
  for (const benchmarkCase of manifest.cases) {
    const value = telemetry[benchmarkCase.case_id];
    if (value == null) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`INVALID_BENCHMARK_TELEMETRY:${benchmarkCase.case_id}`);
    }

    const runtimeMs = value.runtime_ms;
    const peakRssMb = value.peak_rss_mb;
    const coldStartMs = value.cold_start_ms;

    for (const [name, metric] of Object.entries({
      runtime_ms: runtimeMs,
      peak_rss_mb: peakRssMb,
      cold_start_ms: coldStartMs,
    })) {
      if (metric != null && (!Number.isFinite(metric) || metric < 0)) {
        throw new Error(`INVALID_BENCHMARK_TELEMETRY:${benchmarkCase.case_id}:${name}`);
      }
    }

    normalizedTelemetry[benchmarkCase.case_id] = Object.freeze({
      runtime_ms: runtimeMs ?? null,
      peak_rss_mb: peakRssMb ?? null,
      cold_start_ms: coldStartMs ?? null,
    });
  }

  const totalCriteria = results.reduce((sum, entry) => sum + entry.total_criteria, 0);
  const passedCriteria = results.reduce((sum, entry) => sum + entry.passed_criteria, 0);
  const aggregateScore = totalCriteria === 0 ? 0 : Math.round((passedCriteria / totalCriteria) * 100);

  const aggregate = Object.freeze({
    case_count: results.length,
    passed_case_count: results.filter((entry) => entry.status === 'pass').length,
    partial_case_count: results.filter((entry) => entry.status === 'partial').length,
    failed_case_count: results.filter((entry) => entry.status === 'fail').length,
    missing_case_count: results.filter((entry) => entry.status === 'missing').length,
    passed_criteria: passedCriteria,
    total_criteria: totalCriteria,
    score_percent: aggregateScore,
  });

  const digestContract = {
    benchmark_id: manifest.benchmark_id,
    candidate_id: requireString(candidateId, 'STRUCTURED_BENCHMARK_CANDIDATE_ID_REQUIRED'),
    aggregate: { ...aggregate },
    results: results.map((entry) => ({
      case_id: entry.case_id,
      status: entry.status,
      score_percent: entry.score_percent,
      result_digest: entry.result_digest,
    })),
    telemetry: Object.fromEntries(
      Object.entries(normalizedTelemetry).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };

  return Object.freeze({
    benchmark_id: manifest.benchmark_id,
    candidate_id: requireString(candidateId, 'STRUCTURED_BENCHMARK_CANDIDATE_ID_REQUIRED'),
    status: results.every((entry) => entry.status === 'pass') ? 'pass' : 'incomplete',
    benchmark_digest: `structured_benchmark_${stableDigest(digestContract)}`,
    aggregate,
    results: Object.freeze(results),
    telemetry: Object.freeze(normalizedTelemetry),
    deferred_case_ids: manifest.deferred_case_ids,
    comparison_only: true,
    automatic_winner_selection_allowed: false,
    provider_neutral: true,
    model_execution_required: false,
    adapter_transport_invoked: false,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export const structuredExtractorBenchmark = Object.freeze({
  mode: 'static_result_benchmark',
  comparison_only: true,
  automatic_winner_selection_allowed: false,
  provider_neutral: true,
  model_execution_required: false,
  adapter_transport_invoked: false,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
