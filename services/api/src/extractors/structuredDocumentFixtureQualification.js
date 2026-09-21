import crypto from 'node:crypto';
import { normalizeStructuredDocumentExtraction } from './structuredDocumentContract.js';
import { projectStructuredExtractionToLegacy } from './structuredExtractionShadowBridge.js';

function stableDigest(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 24);
}

function normalizeFixtureEntry(entry, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`INVALID_STRUCTURED_FIXTURE_ENTRY:${index}`);
  }

  const name = typeof entry.name === 'string' && entry.name.trim()
    ? entry.name.trim()
    : `fixture-${index + 1}`;

  return { name, document: entry.document };
}

export function qualifyStructuredDocumentFixtures(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('STRUCTURED_FIXTURES_REQUIRED');
  }

  const results = entries.map((entry, index) => {
    const fixture = normalizeFixtureEntry(entry, index);

    try {
      const normalized = normalizeStructuredDocumentExtraction(fixture.document);
      const compatibility = projectStructuredExtractionToLegacy(normalized);

      return Object.freeze({
        name: fixture.name,
        status: 'pass',
        file_id: normalized.file_id,
        extraction_mode: normalized.extraction_mode,
        page_count: normalized.pages.length,
        block_count: normalized.blocks.length,
        table_count: normalized.tables.length,
        figure_count: normalized.figures.length,
        warning_count: normalized.warnings.length,
        plain_text_character_count: compatibility.extracted_text.length,
        source_fingerprint_hash: normalized.source_fingerprint.hash,
        extractor_id: normalized.extractor.id,
        extractor_version: normalized.extractor.version,
        extractor_local: normalized.extractor.local,
        compatibility_extractor_name: compatibility.extractor_name,
      });
    } catch (error) {
      return Object.freeze({
        name: fixture.name,
        status: 'fail',
        error_code: error?.message || 'UNKNOWN_STRUCTURED_FIXTURE_ERROR',
      });
    }
  });

  const passed = results.filter((entry) => entry.status === 'pass');
  const failed = results.filter((entry) => entry.status === 'fail');
  const modes = [...new Set(passed.map((entry) => entry.extraction_mode))].sort();

  const aggregate = Object.freeze({
    fixture_count: results.length,
    passed_count: passed.length,
    failed_count: failed.length,
    extraction_modes: Object.freeze(modes),
    total_pages: passed.reduce((sum, entry) => sum + entry.page_count, 0),
    total_blocks: passed.reduce((sum, entry) => sum + entry.block_count, 0),
    total_tables: passed.reduce((sum, entry) => sum + entry.table_count, 0),
    total_figures: passed.reduce((sum, entry) => sum + entry.figure_count, 0),
    total_warnings: passed.reduce((sum, entry) => sum + entry.warning_count, 0),
    total_plain_text_characters: passed.reduce((sum, entry) => sum + entry.plain_text_character_count, 0),
  });

  const digestContract = {
    results: results.map((entry) => ({ ...entry })),
    aggregate: { ...aggregate, extraction_modes: [...aggregate.extraction_modes] },
  };

  return Object.freeze({
    status: failed.length === 0 ? 'pass' : 'fail',
    qualification_digest: `structured_qualification_${stableDigest(digestContract)}`,
    aggregate,
    results: Object.freeze(results),
    provider_neutral: true,
    model_execution_required: false,
    adapter_transport_invoked: false,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export const structuredDocumentFixtureQualification = Object.freeze({
  mode: 'static_fixture_qualification',
  provider_neutral: true,
  model_execution_required: false,
  adapter_transport_invoked: false,
  reads_static_fixtures_only: true,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
