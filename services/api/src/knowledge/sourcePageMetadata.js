export function parseExtractionMetadata(metadataJson) {
  if (!metadataJson) return {};
  try {
    return JSON.parse(metadataJson);
  } catch {
    return {};
  }
}

export function pageForCharRange(pageMap = [], charStart, charEnd) {
  if (!Array.isArray(pageMap) || pageMap.length === 0) return null;
  if (!Number.isFinite(charStart)) return null;

  const normalizedEnd = Number.isFinite(charEnd) ? charEnd : charStart;
  const direct = pageMap.find((page) => (
    Number.isFinite(page.char_start)
    && Number.isFinite(page.char_end)
    && charStart >= page.char_start
    && charStart <= page.char_end
  ));

  if (direct) return direct.page_number || null;

  const overlapping = pageMap.find((page) => (
    Number.isFinite(page.char_start)
    && Number.isFinite(page.char_end)
    && normalizedEnd >= page.char_start
    && charStart <= page.char_end
  ));

  return overlapping?.page_number || null;
}

export function enrichChunksWithPageMetadata(chunks = [], extractionRecord = {}) {
  const metadata = parseExtractionMetadata(extractionRecord.metadata_json);
  const pageMap = metadata.page_map || metadata.pages || [];

  return chunks.map((chunk) => {
    const pageNumber = pageForCharRange(pageMap, chunk.char_start, chunk.char_end);
    if (!pageNumber) return chunk;

    return {
      ...chunk,
      page_number: pageNumber,
      location: `page ${pageNumber}, ${chunk.location}`,
    };
  });
}
