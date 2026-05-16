function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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

export function ensureWikiPersistenceSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wiki_pages (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      page_type TEXT NOT NULL,
      category TEXT,
      subcategory TEXT,
      summary TEXT,
      markdown TEXT NOT NULL,
      source_file_ids_json TEXT NOT NULL DEFAULT '[]',
      related_topics_json TEXT NOT NULL DEFAULT '[]',
      generated_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug
      ON wiki_pages(slug);

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_type
      ON wiki_pages(page_type);

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_category
      ON wiki_pages(category);

    CREATE TABLE IF NOT EXISTS wiki_page_sources (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      ref TEXT NOT NULL,
      file_id TEXT,
      filename TEXT,
      absolute_path TEXT,
      relative_path TEXT,
      location TEXT,
      evidence TEXT,
      FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_page_sources_page_ref
      ON wiki_page_sources(page_id, ref);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_file_id
      ON wiki_page_sources(file_id);

    CREATE TABLE IF NOT EXISTS wiki_source_chunks (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      ref TEXT NOT NULL,
      file_id TEXT,
      chunk_number INTEGER,
      line_start INTEGER,
      line_end INTEGER,
      char_start INTEGER,
      char_end INTEGER,
      location TEXT,
      heading INTEGER NOT NULL DEFAULT 0,
      text TEXT,
      evidence TEXT,
      FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_source_chunks_page_ref
      ON wiki_source_chunks(page_id, ref);

    CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_source_ref
      ON wiki_source_chunks(page_id, source_ref);

    CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_file_id
      ON wiki_source_chunks(file_id);

    CREATE TABLE IF NOT EXISTS wiki_page_relations (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      related_page_id TEXT,
      title TEXT NOT NULL,
      slug TEXT,
      FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_page_id
      ON wiki_page_relations(page_id);
  `);
}

export function clearPersistedWiki(db) {
  ensureWikiPersistenceSchema(db);
  db.exec(`
    DELETE FROM wiki_page_relations;
    DELETE FROM wiki_source_chunks;
    DELETE FROM wiki_page_sources;
    DELETE FROM wiki_pages;
  `);
}

export function persistWikiPages(db, wiki) {
  ensureWikiPersistenceSchema(db);

  const generatedAt = wiki?.generated_at || new Date().toISOString();
  const pages = Array.isArray(wiki?.pages) ? wiki.pages : [];

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
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      page_type = excluded.page_type,
      category = excluded.category,
      subcategory = excluded.subcategory,
      summary = excluded.summary,
      markdown = excluded.markdown,
      source_file_ids_json = excluded.source_file_ids_json,
      related_topics_json = excluded.related_topics_json,
      generated_at = excluded.generated_at,
      updated_at = excluded.updated_at
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
    ON CONFLICT(id) DO UPDATE SET
      ref = excluded.ref,
      file_id = excluded.file_id,
      filename = excluded.filename,
      absolute_path = excluded.absolute_path,
      relative_path = excluded.relative_path,
      location = excluded.location,
      evidence = excluded.evidence
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
    ON CONFLICT(id) DO UPDATE SET
      source_ref = excluded.source_ref,
      ref = excluded.ref,
      file_id = excluded.file_id,
      chunk_number = excluded.chunk_number,
      line_start = excluded.line_start,
      line_end = excluded.line_end,
      char_start = excluded.char_start,
      char_end = excluded.char_end,
      location = excluded.location,
      heading = excluded.heading,
      text = excluded.text,
      evidence = excluded.evidence
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
    ON CONFLICT(id) DO UPDATE SET
      related_page_id = excluded.related_page_id,
      title = excluded.title,
      slug = excluded.slug
  `);

  const transaction = db.transaction(() => {
    clearPersistedWiki(db);

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

export function listPersistedWikiPages(db, { limit = 500 } = {}) {
  ensureWikiPersistenceSchema(db);

  const pageRows = db.prepare(`
    SELECT *
    FROM wiki_pages
    ORDER BY
      CASE page_type
        WHEN 'system' THEN 0
        WHEN 'category' THEN 1
        WHEN 'topic' THEN 2
        WHEN 'file' THEN 3
        ELSE 4
      END,
      title ASC
    LIMIT @limit
  `).all({ limit });

  if (!pageRows.length) return null;

  const pageIds = pageRows.map((page) => page.id);
  const placeholders = pageIds.map(() => '?').join(',');

  const sourceRows = db.prepare(`
    SELECT *
    FROM wiki_page_sources
    WHERE page_id IN (${placeholders})
    ORDER BY page_id ASC, ref ASC
  `).all(...pageIds);

  const chunkRows = db.prepare(`
    SELECT *
    FROM wiki_source_chunks
    WHERE page_id IN (${placeholders})
    ORDER BY page_id ASC, source_ref ASC, chunk_number ASC
  `).all(...pageIds);

  const relationRows = db.prepare(`
    SELECT *
    FROM wiki_page_relations
    WHERE page_id IN (${placeholders})
    ORDER BY page_id ASC, title ASC
  `).all(...pageIds);

  const chunksByPageAndSource = new Map();
  for (const chunk of chunkRows) {
    const key = `${chunk.page_id}:${chunk.source_ref}`;
    if (!chunksByPageAndSource.has(key)) chunksByPageAndSource.set(key, []);
    chunksByPageAndSource.get(key).push({
      ref: chunk.ref,
      source_ref: chunk.source_ref,
      chunk_number: chunk.chunk_number,
      line_start: chunk.line_start,
      line_end: chunk.line_end,
      char_start: chunk.char_start,
      char_end: chunk.char_end,
      location: chunk.location,
      heading: Boolean(chunk.heading),
      text: chunk.text,
      evidence: chunk.evidence,
    });
  }

  const sourcesByPage = new Map();
  for (const source of sourceRows) {
    if (!sourcesByPage.has(source.page_id)) sourcesByPage.set(source.page_id, []);
    sourcesByPage.get(source.page_id).push({
      ref: source.ref,
      file_id: source.file_id,
      filename: source.filename,
      absolute_path: source.absolute_path,
      relative_path: source.relative_path,
      location: source.location,
      evidence: source.evidence,
      chunks: chunksByPageAndSource.get(`${source.page_id}:${source.ref}`) || [],
    });
  }

  const relationsByPage = new Map();
  for (const relation of relationRows) {
    if (!relationsByPage.has(relation.page_id)) relationsByPage.set(relation.page_id, []);
    relationsByPage.get(relation.page_id).push({
      id: relation.related_page_id,
      title: relation.title,
      slug: relation.slug,
    });
  }

  const pages = pageRows.map((page) => ({
    id: page.id,
    title: page.title,
    slug: page.slug,
    page_type: page.page_type,
    category: page.category,
    subcategory: page.subcategory,
    summary: page.summary,
    markdown: page.markdown,
    source_file_ids: parseJson(page.source_file_ids_json, []),
    related_topics: parseJson(page.related_topics_json, []),
    related_pages: relationsByPage.get(page.id) || [],
    sources: sourcesByPage.get(page.id) || [],
    updated_at: page.updated_at,
  }));

  const categories = pages
    .filter((page) => page.page_type === 'category')
    .map((page) => ({ id: page.id, title: page.title, slug: page.slug }));

  return {
    generated_at: pageRows[0]?.generated_at || new Date().toISOString(),
    page_count: pages.length,
    categories,
    pages,
  };
}
