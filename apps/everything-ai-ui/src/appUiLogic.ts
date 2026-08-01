export type FileFilterState = {
  extension: string;
  indexStatus: string;
  extractionStatus: string;
};

export type PreviewSummary = {
  previewText: string;
  summary: string;
  classification: string;
  metadata: Record<string, unknown>;
};

type FileLike = {
  extension?: string | null;
  index_status?: string | null;
  extraction_status?: string | null;
  size_bytes?: number | null;
};

type SuggestionLike = {
  confidence?: number | string | null;
};

export const emptyFileFilters: FileFilterState = {
  extension: '',
  indexStatus: '',
  extractionStatus: '',
};

export function calculateAiConfidence(suggestions: SuggestionLike[]) {
  const confidenceValues = suggestions
    .map((suggestion) => Number(suggestion.confidence))
    .filter((value) => Number.isFinite(value) && value > 0);

  return confidenceValues.length
    ? `${Math.round((confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length) * 100)}%`
    : 'No plan yet';
}

export function filterFiles<T extends FileLike>(files: T[], filters: FileFilterState) {
  return files.filter((file) => {
    const extension = normalizeTag(file.extension || 'file');
    const indexStatus = normalizeTag(file.index_status || 'unknown');
    const extractionStatus = normalizeTag(file.extraction_status || 'unknown');

    return (!filters.extension || extension === filters.extension)
      && (!filters.indexStatus || indexStatus === filters.indexStatus)
      && (!filters.extractionStatus || extractionStatus === filters.extractionStatus);
  });
}

export function uniqueFileFilterValues(files: FileLike[], key: keyof FileLike) {
  return Array.from(new Set(files.map((file) => normalizeTag(file[key] || '')).filter(Boolean))).sort();
}

export function getFileTags(file: FileLike, preview?: Partial<PreviewSummary> | null) {
  const tags = [
    normalizeTag(file.extension || 'file'),
    normalizeTag(file.index_status || 'not indexed'),
    normalizeTag(file.extraction_status || 'not extracted'),
    normalizeTag(preview?.classification || ''),
  ].filter(Boolean);

  if ((file.size_bytes || 0) >= 10 * 1024 * 1024) {
    tags.push('large file');
  }

  return Array.from(new Set(tags));
}

export function normalizeFilePreview(payload: any): PreviewSummary {
  const source = payload?.preview || payload || {};
  const insight = source.insight || source.insights || {};

  return {
    previewText: String(source.previewText || source.preview_text || source.text || source.content || ''),
    summary: String(source.summary || insight.summary || source.insight_summary || ''),
    classification: String(source.classification || insight.classification || source.insight_classification || ''),
    metadata: source.metadata || source.fileMetadata || source.file_metadata || {},
  };
}

function normalizeTag(value: unknown) {
  return String(value || '').trim().toLowerCase();
}
