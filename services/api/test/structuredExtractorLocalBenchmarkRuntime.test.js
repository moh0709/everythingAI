import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildBenchmarkRuntimeEnvironment,
  normalizeStructuredExtractorRuntimeLock,
  resolveBenchmarkSource,
  runStructuredExtractorLocalBenchmarkCase,
  structuredExtractorLocalBenchmarkRuntime,
} from '../src/extractors/structuredExtractorLocalBenchmarkRuntime.js';

const MODEL_REVISION = 'e12c65a915945e4c28e237a9b52bc4a8f39a0cec';

function runtimeLock() {
  return {
    schema_version: '1.0',
    benchmark_id: 'everythingai-phase12-local-scan-v1',
    authority: {
      benchmark_only: true,
      local_only: true,
      remote_processing_allowed: false,
      automatic_indexing_allowed: false,
      persistence_allowed: false,
      production_route_allowed: false,
      filesystem_mutation_allowed: false,
      automatic_winner_selection_allowed: false,
    },
    candidates: {
      docling: {
        candidate_id: 'docling-2.129.0-local',
        display_name: 'Docling 2.129.0 + local Tesseract OCR',
        adapter: { id: 'docling-local-benchmark', version: '1.0.0' },
        software: {
          name: 'docling',
          version: '2.129.0',
          license: 'MIT',
          review_status: 'documented',
          source: 'published-package',
        },
        models: [
          {
            name: 'docling-layout-heron',
            revision: '8f39ad3',
            license: 'Apache-2.0',
            review_status: 'documented',
            source: 'published-model-card',
          },
          {
            name: 'tessdata_best-eng',
            revision: MODEL_REVISION,
            license: 'Apache-2.0',
            review_status: 'documented',
            source: 'published-model-repository',
          },
        ],
        allowed_case_ids: ['ocr-scan'],
        runtime: {
          command: 'python3',
          script: 'tools/structured-extractors/local_adapter.py',
          required_environment: ['DOCLING_ARTIFACTS_PATH', 'TESSDATA_PREFIX'],
          forced_environment: {
            HF_HUB_OFFLINE: '1',
            TRANSFORMERS_OFFLINE: '1',
          },
        },
      },
      tesseract: {
        candidate_id: 'tesseract-5.5.3-local',
        display_name: 'Tesseract 5.5.3 OCR baseline',
        adapter: { id: 'tesseract-local-benchmark', version: '1.0.0' },
        software: {
          name: 'tesseract',
          version: '5.5.3',
          license: 'Apache-2.0',
          review_status: 'documented',
          source: 'published-release',
        },
        models: [
          {
            name: 'tessdata_best-eng',
            revision: MODEL_REVISION,
            license: 'Apache-2.0',
            review_status: 'documented',
            source: 'published-model-repository',
          },
        ],
        allowed_case_ids: ['ocr-scan'],
        runtime: {
          command: 'python3',
          script: 'tools/structured-extractors/local_adapter.py',
          required_environment: ['TESSDATA_PREFIX'],
          forced_environment: {},
        },
      },
    },
  };
}

function extraction(request, text = 'AI benchmark text') {
  return {
    schema_version: '1.0',
    file_id: request.file.file_id,
    source_path: request.file.source_path,
    source_fingerprint: request.file.source_fingerprint,
    mime_type: request.file.mime_type,
    extractor: {
      id: request.adapter.id,
      version: request.adapter.version,
      provider: 'tesseract-ocr',
      model: `tessdata_best-eng@${MODEL_REVISION}`,
      configuration_hash: 'phase12-test-config',
      local: true,
    },
    extraction_mode: 'ocr',
    extracted_at: null,
    status: 'success',
    pages: [{
      page_id: 'page-1',
      page_number: 1,
      width: null,
      height: null,
      unit: null,
      rotation: 0,
      native_text_available: false,
      native_text_character_count: 0,
      ocr_used: true,
      ocr_reason: 'phase12_fixed_scan_benchmark',
      block_ids: ['block-1'],
      evidence_mode: 'ocr',
    }],
    blocks: [{
      block_id: 'block-1',
      page_id: 'page-1',
      block_type: 'paragraph',
      reading_order: 0,
      bbox: null,
      text,
      evidence_mode: 'ocr',
      confidence: null,
      native_object_ref: null,
      parent_block_id: null,
      child_block_ids: [],
    }],
    tables: [],
    figures: [],
    warnings: [],
    plain_text: text,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  };
}

async function fixtureWorkspace(prefix = 'eai-phase12-') {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const corpus = path.join(temp, 'corpus');
  await fs.mkdir(corpus);
  const source = path.join(corpus, 'scan.pbm');
  await fs.writeFile(source, 'P1\n8 8\n0 0 0 0 0 0 0 0\n'.repeat(8), 'utf8');
  return { temp, corpus, source };
}

function tesseractResponse(request, {
  softwareVersion = '5.5.3',
  text = 'AI benchmark text',
  runtimeMs = 25,
} = {}) {
  return {
    protocol_version: '1.0',
    request_id: request.request_id,
    status: 'ok',
    adapter: request.adapter,
    extraction: extraction(request, text),
    runtime_identity: {
      candidate_id: 'tesseract-5.5.3-local',
      software_version: softwareVersion,
      model_revisions: [`tessdata_best-eng@${MODEL_REVISION}`],
    },
    benchmark_telemetry: {
      runtime_ms: runtimeMs,
      peak_rss_mb: 64,
      cold_start_ms: 5,
    },
  };
}

test('runtime lock requires exactly the bounded candidates and exact model revisions', () => {
  const normalized = normalizeStructuredExtractorRuntimeLock(runtimeLock());

  assert.deepEqual(Object.keys(normalized.candidates).sort(), ['docling', 'tesseract']);
  assert.equal(normalized.candidates.docling.software.version, '2.129.0');
  assert.equal(normalized.candidates.tesseract.models[0].revision, MODEL_REVISION);
  assert.equal(normalized.authority.production_route_allowed, false);

  const unsafe = structuredClone(runtimeLock());
  unsafe.authority.production_route_allowed = true;
  assert.throws(
    () => normalizeStructuredExtractorRuntimeLock(unsafe),
    /LOCAL_EXTRACTOR_RUNTIME_AUTHORITY_FORBIDDEN:production_route_allowed/,
  );

  const floating = structuredClone(runtimeLock());
  delete floating.candidates.docling.models[0].revision;
  assert.throws(
    () => normalizeStructuredExtractorRuntimeLock(floating),
    /LOCAL_EXTRACTOR_MODEL_REVISION_REQUIRED:docling/,
  );

  const expanded = structuredClone(runtimeLock());
  expanded.candidates.paddleocr = structuredClone(expanded.candidates.tesseract);
  assert.throws(
    () => normalizeStructuredExtractorRuntimeLock(expanded),
    /LOCAL_EXTRACTOR_CANDIDATE_SET_INVALID/,
  );
});

test('runtime environment strips proxy and arbitrary variables while requiring local artifact roots', () => {
  const candidate = normalizeStructuredExtractorRuntimeLock(runtimeLock()).candidates.docling;
  const env = buildBenchmarkRuntimeEnvironment(candidate, {
    PATH: '/bin',
    HOME: '/home/test',
    DOCLING_ARTIFACTS_PATH: '/models/docling',
    TESSDATA_PREFIX: '/models/tessdata',
    HTTP_PROXY: 'http://proxy.example',
    HTTPS_PROXY: 'http://proxy.example',
    OPENAI_API_KEY: 'must-not-leak',
  });

  assert.equal(env.HF_HUB_OFFLINE, '1');
  assert.equal(env.TRANSFORMERS_OFFLINE, '1');
  assert.equal(env.HTTP_PROXY, undefined);
  assert.equal(env.HTTPS_PROXY, undefined);
  assert.equal(env.OPENAI_API_KEY, undefined);

  assert.throws(
    () => buildBenchmarkRuntimeEnvironment(candidate, {
      PATH: '/bin',
      TESSDATA_PREFIX: '/models/tessdata',
    }),
    /LOCAL_EXTRACTOR_REQUIRED_ENV_MISSING:DOCLING_ARTIFACTS_PATH/,
  );
});

test('source resolution is fingerprint-bound and fails closed outside the fixed corpus', async () => {
  const { temp, corpus, source } = await fixtureWorkspace();
  const outside = path.join(temp, 'outside.txt');
  await fs.writeFile(outside, 'outside', 'utf8');

  const inside = await resolveBenchmarkSource({
    corpus_root: corpus,
    source_path: source,
  });

  assert.equal(inside.source_path, await fs.realpath(source));
  assert.match(inside.source_fingerprint.hash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(inside.source_fingerprint.size_bytes > 0);

  await assert.rejects(
    () => resolveBenchmarkSource({
      corpus_root: corpus,
      source_path: outside,
    }),
    /LOCAL_EXTRACTOR_SOURCE_OUTSIDE_CORPUS/,
  );
});

test('explicit benchmark validates response twice and records deterministic evidence', async () => {
  const { temp, corpus, source } = await fixtureWorkspace('eai-phase12-run-');
  let calls = 0;

  const result = await runStructuredExtractorLocalBenchmarkCase({
    runtime_lock: runtimeLock(),
    runtime_lock_path: 'runtime-lock.json',
    candidate_key: 'tesseract',
    case_id: 'ocr-scan',
    corpus_root: corpus,
    source_path: source,
    mime_type: 'image/x-portable-bitmap',
    repository_root: temp,
    explicit_benchmark_invocation: true,
    base_env: {
      PATH: '/bin',
      TESSDATA_PREFIX: '/models/tessdata',
      HTTP_PROXY: 'http://proxy.example',
    },
    invoke_process: async ({ stdin, env, args }) => {
      calls += 1;
      const request = JSON.parse(stdin);
      assert.equal(env.HTTP_PROXY, undefined);
      assert.ok(args.includes('--candidate'));
      assert.ok(args.includes('tesseract'));
      return {
        exit_code: 0,
        signal: null,
        stderr: '',
        stdout: JSON.stringify(tesseractResponse(request)),
      };
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.candidate_id, 'tesseract-5.5.3-local');
  assert.equal(result.determinism.repeat_count, 2);
  assert.equal(result.determinism.deterministic, true);
  assert.match(result.determinism.output_digest, /^local_extraction_[a-f0-9]{24}$/);
  assert.equal(result.telemetry.runtime_ms, 25);
  assert.equal(result.telemetry.peak_rss_mb, 64);
  assert.equal(result.authority.production_route_allowed, false);
  assert.equal(result.authority.filesystem_mutation_allowed, false);
});

test('benchmark refuses implicit invocation, candidate case expansion, and runtime identity drift', async () => {
  const { temp, corpus, source } = await fixtureWorkspace('eai-phase12-deny-');
  const common = {
    runtime_lock: runtimeLock(),
    runtime_lock_path: 'runtime-lock.json',
    candidate_key: 'tesseract',
    corpus_root: corpus,
    source_path: source,
    mime_type: 'image/x-portable-bitmap',
    repository_root: temp,
    base_env: {
      PATH: '/bin',
      TESSDATA_PREFIX: '/models/tessdata',
    },
  };

  await assert.rejects(
    () => runStructuredExtractorLocalBenchmarkCase({
      ...common,
      case_id: 'ocr-scan',
    }),
    /LOCAL_EXTRACTOR_EXPLICIT_INVOCATION_REQUIRED/,
  );

  await assert.rejects(
    () => runStructuredExtractorLocalBenchmarkCase({
      ...common,
      case_id: 'table-complex',
      explicit_benchmark_invocation: true,
    }),
    /LOCAL_EXTRACTOR_CASE_NOT_ALLOWED/,
  );

  await assert.rejects(
    () => runStructuredExtractorLocalBenchmarkCase({
      ...common,
      case_id: 'ocr-scan',
      explicit_benchmark_invocation: true,
      invoke_process: async ({ stdin }) => {
        const request = JSON.parse(stdin);
        return {
          exit_code: 0,
          signal: null,
          stderr: '',
          stdout: JSON.stringify(tesseractResponse(request, {
            softwareVersion: '5.5.2',
          })),
        };
      },
    }),
    /LOCAL_EXTRACTOR_SOFTWARE_VERSION_MISMATCH/,
  );
});

test('benchmark fails closed when repeated normalized outputs differ', async () => {
  const { temp, corpus, source } = await fixtureWorkspace('eai-phase12-determinism-');
  let calls = 0;

  await assert.rejects(
    () => runStructuredExtractorLocalBenchmarkCase({
      runtime_lock: runtimeLock(),
      runtime_lock_path: 'runtime-lock.json',
      candidate_key: 'tesseract',
      case_id: 'ocr-scan',
      corpus_root: corpus,
      source_path: source,
      mime_type: 'image/x-portable-bitmap',
      repository_root: temp,
      explicit_benchmark_invocation: true,
      base_env: {
        PATH: '/bin',
        TESSDATA_PREFIX: '/models/tessdata',
      },
      invoke_process: async ({ stdin }) => {
        calls += 1;
        const request = JSON.parse(stdin);
        return {
          exit_code: 0,
          signal: null,
          stderr: '',
          stdout: JSON.stringify(tesseractResponse(request, {
            text: calls === 1 ? 'first output' : 'different output',
          })),
        };
      },
    }),
    /LOCAL_EXTRACTOR_NONDETERMINISTIC_OUTPUT/,
  );

  assert.equal(calls, 2);
});

test('local runtime contract remains benchmark-only and non-authoritative', () => {
  assert.equal(structuredExtractorLocalBenchmarkRuntime.mode, 'explicit_local_benchmark_only');
  assert.deepEqual(structuredExtractorLocalBenchmarkRuntime.candidates, ['docling', 'tesseract']);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.local_only, true);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.offline_execution_required, true);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.remote_processing_allowed, false);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.automatic_indexing_allowed, false);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.persistence_allowed, false);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.production_route_allowed, false);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.filesystem_mutation_allowed, false);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.automatic_winner_selection_allowed, false);
  assert.equal(structuredExtractorLocalBenchmarkRuntime.shell_execution_allowed, false);
});
