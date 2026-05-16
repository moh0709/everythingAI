import { listPersistedWikiPages } from './wikiRepository.js';

export function deletePersistedWikiPages(db, pageIds = []) {
  if (!pageIds.length) return;

  const placeholders = pageIds.map(() => '?').join(',');

  db.prepare(`
    DELETE FROM wiki_page_relations
    WHERE page_id IN (${placeholders})
  `).run(...pageIds);

  db.prepare(`
    DELETE FROM wiki_source_chunks
    WHERE page_id IN (${placeholders})
  `).run(...pageIds);

  db.prepare(`
    DELETE FROM wiki_page_sources
    WHERE page_id IN (${placeholders})
  `).run(...pageIds);

  db.prepare(`
    DELETE FROM wiki_pages
    WHERE id IN (${placeholders})
  `).run(...pageIds);
}

function safeJson(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function sourceRecordId(pageId, sourceRef) {
  return `${pageId}:${sourceRef}`;
}

function chunkRecordId(pageId, chunkRef) {
  return `${pageId}:${chunkRef}`;
}

function relationRecordId(pageId, relatedPage, index) {
  return `${pageId}:${relatedPage.id || relatedPage.slug || relatedPage.title || index}`;
}

export function replacePersistedWikiPages(
  db,
  pages = [],
  generatedAt = new Date().toISOString()
) {
  const pageIds = pages.map((page) => page.id);

  const insertPage = db.prepare(`
    INSERT INTO wiki_pages (
      id,
      slug,
      title,
      page_type,
      category,
      subcategory,
      summary,
      markdown,
      source_file_ids_json,
      related_topics_json,
      generated_at,
      updated_at
    ) VALUES (
      @id,
      @slug,
      @title,
      @page_type,
      @category,
      @subcategory,
      @summary,
      @markdown,
      @source_file_ids_json,
      @related_topics_json,
      @generated_at,
      @updated_at
    )
  `);

  const insertSource = db.prepare(`
    INSERT INTO wiki_page_sources (
      id,
      page_id,
      ref,
      file_id,
      filename,
      absolute_path,
      relative_path,
      location,
      evidence
    ) VALUES (
      @id,
      @page_id,
      @ref,
      @file_id,
      @filename,
      @absolute_path,
      @relative_path,
      @location,
      @evidence
    )
  `);

  const insertChunk = db.prepare(`
    INSERT INTO wiki_source_chunks (
      id,
      page_id,
      source_ref,
      ref,
      file_id,
      chunk_number,
      line_start,
      line_end,
      char_start,
      char_end,
      location,
      heading,
      text,
      evidence
    ) VALUES (
      @id,
      @page_id,
      @source_ref,
      @ref,
      @file_id,
      @chunk_number,
      @line_start,
      @line_end,
      @char_start,
      @char_end,
      @location,
      @heading,
      @text,
      @evidence
    )
  `);

  const insertRelation = db.prepare(`
    INSERT INTO wiki_page_relations (
      id,
      page_id,
      related_page_id,
      title,
      slug
    ) VALUES (
      @id,
      @page_id,
      @related_page_id,
      @title,
      @slug
    )
  `);

  const transaction = db.transaction(() => {
    deletePersistedWikiPages(db, pageIds);

    for (const page of pages) {
      insertPage.run({
        id: page.id,
        slug: page.slug,
        title: page.title,
        page_type: page.page_type,
        category: page.category || null,
        subcategory: page.subcategory || null,
        summary: page.summary || '',
        markdown: page.markdown || '',
        source_file_ids_json: safeJson(page.source_file_ids, []),
        related_topics_json: safeJson(page.related_topics, []),
        generated_at: generatedAt,
        updated_at: page.updated_at || generatedAt,
      });

      for (const source of page.sources || []) {
        insertSource.run({
          id: sourceRecordId(page.id, source.ref),
          page_id: page.id,
          ref: source.ref,
          file_id: source.file_id || null,
          filename: source.filename || null,
          absolute_path: source.absolute_path || null,
          relative_path: source.relative_path || null,
          location: source.location || null,
          evidence: source.evidence || null,
        });

        for (const chunk of source.chunks || []) {
          insertChunk.run({
            id: chunkRecordId(page.id, chunk.ref),
            page_id: page.id,
            source_ref: chunk.source_ref || source.ref,
            ref: chunk.ref,
            file_id: source.file_id || null,
            chunk_number: chunk.chunk_number || null,
            line_start: chunk.line_start || null,
            line_end: chunk.line_end || null,
            char_start: chunk.char_start || null,
            char_end: chunk.char_end || null,
            location: chunk.location || null,
            heading: chunk.heading ? 1 : 0,
            text: chunk.text || '',
            evidence: chunk.evidence || '',
          });
        }
      }

      (page.related_pages || []).forEach((relatedPage, index) => {
        insertRelation.run({
          id: relationRecordId(page.id, relatedPage, index),
          page_id: page.id,
          related_page_id: relatedPage.id || null,
          title: relatedPage.title || relatedPage.slug || relatedPage.id || 'Related Page',
          slug: relatedPage.slug || null,
        });
      });
    }
  });

  transaction();

  return listPersistedWikiPages(db);
}
