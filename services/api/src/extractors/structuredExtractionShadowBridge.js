import {
  createStructuredAdapterRequest,
  runStructuredAdapter,
} from './structuredDocumentAdapterProtocol.js';
import { normalizeStructuredDocumentExtraction } from './structuredDocumentContract.js';

function normalizeLegacyText(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
}

export function createIndexedFileSourceFingerprint(file = {}) {
  const hash = typeof file.content_hash === 'string' ? file.content_hash.trim() : '';
  const sizeBytes = file.size_bytes;
  const modifiedAt = typeof file.modified_at === 'string' ? file.modified_at.trim() : '';
  const mtimeMs = modifiedAt ? new Date(modifiedAt).getTime() : Number.NaN;

  if (!hash || !Number.isInteger(sizeBytes) || sizeBytes < 0 || !Number.isFinite(mtimeMs)) {
    throw new Error('STRUCTURED_SHADOW_SOURCE_FINGERPRINT_UNAVAILABLE');
  }

  return Object.freeze({
    hash,
    size_bytes: sizeBytes,
    mtime_ms: mtimeMs,
  });
}

export function projectStructuredExtractionToLegacy(input = {}) {
  const extraction = normalizeStructuredDocumentExtraction(input);

  return Object.freeze({
    extracted_text: normalizeLegacyText(extraction.plain_text),
    extractor_name: `structured-shadow:${extraction.extractor.id}@${extraction.extractor.version}`,
    metadata: Object.freeze({
      schema_version: extraction.schema_version,
      extraction_mode: extraction.extraction_mode,
      page_count: extraction.pages.length,
      block_count: extraction.blocks.length,
      table_count: extraction.tables.length,
      figure_count: extraction.figures.length,
      warning_count: extraction.warnings.length,
      source_fingerprint_hash: extraction.source_fingerprint.hash,
    }),
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export async function runStructuredExtractionShadow({
  file,
  legacy_result: legacyResult,
  adapter,
  invoke,
  timeout_ms: timeoutMs = 30_000,
} = {}) {
  if (!legacyResult || legacyResult.extraction_status !== 'extracted') {
    return Object.freeze({
      status: 'skipped',
      reason: 'legacy_extraction_not_extracted',
      filesystem_mutation_allowed: false,
      execution_allowed: false,
      automatic_approval_allowed: false,
    });
  }

  const sourceFingerprint = createIndexedFileSourceFingerprint(file);
  const request = createStructuredAdapterRequest({
    adapter,
    file: {
      file_id: file.id,
      source_path: file.absolute_path,
      mime_type: file.mime_type ?? null,
      source_fingerprint: sourceFingerprint,
    },
  });

  const validated = await runStructuredAdapter({
    request,
    invoke,
    timeout_ms: timeoutMs,
  });

  const projection = projectStructuredExtractionToLegacy(validated.extraction);
  const legacyText = normalizeLegacyText(legacyResult.extracted_text);
  const structuredText = projection.extracted_text;
  const matches = legacyText === structuredText;

  return Object.freeze({
    status: matches ? 'match' : 'different',
    request_id: request.request_id,
    file_id: file.id,
    source_fingerprint_hash: sourceFingerprint.hash,
    legacy_extractor_name: legacyResult.extractor_name,
    structured_extractor_name: projection.extractor_name,
    legacy_character_count: legacyText.length,
    structured_character_count: structuredText.length,
    extraction_mode: projection.metadata.extraction_mode,
    warning_count: projection.metadata.warning_count,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export const structuredExtractionShadowBridge = Object.freeze({
  mode: 'shadow_preview',
  legacy_persistence_authoritative: true,
  structured_persistence_allowed: false,
  search_index_replacement_allowed: false,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
