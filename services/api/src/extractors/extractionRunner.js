import fs from 'node:fs/promises';
import { listFilesForExtraction, markIndexedFileFailed, upsertFileExtraction } from '../db/client.js';
import { extractDocument } from './documentExtractor.js';
import { createStructuredExtractionShadowPreview } from './structuredExtractionBridge.js';

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

export async function runStructuredPreviewShadow({ file, legacyResult, structuredPreview } = {}) {
  if (typeof structuredPreview !== 'function' || legacyResult?.extraction_status !== 'extracted') {
    return { status: 'not_run', mode: 'shadow_preview' };
  }

  try {
    const structuredExtraction = await structuredPreview({
      file: Object.freeze({ ...file }),
      legacy_extraction: Object.freeze({ ...legacyResult }),
    });
    return createStructuredExtractionShadowPreview({
      file,
      legacy_extraction: legacyResult,
      structured_extraction: structuredExtraction,
      expected_source_fingerprint: file?.source_fingerprint ?? null,
    });
  } catch (error) {
    return Object.freeze({
      status: 'failed',
      mode: 'shadow_preview',
      error_code: 'STRUCTURED_SHADOW_PREVIEW_FAILED',
      message: error instanceof Error ? error.message : String(error),
      persisted: false,
      authoritative: false,
    });
  }
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
  structuredPreview,
} = {}) {
  const files = listFilesForExtraction(db, { fileId, limit });
  const counters = {
    total: files.length,
    extracted: 0,
    failed: 0,
    stale_missing: 0,
    unsupported: 0,
    skipped_unchanged: 0,
    structured_previewed: 0,
    structured_preview_failed: 0,
  };
  const failedItems = [];
  const staleMissingItems = [];
  const unsupportedItems = [];
  const skippedItems = [];
  const structuredPreviewItems = [];

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

    const structuredShadow = await runStructuredPreviewShadow({
      file,
      legacyResult: result,
      structuredPreview,
    });
    if (structuredShadow.status === 'compared') {
      counters.structured_previewed += 1;
      pushDiagnostic(structuredPreviewItems, createDiagnosticItem(file, structuredShadow));
    } else if (structuredShadow.status === 'failed') {
      counters.structured_preview_failed += 1;
      pushDiagnostic(structuredPreviewItems, createDiagnosticItem(file, structuredShadow));
    }

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
  }

  return {
    ...counters,
    failedItems,
    staleMissingItems,
    unsupportedItems,
    skippedItems,
    structuredPreviewItems,
    diagnostics: {
      failedItems,
      staleMissingItems,
      unsupportedItems,
      skippedItems,
      structuredPreviewItems,
    },
  };
}
