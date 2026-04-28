import { listFilesForExtraction, upsertFileExtraction } from '../db/client.js';
import { extractDocument } from './documentExtractor.js';

function shouldSkipExistingExtraction(file, { force = false } = {}) {
  if (force) return false;
  if (!file.extraction_status || file.extraction_status === 'failed') return false;
  if (!file.extracted_at) return false;
  if (!file.modified_at) return false;

  return new Date(file.extracted_at).getTime() >= new Date(file.modified_at).getTime();
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

  for (const file of files) {
    if (shouldSkipExistingExtraction(file, { force })) {
      counters.skipped_unchanged += 1;
      continue;
    }

    const result = await extractDocument(file);
    upsertFileExtraction(db, result);

    if (result.extraction_status === 'extracted') counters.extracted += 1;
    if (result.extraction_status === 'failed') {
      counters.failed += 1;
      logger.error(`Failed to extract ${file.absolute_path}: ${result.error_message}`);
    }
    if (result.extraction_status === 'unsupported') counters.unsupported += 1;
  }

  return counters;
}
