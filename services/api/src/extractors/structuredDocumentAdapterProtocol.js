import crypto from 'node:crypto';
import { normalizeStructuredDocumentExtraction } from './structuredDocumentContract.js';

const PROTOCOL_VERSION = '1.0';
const OPERATION = 'extract_structured_document';
const SENSITIVE_KEY = /(api[_-]?key|token|secret|password|cookie|authorization|credential)/i;
const SECRET_URL = /(?:[?&](?:token|key|api_key|secret|password)=)|(?:https?:\/\/[^\s/@:]+:[^\s/@]+@)/i;

function requireString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function assertSafeValue(value, path = 'structured_adapter') {
  if (typeof value === 'string' && SECRET_URL.test(value)) {
    throw new Error(`SECRET_BEARING_VALUE_FORBIDDEN:${path}`);
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      throw new Error(`SENSITIVE_FIELD_FORBIDDEN:${path}.${key}`);
    }
    assertSafeValue(child, `${path}.${key}`);
  }
}

function normalizeFingerprint(value) {
  const hash = requireString(value?.hash, 'STRUCTURED_ADAPTER_FINGERPRINT_REQUIRED');
  const sizeBytes = value?.size_bytes;
  const mtimeMs = value?.mtime_ms;

  if (!Number.isInteger(sizeBytes) || sizeBytes < 0 || !Number.isFinite(mtimeMs)) {
    throw new Error('INVALID_STRUCTURED_ADAPTER_FINGERPRINT');
  }

  return Object.freeze({ hash, size_bytes: sizeBytes, mtime_ms: mtimeMs });
}

function normalizeAdapter(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('STRUCTURED_ADAPTER_IDENTITY_REQUIRED');
  }

  return Object.freeze({
    id: requireString(value.id, 'STRUCTURED_ADAPTER_ID_REQUIRED'),
    version: requireString(value.version, 'STRUCTURED_ADAPTER_VERSION_REQUIRED'),
  });
}

function normalizeFile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('STRUCTURED_ADAPTER_FILE_REQUIRED');
  }

  return Object.freeze({
    file_id: requireString(value.file_id, 'STRUCTURED_ADAPTER_FILE_ID_REQUIRED'),
    source_path: requireString(value.source_path, 'STRUCTURED_ADAPTER_SOURCE_PATH_REQUIRED'),
    mime_type: value.mime_type == null ? null : requireString(value.mime_type, 'INVALID_STRUCTURED_ADAPTER_MIME_TYPE'),
    source_fingerprint: normalizeFingerprint(value.source_fingerprint),
  });
}

function stableRequestId(contract) {
  const digest = crypto.createHash('sha256')
    .update(JSON.stringify(contract))
    .digest('hex')
    .slice(0, 24);
  return `structured_request_${digest}`;
}

function assertNoAuthorityExpansion(value = {}) {
  if (
    value.remote_processing_allowed === true
    || value.read_only === false
    || value.local_only === false
    || value.filesystem_mutation_allowed === true
    || value.execution_allowed === true
    || value.automatic_approval_allowed === true
  ) {
    throw new Error('STRUCTURED_ADAPTER_AUTHORITY_FORBIDDEN');
  }
}

function assertRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new Error('STRUCTURED_ADAPTER_REQUEST_REQUIRED');
  }
  if (request.protocol_version !== PROTOCOL_VERSION || request.operation !== OPERATION) {
    throw new Error('STRUCTURED_ADAPTER_PROTOCOL_MISMATCH');
  }
  assertNoAuthorityExpansion(request);
  if (
    request.local_only !== true
    || request.remote_processing_allowed !== false
    || request.read_only !== true
    || request.filesystem_mutation_allowed !== false
    || request.execution_allowed !== false
    || request.automatic_approval_allowed !== false
  ) {
    throw new Error('STRUCTURED_ADAPTER_AUTHORITY_FORBIDDEN');
  }
  assertSafeValue(request);
  return request;
}

export function createStructuredAdapterRequest(input = {}) {
  assertNoAuthorityExpansion(input);
  assertSafeValue(input);

  const adapter = normalizeAdapter(input.adapter);
  const file = normalizeFile(input.file);

  const stableContract = {
    protocol_version: PROTOCOL_VERSION,
    operation: OPERATION,
    adapter,
    file,
    local_only: true,
    remote_processing_allowed: false,
    read_only: true,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  };

  return Object.freeze({
    request_id: stableRequestId(stableContract),
    ...stableContract,
  });
}

function sameFingerprint(left, right) {
  return left?.hash === right?.hash
    && left?.size_bytes === right?.size_bytes
    && left?.mtime_ms === right?.mtime_ms;
}

export function validateStructuredAdapterResponse({ request: inputRequest, response } = {}) {
  const request = assertRequest(inputRequest);

  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('STRUCTURED_ADAPTER_RESPONSE_REQUIRED');
  }
  assertSafeValue(response, 'structured_adapter_response');

  if (response.protocol_version !== PROTOCOL_VERSION) {
    throw new Error('STRUCTURED_ADAPTER_PROTOCOL_MISMATCH');
  }
  if (response.request_id !== request.request_id) {
    throw new Error('STRUCTURED_ADAPTER_REQUEST_MISMATCH');
  }

  const responseAdapter = normalizeAdapter(response.adapter);
  if (
    responseAdapter.id !== request.adapter.id
    || responseAdapter.version !== request.adapter.version
  ) {
    throw new Error('STRUCTURED_ADAPTER_IDENTITY_MISMATCH');
  }

  if (response.status === 'error') {
    const code = requireString(response.error?.code, 'STRUCTURED_ADAPTER_ERROR_CODE_REQUIRED');
    const message = requireString(response.error?.message, 'STRUCTURED_ADAPTER_ERROR_MESSAGE_REQUIRED');
    const error = new Error(`STRUCTURED_ADAPTER_ERROR:${code}`);
    error.adapter_code = code;
    error.adapter_message = message;
    throw error;
  }

  if (response.status !== 'ok') {
    throw new Error('INVALID_STRUCTURED_ADAPTER_STATUS');
  }

  const extraction = normalizeStructuredDocumentExtraction(response.extraction);

  if (extraction.file_id !== request.file.file_id || extraction.source_path !== request.file.source_path) {
    throw new Error('STRUCTURED_ADAPTER_FILE_MISMATCH');
  }
  if (!sameFingerprint(extraction.source_fingerprint, request.file.source_fingerprint)) {
    throw new Error('STRUCTURED_ADAPTER_FINGERPRINT_MISMATCH');
  }
  if (
    extraction.extractor.id !== request.adapter.id
    || extraction.extractor.version !== request.adapter.version
    || extraction.extractor.local !== true
  ) {
    throw new Error('STRUCTURED_ADAPTER_IDENTITY_MISMATCH');
  }

  return Object.freeze({
    protocol_version: PROTOCOL_VERSION,
    request_id: request.request_id,
    status: 'ok',
    adapter: responseAdapter,
    extraction,
  });
}

export async function runStructuredAdapter({
  request: inputRequest,
  invoke,
  timeout_ms: timeoutMs = 30_000,
} = {}) {
  const request = assertRequest(inputRequest);
  if (typeof invoke !== 'function') throw new Error('STRUCTURED_ADAPTER_TRANSPORT_REQUIRED');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('INVALID_STRUCTURED_ADAPTER_TIMEOUT');

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('STRUCTURED_ADAPTER_TIMEOUT')), timeoutMs);
  });

  try {
    let response;
    try {
      response = await Promise.race([
        Promise.resolve().then(() => invoke(request)),
        timeout,
      ]);
    } catch (error) {
      if (error?.message === 'STRUCTURED_ADAPTER_TIMEOUT') throw error;
      const wrapped = new Error('STRUCTURED_ADAPTER_TRANSPORT_ERROR');
      wrapped.cause = error;
      throw wrapped;
    }

    return validateStructuredAdapterResponse({ request, response });
  } finally {
    clearTimeout(timer);
  }
}

export const structuredDocumentAdapterProtocol = Object.freeze({
  protocol_version: PROTOCOL_VERSION,
  operation: OPERATION,
  transport: 'injected_local',
  provider_neutral: true,
  local_only: true,
  remote_processing_allowed: false,
  read_only: true,
  hidden_fallback_allowed: false,
  child_process_spawn_enabled: false,
  model_execution_required: false,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
