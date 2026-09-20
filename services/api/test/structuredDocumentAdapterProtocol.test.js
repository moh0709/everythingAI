import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  createStructuredAdapterRequest,
  runStructuredAdapter,
  validateStructuredAdapterResponse,
} from '../src/extractors/structuredDocumentAdapterProtocol.js';

function extractionFixture() {
  return JSON.parse(fs.readFileSync(
    path.resolve('test/fixtures/structured-document/native-text.json'),
    'utf8',
  ));
}

function requestInput(overrides = {}) {
  return {
    adapter: { id: 'fixture-adapter', version: '1.0.0' },
    file: {
      file_id: 'file-native-1',
      source_path: '/fixtures/native.pdf',
      mime_type: 'application/pdf',
      source_fingerprint: {
        hash: 'sha256:native-001',
        size_bytes: 1024,
        mtime_ms: 1000,
      },
    },
    ...overrides,
  };
}

function okResponse(request, overrides = {}) {
  const extraction = extractionFixture();
  extraction.extractor.id = request.adapter.id;
  extraction.extractor.version = request.adapter.version;

  return {
    protocol_version: '1.0',
    request_id: request.request_id,
    status: 'ok',
    adapter: { ...request.adapter },
    extraction,
    ...overrides,
  };
}

test('creates deterministic local-only read-only adapter request bound to source fingerprint', () => {
  const first = createStructuredAdapterRequest(requestInput());
  const second = createStructuredAdapterRequest(requestInput());

  assert.deepEqual(first, second);
  assert.match(first.request_id, /^structured_request_[a-f0-9]{24}$/);
  assert.equal(first.protocol_version, '1.0');
  assert.equal(first.operation, 'extract_structured_document');
  assert.equal(first.local_only, true);
  assert.equal(first.remote_processing_allowed, false);
  assert.equal(first.read_only, true);
  assert.equal(first.filesystem_mutation_allowed, false);
  assert.equal(first.execution_allowed, false);
  assert.equal(first.automatic_approval_allowed, false);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.file.source_fingerprint), true);
});

test('validates successful response through structured extraction contract', () => {
  const request = createStructuredAdapterRequest(requestInput());
  const validated = validateStructuredAdapterResponse({
    request,
    response: okResponse(request),
  });

  assert.equal(validated.status, 'ok');
  assert.equal(validated.request_id, request.request_id);
  assert.equal(validated.extraction.file_id, request.file.file_id);
  assert.equal(validated.extraction.source_fingerprint.hash, request.file.source_fingerprint.hash);
  assert.equal(validated.extraction.filesystem_mutation_allowed, false);
});

test('fails closed for request correlation, file identity, fingerprint, or adapter mismatch', () => {
  const request = createStructuredAdapterRequest(requestInput());

  assert.throws(
    () => validateStructuredAdapterResponse({
      request,
      response: okResponse(request, { request_id: 'wrong' }),
    }),
    /STRUCTURED_ADAPTER_REQUEST_MISMATCH/,
  );

  const wrongFile = okResponse(request);
  wrongFile.extraction.file_id = 'other-file';
  assert.throws(
    () => validateStructuredAdapterResponse({ request, response: wrongFile }),
    /STRUCTURED_ADAPTER_FILE_MISMATCH/,
  );

  const wrongFingerprint = okResponse(request);
  wrongFingerprint.extraction.source_fingerprint.hash = 'sha256:other';
  assert.throws(
    () => validateStructuredAdapterResponse({ request, response: wrongFingerprint }),
    /STRUCTURED_ADAPTER_FINGERPRINT_MISMATCH/,
  );

  const wrongAdapter = okResponse(request);
  wrongAdapter.adapter.id = 'other-adapter';
  assert.throws(
    () => validateStructuredAdapterResponse({ request, response: wrongAdapter }),
    /STRUCTURED_ADAPTER_IDENTITY_MISMATCH/,
  );
});

test('normalizes explicit adapter error without fallback', () => {
  const request = createStructuredAdapterRequest(requestInput());

  assert.throws(
    () => validateStructuredAdapterResponse({
      request,
      response: {
        protocol_version: '1.0',
        request_id: request.request_id,
        status: 'error',
        adapter: { ...request.adapter },
        error: {
          code: 'UNSUPPORTED_DOCUMENT',
          message: 'Fixture adapter declined the document.',
        },
      },
    }),
    /STRUCTURED_ADAPTER_ERROR:UNSUPPORTED_DOCUMENT/,
  );
});

test('runner invokes exactly one injected local transport and validates response', async () => {
  const request = createStructuredAdapterRequest(requestInput());
  let calls = 0;

  const result = await runStructuredAdapter({
    request,
    timeout_ms: 100,
    invoke: async (received) => {
      calls += 1;
      assert.equal(received.request_id, request.request_id);
      return okResponse(request);
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.status, 'ok');
  assert.equal(result.extraction.plain_text, 'Native document text.');
});

test('runner fails closed on timeout and does not invoke fallback transport', async () => {
  const request = createStructuredAdapterRequest(requestInput());
  let calls = 0;

  await assert.rejects(
    () => runStructuredAdapter({
      request,
      timeout_ms: 5,
      invoke: async () => {
        calls += 1;
        return new Promise(() => {});
      },
    }),
    /STRUCTURED_ADAPTER_TIMEOUT/,
  );

  assert.equal(calls, 1);
});

test('runner normalizes transport failure without exposing hidden provider fallback', async () => {
  const request = createStructuredAdapterRequest(requestInput());
  let calls = 0;

  await assert.rejects(
    () => runStructuredAdapter({
      request,
      timeout_ms: 100,
      invoke: async () => {
        calls += 1;
        throw new Error('transport crashed');
      },
    }),
    /STRUCTURED_ADAPTER_TRANSPORT_ERROR/,
  );

  assert.equal(calls, 1);
});

test('rejects secret-bearing request values and unsafe authority overrides', () => {
  assert.throws(
    () => createStructuredAdapterRequest(requestInput({
      file: {
        ...requestInput().file,
        source_path: 'https://example.test/file?token=secret',
      },
    })),
    /SECRET_BEARING_VALUE_FORBIDDEN/,
  );

  assert.throws(
    () => createStructuredAdapterRequest({
      ...requestInput(),
      remote_processing_allowed: true,
    }),
    /STRUCTURED_ADAPTER_AUTHORITY_FORBIDDEN/,
  );
});

test('rejects malformed protocol or unsafe response authority before accepting extraction', () => {
  const request = createStructuredAdapterRequest(requestInput());

  assert.throws(
    () => validateStructuredAdapterResponse({
      request,
      response: { ...okResponse(request), protocol_version: '2.0' },
    }),
    /STRUCTURED_ADAPTER_PROTOCOL_MISMATCH/,
  );

  const unsafe = okResponse(request);
  unsafe.extraction.execution_allowed = true;
  assert.throws(
    () => validateStructuredAdapterResponse({ request, response: unsafe }),
    /STRUCTURED_EXTRACTION_AUTHORITY_FORBIDDEN/,
  );
});
