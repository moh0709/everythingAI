import crypto from 'node:crypto';

const BENCHMARK_DIGEST = /^structured_benchmark_[a-f0-9]{24}$/;
const CASE_DIGEST = /^structured_benchmark_case_[a-f0-9]{24}$/;
const REVIEW_STATUSES = new Set(['documented', 'review_required', 'unknown']);
const REDISTRIBUTION_STATUSES = new Set(['allowed', 'review_required', 'unknown']);
const COMMERCIAL_USE_STATUSES = new Set(['allowed', 'review_required', 'unknown']);

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

function requireEnum(value, allowed, code) {
  const normalized = requireString(value, code);
  if (!allowed.has(normalized)) throw new Error(code);
  return normalized;
}

function normalizeLicenseRecord(value, prefix) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${prefix}_LICENSE_RECORD_REQUIRED`);
  }

  return Object.freeze({
    name: requireString(value.name, `${prefix}_LICENSE_NAME_REQUIRED`),
    version: value.version == null
      ? null
      : requireString(value.version, `${prefix}_LICENSE_VERSION_INVALID`),
    revision: value.revision == null
      ? null
      : requireString(value.revision, `${prefix}_LICENSE_REVISION_INVALID`),
    license: requireString(value.license, `${prefix}_LICENSE_REQUIRED`),
    review_status: requireEnum(
      value.review_status,
      REVIEW_STATUSES,
      `${prefix}_LICENSE_REVIEW_STATUS_INVALID`,
    ),
    source: value.source == null ? null : requireString(value.source, `${prefix}_LICENSE_SOURCE_INVALID`),
  });
}

function normalizeBenchmarkResult(value, candidateId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('CANDIDATE_BENCHMARK_RESULT_REQUIRED');
  }
  if (value.candidate_id !== candidateId) throw new Error('CANDIDATE_BENCHMARK_ID_MISMATCH');
  if (!BENCHMARK_DIGEST.test(value.benchmark_digest ?? '')) {
    throw new Error('INVALID_CANDIDATE_BENCHMARK_DIGEST');
  }
  if (
    value.comparison_only !== true
    || value.automatic_winner_selection_allowed !== false
    || value.provider_neutral !== true
    || value.filesystem_mutation_allowed !== false
    || value.execution_allowed !== false
    || value.automatic_approval_allowed !== false
  ) {
    throw new Error('UNSAFE_CANDIDATE_BENCHMARK_AUTHORITY');
  }

  const results = Array.isArray(value.results) ? value.results : [];
  if (results.length === 0) throw new Error('CANDIDATE_BENCHMARK_CASE_RESULTS_REQUIRED');

  const caseIds = new Set();
  const normalizedResults = results.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`INVALID_CANDIDATE_CASE_RESULT:${index}`);
    }
    const caseId = requireString(entry.case_id, `CANDIDATE_CASE_ID_REQUIRED:${index}`);
    if (caseIds.has(caseId)) throw new Error(`DUPLICATE_CANDIDATE_CASE_RESULT:${caseId}`);
    caseIds.add(caseId);

    if (!CASE_DIGEST.test(entry.result_digest ?? '')) {
      throw new Error(`INVALID_CANDIDATE_CASE_DIGEST:${caseId}`);
    }
    if (!Number.isInteger(entry.score_percent) || entry.score_percent < 0 || entry.score_percent > 100) {
      throw new Error(`INVALID_CANDIDATE_CASE_SCORE:${caseId}`);
    }

    return Object.freeze({
      case_id: caseId,
      document_class: requireString(entry.document_class, `CANDIDATE_DOCUMENT_CLASS_REQUIRED:${caseId}`),
      status: requireString(entry.status, `CANDIDATE_CASE_STATUS_REQUIRED:${caseId}`),
      score_percent: entry.score_percent,
      result_digest: entry.result_digest,
      error_code: entry.error_code ?? null,
      criteria: Object.freeze(Array.isArray(entry.criteria)
        ? entry.criteria.map((criterion) => Object.freeze({
          name: requireString(criterion?.name, `CANDIDATE_CRITERION_NAME_REQUIRED:${caseId}`),
          passed: criterion?.passed === true,
          details: criterion?.details ?? null,
        }))
        : []),
    });
  });

  const telemetry = value.telemetry && typeof value.telemetry === 'object' && !Array.isArray(value.telemetry)
    ? Object.fromEntries(Object.entries(value.telemetry)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([caseId, metrics]) => [
        caseId,
        Object.freeze({
          runtime_ms: metrics?.runtime_ms ?? null,
          peak_rss_mb: metrics?.peak_rss_mb ?? null,
          cold_start_ms: metrics?.cold_start_ms ?? null,
        }),
      ]))
    : {};

  return Object.freeze({
    benchmark_id: requireString(value.benchmark_id, 'CANDIDATE_BENCHMARK_ID_REQUIRED'),
    candidate_id: candidateId,
    status: requireString(value.status, 'CANDIDATE_BENCHMARK_STATUS_REQUIRED'),
    benchmark_digest: value.benchmark_digest,
    aggregate: Object.freeze({
      case_count: value.aggregate?.case_count ?? normalizedResults.length,
      passed_case_count: value.aggregate?.passed_case_count ?? 0,
      partial_case_count: value.aggregate?.partial_case_count ?? 0,
      failed_case_count: value.aggregate?.failed_case_count ?? 0,
      missing_case_count: value.aggregate?.missing_case_count ?? 0,
      score_percent: value.aggregate?.score_percent ?? 0,
    }),
    results: Object.freeze(normalizedResults),
    telemetry: Object.freeze(telemetry),
    deferred_case_ids: Object.freeze(Array.isArray(value.deferred_case_ids) ? [...value.deferred_case_ids] : []),
  });
}

export function normalizeStructuredExtractorCandidateBundle(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('STRUCTURED_EXTRACTOR_CANDIDATE_BUNDLE_REQUIRED');
  }

  const candidateId = requireString(input.candidate_id, 'CANDIDATE_ID_REQUIRED');
  const software = normalizeLicenseRecord(input.software, 'SOFTWARE');

  const models = Array.isArray(input.models)
    ? input.models.map((model, index) => normalizeLicenseRecord(model, `MODEL_${index}`))
    : [];

  const packaging = input.packaging;
  if (!packaging || typeof packaging !== 'object' || Array.isArray(packaging)) {
    throw new Error('CANDIDATE_PACKAGING_METADATA_REQUIRED');
  }

  const runtimeExecuted = input.runtime_executed === true;
  const evidenceKind = requireString(input.execution_evidence_kind, 'CANDIDATE_EXECUTION_EVIDENCE_KIND_REQUIRED');

  if (runtimeExecuted && !software.version) {
    throw new Error('RUNTIME_EXECUTED_SOFTWARE_VERSION_REQUIRED');
  }
  if (runtimeExecuted && models.some((model) => !model.revision)) {
    throw new Error('RUNTIME_EXECUTED_MODEL_REVISION_REQUIRED');
  }

  return Object.freeze({
    candidate_id: candidateId,
    display_name: requireString(input.display_name, 'CANDIDATE_DISPLAY_NAME_REQUIRED'),
    runtime_executed: runtimeExecuted,
    execution_evidence_kind: evidenceKind,
    software,
    models: Object.freeze(models),
    packaging: Object.freeze({
      local_execution_supported: packaging.local_execution_supported === true,
      offline_supported: packaging.offline_supported === true,
      redistribution_status: requireEnum(
        packaging.redistribution_status,
        REDISTRIBUTION_STATUSES,
        'CANDIDATE_REDISTRIBUTION_STATUS_INVALID',
      ),
      commercial_use_status: requireEnum(
        packaging.commercial_use_status,
        COMMERCIAL_USE_STATUSES,
        'CANDIDATE_COMMERCIAL_USE_STATUS_INVALID',
      ),
      offline_model_download_behavior: requireString(
        packaging.offline_model_download_behavior,
        'CANDIDATE_OFFLINE_MODEL_BEHAVIOR_REQUIRED',
      ),
      supported_platforms: Object.freeze(
        Array.isArray(packaging.supported_platforms)
          ? [...new Set(packaging.supported_platforms.map((value) => requireString(
            value,
            'INVALID_CANDIDATE_PLATFORM',
          )))].sort()
          : [],
      ),
      dependency_notes: packaging.dependency_notes == null
        ? null
        : requireString(packaging.dependency_notes, 'INVALID_CANDIDATE_DEPENDENCY_NOTES'),
    }),
    benchmark: normalizeBenchmarkResult(input.benchmark, candidateId),
  });
}

function reviewFlags(candidate) {
  const flags = [];

  if (candidate.software.review_status !== 'documented') {
    flags.push(`software_license:${candidate.software.review_status}`);
  }
  candidate.models.forEach((model) => {
    if (model.review_status !== 'documented') {
      flags.push(`model_license:${model.name}:${model.review_status}`);
    }
  });
  if (candidate.packaging.redistribution_status !== 'allowed') {
    flags.push(`redistribution:${candidate.packaging.redistribution_status}`);
  }
  if (candidate.packaging.commercial_use_status !== 'allowed') {
    flags.push(`commercial_use:${candidate.packaging.commercial_use_status}`);
  }
  if (!candidate.packaging.offline_supported) flags.push('offline_support:false');
  if (!candidate.packaging.local_execution_supported) flags.push('local_execution_support:false');

  return flags.sort();
}

export function compareStructuredExtractorCandidates(inputs = []) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('STRUCTURED_EXTRACTOR_CANDIDATES_REQUIRED');
  }

  const candidates = inputs
    .map(normalizeStructuredExtractorCandidateBundle)
    .sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));

  const ids = new Set();
  for (const candidate of candidates) {
    if (ids.has(candidate.candidate_id)) {
      throw new Error(`DUPLICATE_STRUCTURED_EXTRACTOR_CANDIDATE:${candidate.candidate_id}`);
    }
    ids.add(candidate.candidate_id);
  }

  const allCaseIds = [...new Set(
    candidates.flatMap((candidate) => candidate.benchmark.results.map((entry) => entry.case_id)),
  )].sort();

  const caseDiagnostics = allCaseIds.map((caseId) => Object.freeze({
    case_id: caseId,
    candidates: Object.freeze(candidates.map((candidate) => {
      const result = candidate.benchmark.results.find((entry) => entry.case_id === caseId) ?? null;
      const telemetry = candidate.benchmark.telemetry[caseId] ?? null;
      return Object.freeze({
        candidate_id: candidate.candidate_id,
        status: result?.status ?? 'missing',
        score_percent: result?.score_percent ?? 0,
        result_digest: result?.result_digest ?? null,
        runtime_ms: telemetry?.runtime_ms ?? null,
        peak_rss_mb: telemetry?.peak_rss_mb ?? null,
        cold_start_ms: telemetry?.cold_start_ms ?? null,
      });
    })),
  }));

  const diagnostics = candidates.map((candidate) => Object.freeze({
    candidate_id: candidate.candidate_id,
    display_name: candidate.display_name,
    runtime_executed: candidate.runtime_executed,
    execution_evidence_kind: candidate.execution_evidence_kind,
    benchmark_status: candidate.benchmark.status,
    benchmark_score_percent: candidate.benchmark.aggregate.score_percent,
    benchmark_digest: candidate.benchmark.benchmark_digest,
    review_flags: Object.freeze(reviewFlags(candidate)),
    deferred_case_ids: candidate.benchmark.deferred_case_ids,
  }));

  const digestContract = {
    candidates: diagnostics.map((entry) => ({
      candidate_id: entry.candidate_id,
      runtime_executed: entry.runtime_executed,
      execution_evidence_kind: entry.execution_evidence_kind,
      benchmark_digest: entry.benchmark_digest,
      review_flags: [...entry.review_flags],
    })),
    cases: caseDiagnostics.map((entry) => ({
      case_id: entry.case_id,
      candidates: entry.candidates.map((candidate) => ({ ...candidate })),
    })),
  };

  return Object.freeze({
    status: 'diagnostic_only',
    comparison_digest: `structured_candidate_comparison_${stableDigest(digestContract)}`,
    candidate_count: candidates.length,
    case_count: allCaseIds.length,
    candidates: Object.freeze(diagnostics),
    cases: Object.freeze(caseDiagnostics),
    automatic_ranking_allowed: false,
    automatic_winner_selection_allowed: false,
    legal_conclusion_provided: false,
    provider_neutral: true,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export const structuredExtractorCandidateDiagnostics = Object.freeze({
  mode: 'benchmark_result_import',
  automatic_ranking_allowed: false,
  automatic_winner_selection_allowed: false,
  legal_conclusion_provided: false,
  provider_neutral: true,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
