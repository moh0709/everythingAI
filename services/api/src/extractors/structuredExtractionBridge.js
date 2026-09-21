import crypto from 'node:crypto';
import { normalizeStructuredDocumentExtraction } from './structuredDocumentContract.js';

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
}

function textHash(value) {
  return crypto.createHash('sha256').update(normalizeText(value)).digest('hex');
}

function sameFingerprint(left, right) {
  return left?.hash === right?.hash
    && left?.size_bytes === right?.size_bytes
    && left?.mtime_ms === right?.mtime_ms;
}

export function projectStructuredExtractionToLegacy(structuredExtraction) {
  const structured = normalizeStructuredDocumentExtraction(structuredExtraction);
  if (structured.status !== 'complete') throw new Error('STRUCTURED_EXTRACTION_NOT_COMPLETE');

  const metadata = {
    structured_shadow_projection: true,
    schema_version: structured.schema_version,
    extraction_mode: structured.extraction_mode,
    page_count: structured.pages.length,
    block_count: structured.blocks.length,
    table_count: structured.tables.length,
    figure_count: structured.figures.length,
    warning_count: structured.warnings.length,
    source_fingerprint_hash: structured.source_fingerprint.hash,
  };

  return Object.freeze({
    file_id: structured.file_id,
    extracted_text: structured.plain_text,
    extraction_status: 'extracted',
    extractor_name: `structured:${structured.extractor.id}@${structured.extractor.version}`,
    extracted_at: structured.extracted_at,
    error_message: null,
    metadata_json: JSON.stringify(metadata),
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export function createStructuredExtractionShadowPreview({
  file,
  legacy_extraction: legacyExtraction,
  structured_extraction: structuredExtraction,
  expected_source_fingerprint: expectedFingerprint,
} = {}) {
  if (!file || typeof file !== 'object') throw new Error('SHADOW_FILE_REQUIRED');
  if (!legacyExtraction || typeof legacyExtraction !== 'object') throw new Error('LEGACY_EXTRACTION_REQUIRED');

  const structured = normalizeStructuredDocumentExtraction(structuredExtraction);
  if (structured.status !== 'complete') throw new Error('STRUCTURED_EXTRACTION_NOT_COMPLETE');
  if (structured.file_id !== file.id || structured.source_path !== file.absolute_path) {
    throw new Error('STRUCTURED_SHADOW_FILE_MISMATCH');
  }
  if (expectedFingerprint && !sameFingerprint(structured.source_fingerprint, expectedFingerprint)) {
    throw new Error('STRUCTURED_SHADOW_FINGERPRINT_MISMATCH');
  }

  const projection = projectStructuredExtractionToLegacy(structured);
  const legacyText = normalizeText(legacyExtraction.extracted_text);
  const structuredText = normalizeText(projection.extracted_text);

  return Object.freeze({
    status: 'compared',
    mode: 'shadow_preview',
    file_id: file.id,
    source_path: file.absolute_path,
    legacy_extractor: legacyExtraction.extractor_name ?? null,
    structured_extractor: Object.freeze({
      id: structured.extractor.id,
      version: structured.extractor.version,
      extraction_mode: structured.extraction_mode,
    }),
    legacy_text_sha256: textHash(legacyText),
    structured_text_sha256: textHash(structuredText),
    same_text: legacyText === structuredText,
    legacy_character_count: legacyText.length,
    structured_character_count: structuredText.length,
    character_count_delta: structuredText.length - legacyText.length,
    evidence_counts: Object.freeze({
      pages: structured.pages.length,
      blocks: structured.blocks.length,
      tables: structured.tables.length,
      figures: structured.figures.length,
      warnings: structured.warnings.length,
    }),
    source_fingerprint_hash: structured.source_fingerprint.hash,
    persisted: false,
    authoritative: false,
    provider_fallback_allowed: false,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export const structuredExtractionBridge = Object.freeze({
  mode: 'shadow_preview',
  legacy_persistence_authoritative: true,
  structured_persistence_enabled: false,
  provider_fallback_allowed: false,
  model_execution_required: false,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
