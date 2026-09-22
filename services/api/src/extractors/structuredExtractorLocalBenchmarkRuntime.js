import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  createStructuredAdapterRequest,
  validateStructuredAdapterResponse,
} from './structuredDocumentAdapterProtocol.js';

const REQUIRED_AUTHORITY = Object.freeze({
  benchmark_only: true,
  local_only: true,
  remote_processing_allowed: false,
  automatic_indexing_allowed: false,
  persistence_allowed: false,
  production_route_allowed: false,
  filesystem_mutation_allowed: false,
  automatic_winner_selection_allowed: false,
});

const PASSTHROUGH_ENV = new Set([
  'PATH',
  'HOME',
  'USERPROFILE',
  'SYSTEMROOT',
  'WINDIR',
  'TEMP',
  'TMP',
  'TMPDIR',
  'DOCLING_ARTIFACTS_PATH',
  'TESSDATA_PREFIX',
]);

function requireString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function stableDigest(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 24);
}

function assertAuthority(authority) {
  if (!authority || typeof authority !== 'object' || Array.isArray(authority)) {
    throw new Error('LOCAL_EXTRACTOR_RUNTIME_AUTHORITY_REQUIRED');
  }
  for (const [key, expected] of Object.entries(REQUIRED_AUTHORITY)) {
    if (authority[key] !== expected) {
      throw new Error(`LOCAL_EXTRACTOR_RUNTIME_AUTHORITY_FORBIDDEN:${key}`);
    }
  }
}

function normalizeLicenseRecord(value, prefix, { requireVersion = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${prefix}_RECORD_REQUIRED`);
  }
  const version = value.version == null ? null : requireString(value.version, `${prefix}_VERSION_REQUIRED`);
  const revision = value.revision == null ? null : requireString(value.revision, `${prefix}_REVISION_REQUIRED`);
  if (requireVersion && !version) throw new Error(`${prefix}_VERSION_REQUIRED`);
  return Object.freeze({
    name: requireString(value.name, `${prefix}_NAME_REQUIRED`),
    version,
    revision,
    license: requireString(value.license, `${prefix}_LICENSE_REQUIRED`),
    review_status: requireString(value.review_status, `${prefix}_REVIEW_STATUS_REQUIRED`),
    source: requireString(value.source, `${prefix}_SOURCE_REQUIRED`),
  });
}

function normalizeCandidate(key, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`LOCAL_EXTRACTOR_CANDIDATE_REQUIRED:${key}`);
  }
  const runtime = value.runtime;
  if (!runtime || typeof runtime !== 'object' || Array.isArray(runtime)) {
    throw new Error(`LOCAL_EXTRACTOR_RUNTIME_REQUIRED:${key}`);
  }
  const adapter = value.adapter;
  if (!adapter || typeof adapter !== 'object' || Array.isArray(adapter)) {
    throw new Error(`LOCAL_EXTRACTOR_ADAPTER_REQUIRED:${key}`);
  }
  const models = Array.isArray(value.models)
    ? value.models.map((model, index) => normalizeLicenseRecord(model, `${key.toUpperCase()}_MODEL_${index}`))
    : [];
  if (models.some((model) => !model.revision)) {
    throw new Error(`LOCAL_EXTRACTOR_MODEL_REVISION_REQUIRED:${key}`);
  }

  const requiredEnvironment = Array.isArray(runtime.required_environment)
    ? runtime.required_environment.map((entry) => requireString(entry, 'INVALID_RUNTIME_ENVIRONMENT_NAME'))
    : [];
  const forcedEnvironment = runtime.forced_environment && typeof runtime.forced_environment === 'object'
    ? Object.fromEntries(Object.entries(runtime.forced_environment).map(([name, entry]) => [
      requireString(name, 'INVALID_RUNTIME_ENVIRONMENT_NAME'),
      requireString(entry, 'INVALID_RUNTIME_ENVIRONMENT_VALUE'),
    ]))
    : {};

  return Object.freeze({
    key,
    candidate_id: requireString(value.candidate_id, `LOCAL_EXTRACTOR_CANDIDATE_ID_REQUIRED:${key}`),
    display_name: requireString(value.display_name, `LOCAL_EXTRACTOR_DISPLAY_NAME_REQUIRED:${key}`),
    adapter: Object.freeze({
      id: requireString(adapter.id, `LOCAL_EXTRACTOR_ADAPTER_ID_REQUIRED:${key}`),
      version: requireString(adapter.version, `LOCAL_EXTRACTOR_ADAPTER_VERSION_REQUIRED:${key}`),
    }),
    software: normalizeLicenseRecord(value.software, `${key.toUpperCase()}_SOFTWARE`, { requireVersion: true }),
    models: Object.freeze(models),
    allowed_case_ids: Object.freeze(
      Array.isArray(value.allowed_case_ids)
        ? [...new Set(value.allowed_case_ids.map((entry) => requireString(entry, 'INVALID_ALLOWED_CASE_ID')))].sort()
        : [],
    ),
    runtime: Object.freeze({
      command: requireString(runtime.command, `LOCAL_EXTRACTOR_COMMAND_REQUIRED:${key}`),
      script: requireString(runtime.script, `LOCAL_EXTRACTOR_SCRIPT_REQUIRED:${key}`),
      required_environment: Object.freeze(requiredEnvironment),
      forced_environment: Object.freeze(forcedEnvironment),
    }),
  });
}

export function normalizeStructuredExtractorRuntimeLock(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('LOCAL_EXTRACTOR_RUNTIME_LOCK_REQUIRED');
  }
  assertAuthority(input.authority);

  const candidateEntries = Object.entries(input.candidates ?? {});
  if (candidateEntries.length !== 2) throw new Error('LOCAL_EXTRACTOR_CANDIDATE_SET_INVALID');

  const candidates = Object.fromEntries(candidateEntries.map(([key, value]) => [
    key,
    normalizeCandidate(key, value),
  ]));

  if (!candidates.docling || !candidates.tesseract) {
    throw new Error('LOCAL_EXTRACTOR_CANDIDATE_SET_INVALID');
  }

  return Object.freeze({
    schema_version: requireString(input.schema_version, 'LOCAL_EXTRACTOR_LOCK_SCHEMA_REQUIRED'),
    benchmark_id: requireString(input.benchmark_id, 'LOCAL_EXTRACTOR_BENCHMARK_ID_REQUIRED'),
    authority: Object.freeze({ ...REQUIRED_AUTHORITY }),
    candidates: Object.freeze(candidates),
  });
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function resolveBenchmarkSource({ corpus_root, source_path, max_source_bytes = 25 * 1024 * 1024 } = {}) {
  const root = await fsp.realpath(requireString(corpus_root, 'LOCAL_EXTRACTOR_CORPUS_ROOT_REQUIRED'));
  const source = await fsp.realpath(requireString(source_path, 'LOCAL_EXTRACTOR_SOURCE_PATH_REQUIRED'));
  if (!isContained(root, source)) throw new Error('LOCAL_EXTRACTOR_SOURCE_OUTSIDE_CORPUS');

  const stat = await fsp.stat(source);
  if (!stat.isFile()) throw new Error('LOCAL_EXTRACTOR_SOURCE_NOT_FILE');
  if (stat.size > max_source_bytes) throw new Error('LOCAL_EXTRACTOR_SOURCE_TOO_LARGE');

  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(source);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });

  return Object.freeze({
    corpus_root: root,
    source_path: source,
    source_fingerprint: Object.freeze({
      hash: `sha256:${hash.digest('hex')}`,
      size_bytes: stat.size,
      mtime_ms: stat.mtimeMs,
    }),
  });
}

export function buildBenchmarkRuntimeEnvironment(candidate, baseEnv = process.env) {
  const env = {};
  for (const key of PASSTHROUGH_ENV) {
    if (typeof baseEnv[key] === 'string' && baseEnv[key]) env[key] = baseEnv[key];
  }
  for (const required of candidate.runtime.required_environment) {
    if (!env[required]) throw new Error(`LOCAL_EXTRACTOR_REQUIRED_ENV_MISSING:${required}`);
  }
  Object.assign(env, candidate.runtime.forced_environment);
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.ALL_PROXY;
  delete env.http_proxy;
  delete env.https_proxy;
  delete env.all_proxy;
  return Object.freeze(env);
}

function boundedProcess({
  command,
  args,
  cwd,
  env,
  stdin,
  timeout_ms,
  max_output_bytes,
  spawn_impl = spawn,
}) {
  return new Promise((resolve, reject) => {
    const child = spawn_impl(command, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    let timer = null;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };

    const append = (current, chunk) => {
      const next = Buffer.concat([current, Buffer.from(chunk)]);
      if (next.length > max_output_bytes) {
        child.kill('SIGKILL');
        throw new Error('LOCAL_EXTRACTOR_OUTPUT_LIMIT_EXCEEDED');
      }
      return next;
    };

    child.stdout.on('data', (chunk) => {
      try { stdout = append(stdout, chunk); } catch (error) { finish(error); }
    });
    child.stderr.on('data', (chunk) => {
      try { stderr = append(stderr, chunk); } catch (error) { finish(error); }
    });
    child.on('error', (error) => finish(new Error(`LOCAL_EXTRACTOR_PROCESS_ERROR:${error.message}`)));
    child.on('close', (code, signal) => finish(null, {
      exit_code: code,
      signal,
      stdout: stdout.toString('utf8'),
      stderr: stderr.toString('utf8'),
    }));

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error('LOCAL_EXTRACTOR_TIMEOUT'));
    }, timeout_ms);

    child.stdin.end(stdin);
  });
}

function assertRuntimeIdentity(candidate, identity = {}) {
  if (identity.candidate_id !== candidate.candidate_id) {
    throw new Error('LOCAL_EXTRACTOR_RUNTIME_IDENTITY_MISMATCH');
  }
  if (identity.software_version !== candidate.software.version) {
    throw new Error('LOCAL_EXTRACTOR_SOFTWARE_VERSION_MISMATCH');
  }
  const expected = candidate.models.map((entry) => `${entry.name}@${entry.revision}`).sort();
  const actual = Array.isArray(identity.model_revisions)
    ? identity.model_revisions.map((entry) => requireString(entry, 'INVALID_RUNTIME_MODEL_REVISION')).sort()
    : [];
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error('LOCAL_EXTRACTOR_MODEL_REVISION_MISMATCH');
  }
}

function normalizeTelemetry(value = {}) {
  const result = {};
  for (const key of ['runtime_ms', 'peak_rss_mb', 'cold_start_ms']) {
    const metric = value[key];
    if (!Number.isFinite(metric) || metric < 0) {
      throw new Error(`LOCAL_EXTRACTOR_TELEMETRY_INVALID:${key}`);
    }
    result[key] = metric;
  }
  return Object.freeze(result);
}

export async function runStructuredExtractorLocalBenchmarkCase({
  runtime_lock,
  runtime_lock_path,
  candidate_key,
  case_id,
  corpus_root,
  source_path,
  mime_type,
  repository_root = process.cwd(),
  explicit_benchmark_invocation = false,
  repeat_count = 2,
  timeout_ms = 120_000,
  max_output_bytes = 16 * 1024 * 1024,
  base_env = process.env,
  invoke_process = boundedProcess,
} = {}) {
  if (explicit_benchmark_invocation !== true) {
    throw new Error('LOCAL_EXTRACTOR_EXPLICIT_INVOCATION_REQUIRED');
  }
  if (!Number.isInteger(repeat_count) || repeat_count < 2 || repeat_count > 5) {
    throw new Error('LOCAL_EXTRACTOR_REPEAT_COUNT_INVALID');
  }
  if (!Number.isInteger(timeout_ms) || timeout_ms < 1 || timeout_ms > 15 * 60_000) {
    throw new Error('LOCAL_EXTRACTOR_TIMEOUT_INVALID');
  }

  const lock = normalizeStructuredExtractorRuntimeLock(runtime_lock);
  const candidate = lock.candidates[requireString(candidate_key, 'LOCAL_EXTRACTOR_CANDIDATE_REQUIRED')];
  if (!candidate) throw new Error('LOCAL_EXTRACTOR_CANDIDATE_NOT_ALLOWED');
  const normalizedCaseId = requireString(case_id, 'LOCAL_EXTRACTOR_CASE_ID_REQUIRED');
  if (!candidate.allowed_case_ids.includes(normalizedCaseId)) {
    throw new Error('LOCAL_EXTRACTOR_CASE_NOT_ALLOWED');
  }

  const source = await resolveBenchmarkSource({ corpus_root, source_path });
  const request = createStructuredAdapterRequest({
    adapter: candidate.adapter,
    file: {
      file_id: `phase12:${normalizedCaseId}`,
      source_path: source.source_path,
      mime_type: mime_type ?? null,
      source_fingerprint: source.source_fingerprint,
    },
  });

  const lockPath = path.resolve(repository_root, requireString(runtime_lock_path, 'LOCAL_EXTRACTOR_LOCK_PATH_REQUIRED'));
  const scriptPath = path.resolve(repository_root, candidate.runtime.script);
  const env = buildBenchmarkRuntimeEnvironment(candidate, base_env);
  const digests = [];
  const telemetryRuns = [];
  let acceptedExtraction = null;

  for (let index = 0; index < repeat_count; index += 1) {
    const result = await invoke_process({
      command: candidate.runtime.command,
      args: [scriptPath, '--candidate', candidate.key, '--runtime-lock', lockPath],
      cwd: repository_root,
      env,
      stdin: JSON.stringify(request),
      timeout_ms,
      max_output_bytes,
    });

    if (result.exit_code !== 0) {
      throw new Error(`LOCAL_EXTRACTOR_NONZERO_EXIT:${result.exit_code}:${result.stderr.slice(0, 500)}`);
    }

    let response;
    try {
      response = JSON.parse(result.stdout);
    } catch {
      throw new Error('LOCAL_EXTRACTOR_INVALID_JSON_RESPONSE');
    }

    assertRuntimeIdentity(candidate, response.runtime_identity);
    const telemetry = normalizeTelemetry(response.benchmark_telemetry);
    const validated = validateStructuredAdapterResponse({ request, response });
    const digest = `local_extraction_${stableDigest(validated.extraction)}`;
    digests.push(digest);
    telemetryRuns.push(telemetry);
    acceptedExtraction ??= validated.extraction;
  }

  if (new Set(digests).size !== 1) throw new Error('LOCAL_EXTRACTOR_NONDETERMINISTIC_OUTPUT');

  return Object.freeze({
    benchmark_id: lock.benchmark_id,
    candidate_id: candidate.candidate_id,
    case_id: normalizedCaseId,
    extraction: acceptedExtraction,
    telemetry: Object.freeze({
      runtime_ms: Math.round((telemetryRuns.reduce((sum, item) => sum + item.runtime_ms, 0) / telemetryRuns.length) * 100) / 100,
      peak_rss_mb: Math.max(...telemetryRuns.map((item) => item.peak_rss_mb)),
      cold_start_ms: telemetryRuns[0].cold_start_ms,
    }),
    determinism: Object.freeze({
      repeat_count,
      deterministic: true,
      output_digest: digests[0],
      observed_digests: Object.freeze(digests),
    }),
    authority: lock.authority,
  });
}

export const structuredExtractorLocalBenchmarkRuntime = Object.freeze({
  mode: 'explicit_local_benchmark_only',
  candidates: Object.freeze(['docling', 'tesseract']),
  local_only: true,
  offline_execution_required: true,
  remote_processing_allowed: false,
  automatic_indexing_allowed: false,
  persistence_allowed: false,
  production_route_allowed: false,
  filesystem_mutation_allowed: false,
  automatic_winner_selection_allowed: false,
  shell_execution_allowed: false,
});
