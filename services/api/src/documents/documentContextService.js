import { getIndexedFileById, listFileInsights } from '../db/client.js';
import { annotateTrashState } from '../recovery/trashVisibility.js';

function toSourceReference(file) {
  return {
    file_id: file.id,
    filename: file.filename,
    absolute_path: file.absolute_path,
    relative_path: file.relative_path,
    source_type: 'local_file',
    source_label: file.relative_path || file.filename,
  };
}

function mapContextFile(file) {
  return {
    id: file.id,
    filename: file.filename,
    absolute_path: file.absolute_path,
    relative_path: file.relative_path,
    extension: file.extension,
    mime_type: file.mime_type,
    size_bytes: file.size_bytes,
    created_at: file.created_at,
    modified_at: file.modified_at,
    content_hash: file.content_hash,
    index_status: file.index_status,
    index_error_message: file.error_message || null,
    last_indexed_at: file.last_indexed_at,
    extraction_status: file.extraction_status || null,
    extraction_error_message: file.extraction_error_message || null,
    extractor_name: file.extractor_name || null,
    extracted_at: file.extracted_at || null,
    recovery_status: file.recovery_status || 'active',
    source_reference: toSourceReference(file),
  };
}

export function createDocumentContext(db, { fileId, previewLimit = 5000 } = {}) {
  const file = getIndexedFileById(db, fileId);
  const annotatedFile = file ? annotateTrashState(db, [file])[0] : null;

  if (!annotatedFile) return null;

  const insights = listFileInsights(db, { fileId, limit: 1 });
  const previewText = (annotatedFile.extracted_text || '').slice(0, previewLimit);

  return {
    file: mapContextFile(annotatedFile),
    previewText,
    insight: insights[0] || null,
    source_reference: toSourceReference(annotatedFile),
  };
}
