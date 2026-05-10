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

export function mapSearchResult(file) {
  return {
    id: file.id,
    filename: file.filename,
    absolute_path: file.absolute_path,
    relative_path: file.relative_path,
    extension: file.extension,
    mime_type: file.mime_type,
    size_bytes: file.size_bytes,
    modified_at: file.modified_at,
    index_status: file.index_status,
    extraction_status: file.extraction_status || null,
    extraction_error_message: file.extraction_error_message || null,
    snippet: file.snippet || null,
    recovery_status: file.recovery_status || 'active',
    source_reference: toSourceReference(file),
  };
}

export function mapSearchResults(files = []) {
  return files.map((file) => mapSearchResult(file));
}
