import { listFilesForExtraction, upsertFileExtraction } from '../db/client.js';
import { extractDocument } from './documentExtractor.js';

export async function extractIndexedFiles(db, { fileId, limit = 1000, logger = console } = {}) {
  const files = listFilesForExtraction(db, { fileId, limit });
  const counters = {
    total: files.length,
    extracted: 0,
    failed: 0,
    unsupported: 0,
  };

  for (const file of files) {
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
