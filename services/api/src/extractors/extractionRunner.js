import { listFilesForExtraction, upsertFileExtraction } from '../db/client.js';
import { extractDocument } from './documentExtractor.js';

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

export async function extractIndexedFiles(db, {
  fileId,
  limit = 1000,
  force = false,
  logger = console,
} = {}) {
  const files = listFilesForExtraction(db, { fileId, limit });
  const counters = {
    total: files.length,
    extracted: 0,
    failed: 0,
    unsupported: 0,
    skipped_unchanged: 0,
  };
  const failedItems = [];
  const unsupportedItems = [];
  const skippedItems = [];

  for (const file of files) {
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
  }

  return {
    ...counters,
    failedItems,
    unsupportedItems,
    skippedItems,
    diagnostics: {
      failedItems,
      unsupportedItems,
      skippedItems,
    },
  };
}
