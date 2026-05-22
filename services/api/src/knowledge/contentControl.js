export const NO_SOURCE_CONTENT_MESSAGE = 'No source-backed extracted document content is available yet.';

export function hasSourceBackedContent(source = {}) {
  return Array.isArray(source.chunks) && source.chunks.some((chunk) => chunk.text?.trim());
}

export function sourceBackedSummary(source = {}, fallback = NO_SOURCE_CONTENT_MESSAGE) {
  const chunk = source.chunks?.find((item) => item.evidence?.trim() || item.text?.trim());
  if (!chunk) return fallback;
  return (chunk.evidence || chunk.text || '').replace(/\s+/g, ' ').trim().slice(0, 260);
}

export function filterSourceBackedSources(sources = []) {
  return sources.filter(hasSourceBackedContent);
}

export function controlledSourceContentSections(insights = [], sources = [], { maxDocuments = 6, maxChunks = 8 } = {}) {
  return insights.slice(0, maxDocuments).map((insight, index) => {
    const source = sources[index];
    const chunks = source?.chunks?.filter((chunk) => chunk.text?.trim()).slice(0, maxChunks) || [];

    return {
      insight,
      source,
      chunks,
      hasContent: chunks.length > 0,
    };
  });
}

export function contentControlMetadata({ sources = [], mode = 'strict' } = {}) {
  const sourceBackedSources = filterSourceBackedSources(sources);
  return {
    mode,
    source_count: sources.length,
    source_backed_source_count: sourceBackedSources.length,
    source_backed: sourceBackedSources.length > 0,
  };
}
