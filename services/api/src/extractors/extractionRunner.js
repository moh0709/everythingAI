import fs from 'node:fs/promises';
import { listFilesForExtraction, markIndexedFileFailed, upsertFileExtraction } from '../db/client.js';
import { extractDocument } from './documentExtractor.js';
import { runStructuredExtractionShadow } from './structuredExtractionShadowBridge.js';

const MAX_DIAGNOSTIC_ITEMS = 100;

function pushDiagnostic(list, item) {
  if (list.length < MAX_DIAGNOSTIC_ITEMS) list.push(item);
}

function shouldSkipExistingExtraction(file, { force = false } = {}) {
  if (force) return false;
  if (!file.extraction_status || file.extraction_status === 'failed') return false;
  if (!file.extracted_at) return false;
  if (!file.modified_at) return false;

  return new Date(file.extracted_at).getTime() >= new Date(file.modified_at).getTime();
}

function createDiagnosticItem(file, extra = {}) {
  return {
    fileId: file.id,
    filename: file.filename,
    absolutePath: file.absolute_path,
    extension: file.extension,
    ...extra,
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function extractIndexedFiles(db, {
  fileId,
  limit = 1000,
  force = false,
  logger = console,
  structuredShadow = null,
} = {}) {
  const files = listFilesForExtraction(db, { fileId, limit });
  const counters = {
    total: files.length,
    extracted: 0,
    failed: 0,
    stale_missing: 0,
    unsupported: 0,
    skipped_unchanged: 0,
    structured_shadow_checked: 0,
    structured_shadow_matches: 0,
    structured_shadow_differences: 0,
    structured_shadow_failed: 0,
  };
  const failedItems = [];
  const staleMissingItems = [];
  const unsupportedItems = [];
  const skippedItems = [];
  const structuredShadowItems = [];

  for (const file of files) {
    if (!(await fileExists(file.absolute_path))) {
      const message = `Indexed file no longer exists on disk: ${file.absolute_path}`;
      markIndexedFileFailed(db, {
        fileId: file.id,
        errorMessage: message,
      });
      counters.stale_missing += 1;
      logger.error(message);
      pushDiagnostic(staleMissingItems, createDiagnosticItem(file, {
        reason: 'missing_on_disk',
        message,
      }));
      continue;
    }

    if (shouldSkipExistingExtraction(file, { force })) {
      counters.skipped_unchanged += 1;
      pushDiagnostic(skippedItems, createDiagnosticItem(file, {
        reason: 'unchanged',
        message: 'Existing extraction is newer than or equal to the file modified timestamp.',
      }));
      continue;
    }

    const result = await extractDocument(file);
    upsertFileExtraction(db, result);

    if (result.extraction_status === 'extracted') counters.extracted += 1;
    if (result.extraction_status === 'failed') {
      counters.failed += 1;
      logger.error(`Failed to extract ${file.absolute_path}: ${result.error_message}`);
      pushDiagnostic(failedItems, createDiagnosticItem(file, {
        message: result.error_message,
        extractorName: result.extractor_name,
      }));
    }
    if (result.extraction_status === 'unsupported') {
      counters.unsupported += 1;
      pushDiagnostic(unsupportedItems, createDiagnosticItem(file, {
        message: result.error_message,
        extractorName: result.extractor_name,
      }));
    }

    if (structuredShadow && result.extraction_status === 'extracted') {
      counters.structured_shadow_checked += 1;
      try {
        const shadow = await runStructuredExtractionShadow({
          file,
          legacy_result: result,
          adapter: structuredShadow.adapter,
          invoke: structuredShadow.invoke,
          timeout_ms: structuredShadow.timeout_ms,
        });

        if (shadow.status === 'match') counters.structured_shadow_matches += 1;
        if (shadow.status === 'different') counters.structured_shadow_differences += 1;

        pushDiagnostic(structuredShadowItems, createDiagnosticItem(file, {
          shadowStatus: shadow.status,
          requestId: shadow.request_id,
          legacyExtractorName: shadow.legacy_extractor_name,
          structuredExtractorName: shadow.structured_extractor_name,
          legacyCharacterCount: shadow.legacy_character_count,
          structuredCharacterCount: shadow.structured_character_count,
          extractionMode: shadow.extraction_mode,
          warningCount: shadow.warning_count,
        }));
      } catch (error) {
        counters.structured_shadow_failed += 1;
        pushDiagnostic(structuredShadowItems, createDiagnosticItem(file, {
          shadowStatus: 'failed',
          message: error?.message || 'Structured shadow extraction failed.',
        }));
        logger.error(`Structured shadow extraction failed for ${file.absolute_path}: ${error?.message || error}`);
      }
    }
  }

  return {
    ...counters,
    failedItems,
    staleMissingItems,
    unsupportedItems,
    skippedItems,
    structuredShadowItems,
    diagnostics: {
      failedItems,
      staleMissingItems,
      unsupportedItems,
      skippedItems,
      structuredShadowItems,
    },
  };
}
