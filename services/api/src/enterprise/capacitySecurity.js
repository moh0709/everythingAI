import { performance } from 'node:perf_hooks';

const SENSITIVE_KEY = /(password|passwd|secret|token|credential|authorization|api[_-]?key|access[_-]?key|private[_-]?key|database_url|dsn)/i;
const URI_WITH_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/gi;
const BEARER_TOKEN = /\b(Bearer\s+)[A-Za-z0-9._~+\-/=]+/gi;
const SENSITIVE_ASSIGNMENT = /\b(password|passwd|secret|token|credential|authorization|api[_-]?key|access[_-]?key|private[_-]?key|database_url|dsn)\s*([=:])\s*([^\s&,;]+)/gi;
const SENSITIVE_QUERY_PARAM = /([?&])(password|passwd|secret|token|credential|authorization|api[_-]?key|access[_-]?key|private[_-]?key|database_url|dsn)=([^&#\s]+)/gi;
const EXACT_COMMIT_SHA = /^[0-9a-f]{40}$/i;

function normalizePositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function normalizeString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function redactString(value) {
  return value
    .replace(URI_WITH_CREDENTIALS, '$1[REDACTED]@')
    .replace(BEARER_TOKEN, '$1[REDACTED]')
    .replace(SENSITIVE_QUERY_PARAM, '$1$2=[REDACTED]')
    .replace(SENSITIVE_ASSIGNMENT, '$1$2[REDACTED]');
}

export function redactEnterpriseEvidence(value, seen = new WeakSet()) {
  if (typeof value === 'string') return redactString(value);
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactEnterpriseEvidence(item, seen));
  }

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      output[key] = '[REDACTED]';
      continue;
    }
    output[key] = redactEnterpriseEvidence(item, seen);
  }
  return output;
}

async function runWithTimeout(operation, context, timeoutMs) {
  let timer;
  const controller = new AbortController();
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error('Capacity operation timed out');
      error.code = 'CAPACITY_OPERATION_TIMEOUT';
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve().then(() => operation({ ...context, signal: controller.signal })),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runBoundedCapacityScenario({
  name,
  iterations,
  concurrency,
  maxIterations = 100,
  maxConcurrency = 8,
  operationTimeoutMs = 5000,
  maxOperationTimeoutMs = 30000,
  operation,
} = {}) {
  const scenarioName = normalizeString(name);
  const iterationCount = normalizePositiveInteger(iterations);
  const concurrencyLimit = normalizePositiveInteger(concurrency);
  const boundedIterations = normalizePositiveInteger(maxIterations);
  const boundedConcurrency = normalizePositiveInteger(maxConcurrency);
  const timeoutMs = normalizePositiveInteger(operationTimeoutMs);
  const boundedTimeoutMs = normalizePositiveInteger(maxOperationTimeoutMs);

  if (
    !scenarioName
    || !iterationCount
    || !concurrencyLimit
    || !boundedIterations
    || !boundedConcurrency
    || !timeoutMs
    || !boundedTimeoutMs
    || iterationCount > boundedIterations
    || concurrencyLimit > boundedConcurrency
    || timeoutMs > boundedTimeoutMs
    || typeof operation !== 'function'
  ) {
    throw new Error('Bounded capacity configuration denied');
  }

  let nextIndex = 0;
  let inFlight = 0;
  let peakConcurrency = 0;
  let failures = 0;
  let timeouts = 0;
  const startedAt = performance.now();

  async function worker() {
    while (true) {
      const index = nextIndex;
      if (index >= iterationCount) return;
      nextIndex += 1;
      inFlight += 1;
      peakConcurrency = Math.max(peakConcurrency, inFlight);
      try {
        const result = await runWithTimeout(operation, { index }, timeoutMs);
        if (result === false || result?.ok === false) failures += 1;
      } catch (error) {
        failures += 1;
        if (error?.code === 'CAPACITY_OPERATION_TIMEOUT') timeouts += 1;
      } finally {
        inFlight -= 1;
      }
    }
  }

  await Promise.all(Array.from(
    { length: Math.min(concurrencyLimit, iterationCount) },
    () => worker(),
  ));
  const durationMs = Math.max(0, performance.now() - startedAt);

  return {
    name: scenarioName,
    status: failures === 0 ? 'pass' : 'fail',
    measured: {
      iterations: iterationCount,
      configuredConcurrency: concurrencyLimit,
      peakConcurrency,
      failures,
      timeouts,
      durationMs: Number(durationMs.toFixed(3)),
      operationsPerSecond: durationMs > 0
        ? Number(((iterationCount / durationMs) * 1000).toFixed(3))
        : null,
    },
    bounds: {
      maxIterations: boundedIterations,
      maxConcurrency: boundedConcurrency,
      operationTimeoutMs: timeoutMs,
      maxOperationTimeoutMs: boundedTimeoutMs,
    },
    claims: { regressionEvidenceOnly: true, productionValidated: false, sla: null },
  };
}

export async function runEnterpriseSecurityRegressionMatrix({ cases = [] } = {}) {
  if (!Array.isArray(cases) || cases.length === 0) {
    return { status: 'blocked', results: [], reason: 'security-cases-required' };
  }

  const results = [];
  for (const entry of cases) {
    const name = normalizeString(entry?.name);
    if (!name || typeof entry?.exercise !== 'function') {
      results.push({ name: name ?? 'invalid-case', status: 'blocked', reason: 'invalid-security-case' });
      continue;
    }

    try {
      const observed = await entry.exercise();
      const denied = observed?.denied === true;
      const adapterCalls = Number.isSafeInteger(observed?.adapterCalls) ? observed.adapterCalls : null;
      const requirePreAdapterDenial = entry.requirePreAdapterDenial !== false;
      const pass = denied && (!requirePreAdapterDenial || adapterCalls === 0);
      results.push({ name, status: pass ? 'pass' : 'fail', denied, adapterCalls, requirePreAdapterDenial });
    } catch {
      results.push({ name, status: 'fail', denied: false, adapterCalls: null, reason: 'security-case-threw' });
    }
  }

  return {
    status: results.every((result) => result.status === 'pass') ? 'pass' : 'fail',
    results,
  };
}

export function createEnterpriseReleaseEvidence({
  commitSha,
  rollbackBoundary,
  capacityResults,
  securityResults,
  inheritedValidation,
  environment,
} = {}) {
  const rawSha = normalizeString(commitSha);
  const sha = rawSha && EXACT_COMMIT_SHA.test(rawSha) ? rawSha.toLowerCase() : null;
  const rollback = normalizeString(rollbackBoundary);
  const capacities = Array.isArray(capacityResults) ? capacityResults : [];
  const security = Array.isArray(securityResults) ? securityResults : [];
  const inherited = Array.isArray(inheritedValidation) ? inheritedValidation : [];

  const requiredEvidencePresent = Boolean(
    sha
    && rollback
    && capacities.length > 0
    && security.length > 0
    && inherited.length > 0
  );
  const allMeasuredEvidencePassed = requiredEvidencePresent
    && capacities.every((result) => result?.status === 'pass')
    && security.every((result) => result?.status === 'pass')
    && inherited.every((result) => result?.status === 'pass');

  const report = {
    schema: 'everythingai.enterprise-release-evidence.v1',
    status: !requiredEvidencePresent ? 'blocked' : allMeasuredEvidencePassed ? 'pass' : 'fail',
    code: { commitSha: sha },
    rollbackBoundary: rollback ? redactString(rollback) : null,
    capacityResults: capacities,
    securityResults: security,
    inheritedValidation: inherited,
    environment: environment && typeof environment === 'object' ? environment : {},
    claims: {
      ciDisposableRegressionEvidence: true,
      productionCapacityValidated: false,
      penetrationTestCertified: false,
      complianceCertified: false,
      commercialSlaEstablished: false,
    },
  };

  return redactEnterpriseEvidence(report);
}