import crypto from 'node:crypto';

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

function hashText(value = '') {
  return crypto.createHash('sha1').update(String(value ?? '')).digest('hex');
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

function sourceHash(source) {
  return hashText([
    source.ref || '',
    source.file_id || '',
    source.filename || '',
    source.absolute_path || '',
    source.evidence || '',
    ...(source.chunks || []).map((chunk) => chunk.text || chunk.evidence || ''),
  ].join('\n'));
}

function pageSourceFingerprint(page) {
  return hashText((page.sources || []).map((source) => sourceHash(source)).join('\n'));
}

function stableChunkKey({ source, chunk }) {
  return hashText([
    source.file_id || '',
    source.absolute_path || '',
    chunk.source_ref || source.ref || '',
    chunk.chunk_number || '',
    chunk.line_start ?? '',
    chunk.line_end ?? '',
    String(chunk.text || chunk.evidence || '').slice(0, 240),
  ].join(':'));
}

function hasColumn(db, tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

function hasDurableWikiSchema(db) {
  const wikiPages = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'wiki_pages'
  `).get();

  if (!wikiPages) return true;

  return (
    hasColumn(db, 'wiki_pages', 'content_hash')
    && hasColumn(db, 'wiki_pages', 'source_fingerprint')
    && hasColumn(db, 'wiki_page_sources', 'source_ref')
    && hasColumn(db, 'wiki_source_chunks', 'chunk_ref')
    && hasColumn(db, 'wiki_source_chunks', 'stable_chunk_key')
    && hasColumn(db, 'wiki_page_relations', 'source_page_id')
  );
}

function dropLegacyWikiTables(db) {
  db.exec(`
    DROP TABLE IF EXISTS wiki_page_relations;
    DROP TABLE IF EXISTS wiki_source_chunks;
    DROP TABLE IF EXISTS wiki_page_sources;
    DROP TABLE IF EXISTS wiki_page_sections;
    DROP TABLE IF EXISTS wiki_pages;
  `);
}

export function ensureWikiPersistenceSchema(db) {
  if (!hasDurableWikiSchema(db)) {
    dropLegacyWikiTables(db);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS wiki_pages (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      page_type TEXT NOT NULL CHECK (page_type IN ('system', 'category', 'topic', 'file')),
      category TEXT,
      subcategory TEXT,
      summary TEXT,
      markdown TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      source_fingerprint TEXT NOT NULL,
      citation_coverage_score REAL,
      weak_source_warning INTEGER NOT NULL DEFAULT 0,
      rebuild_version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('active', 'stale', 'failed', 'archived')),
      generated_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug
      ON wiki_pages(slug);

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_type
      ON wiki_pages(page_type);

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_category
      ON wiki_pages(category);

    CREATE INDEX IF NOT EXISTS idx_wiki_pages_status
      ON wiki_pages(status);

    CREATE TABLE IF NOT EXISTS wiki_page_sections (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      section_key TEXT NOT NULL,
      heading TEXT NOT NULL,
      heading_level INTEGER NOT NULL,
      body_markdown TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
      UNIQUE (page_id, section_key)
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_page_sections_page_id
      ON wiki_page_sections(page_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_sections_key
      ON wiki_page_sections(section_key);

    CREATE TABLE IF NOT EXISTS wiki_page_sources (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      filename TEXT NOT NULL,
      absolute_path TEXT NOT NULL,
      relative_path TEXT,
      location TEXT,
      evidence TEXT,
      source_order INTEGER NOT NULL,
      source_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE,
      UNIQUE (page_id, source_ref)
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_page_id
      ON wiki_page_sources(page_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_file_id
      ON wiki_page_sources(file_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_sources_ref
      ON wiki_page_sources(page_id, source_ref);

    CREATE TABLE IF NOT EXISTS wiki_source_chunks (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      page_source_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      chunk_ref TEXT NOT NULL,
      chunk_number INTEGER NOT NULL,
      stable_chunk_key TEXT NOT NULL,
      heading TEXT,
      text TEXT NOT NULL,
      evidence TEXT,
      location TEXT,
      line_start INTEGER,
      line_end INTEGER,
      char_start INTEGER,
      char_end INTEGER,
      page_number INTEGER,
      content_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
      FOREIGN KEY (page_source_id) REFERENCES wiki_page_sources(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES indexed_files(id) ON DELETE CASCADE,
      UNIQUE (page_id, chunk_ref)
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_page_id
      ON wiki_source_chunks(page_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_file_id
      ON wiki_source_chunks(file_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_source
      ON wiki_source_chunks(page_source_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_ref
      ON wiki_source_chunks(page_id, chunk_ref);

    CREATE INDEX IF NOT EXISTS idx_wiki_source_chunks_stable_key
      ON wiki_source_chunks(stable_chunk_key);

    CREATE TABLE IF NOT EXISTS wiki_page_relations (
      id TEXT PRIMARY KEY,
      source_page_id TEXT NOT NULL,
      target_page_id TEXT NOT NULL,
      relation_type TEXT NOT NULL CHECK (relation_type IN ('category', 'topic', 'source_file', 'semantic', 'entity', 'manual')),
      label TEXT,
      score REAL,
      evidence_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (source_page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
      FOREIGN KEY (target_page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_source
      ON wiki_page_relations(source_page_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_target
      ON wiki_page_relations(target_page_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_relations_type
      ON wiki_page_relations(relation_type);

    CREATE TABLE IF NOT EXISTS wiki_rebuilds (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK (mode IN ('full', 'incremental', 'selective')),
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
      input_json TEXT NOT NULL,
      summary_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_rebuilds_status
      ON wiki_rebuilds(status);

    CREATE INDEX IF NOT EXISTS idx_wiki_rebuilds_created_at
      ON wiki_rebuilds(created_at);
  `);
}

export function clearPersistedWiki(db) {
  ensureWikiPersistenceSchema(db);
  db.exec(`
    DELETE FROM wiki_page_relations;
    DELETE FROM wiki_source_chunks;
    DELETE FROM wiki_page_sources;
    DELETE FROM wiki_page_sections;
    DELETE FROM wiki_pages;
  `);
}

function splitMarkdownSections(page, timestamp) {
  const markdown = page.markdown || '';
  const lines = markdown.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      const heading = match[2].replace(/\s+\*\*\[[^\]]+\]\*\*$/, '').trim();
      current = {
        heading,
        heading_level: match[1].length,
        lines: [line],
      };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) sections.push(current);

  return sections.map((section, index) => {
    const body = section.lines.join('\n').trim();
    const sectionKey = `${index + 1}-${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'}`;
    return {
      id: `${page.id}:section:${index + 1}`,
      page_id: page.id,
      section_key: sectionKey,
      heading: section.heading,
      heading_level: section.heading_level,
      body_markdown: body,
      order_index: index + 1,
      content_hash: hashText(body),
      created_at: timestamp,
      updated_at: timestamp,
    };
  });
}

function hydrateWikiPage({ page, sections = [], sources = [], chunks = [], relations = [] }) {
  const chunksBySource = new Map();
  for (const chunk of chunks) {
    const key = chunk.page_source_id;
    if (!chunksBySource.has(key)) chunksBySource.set(key, []);
    chunksBySource.get(key).push({
      id: chunk.id,
      ref: chunk.chunk_ref,
      chunk_ref: chunk.chunk_ref,
      source_ref: chunk.source_ref,
      chunk_number: chunk.chunk_number,
      stable_chunk_key: chunk.stable_chunk_key,
      line_start: chunk.line_start,
      line_end: chunk.line_end,
      char_start: chunk.char_start,
      char_end: chunk.char_end,
      page_number: chunk.page_number,
      location: chunk.location,
      heading: Boolean(chunk.heading),
      text: chunk.text,
      evidence: chunk.evidence,
    });
  }

  const hydratedSources = sources.map((source) => ({
    id: source.id,
    ref: source.source_ref,
    source_ref: source.source_ref,
    file_id: source.file_id,
    filename: source.filename,
    absolute_path: source.absolute_path,
    relative_path: source.relative_path,
    location: source.location,
    evidence: source.evidence,
    source_hash: source.source_hash,
    chunks: chunksBySource.get(source.id) || [],
  }));

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    page_type: page.page_type,
    category: page.category,
    subcategory: page.subcategory,
    summary: page.summary,
    markdown: page.markdown,
    source_file_ids: hydratedSources.map((source) => source.file_id).filter(Boolean),
    related_topics: [],
    related_pages: relations.map((relation) => ({
      id: relation.target_page_id,
      title: relation.label,
      slug: relation.target_page_id,
      relation_type: relation.relation_type,
      score: relation.score,
      evidence: parseJson(relation.evidence_json, []),
    })),
    sections: sections.map((section) => ({
      id: section.id,
      section_key: section.section_key,
      heading: section.heading,
      heading_level: section.heading_level,
      body_markdown: section.body_markdown,
      order_index: section.order_index,
      content_hash: section.content_hash,
    })),
    sources: hydratedSources,
    citation_coverage_score: page.citation_coverage_score,
    weak_source_warning: Boolean(page.weak_source_warning),
    content_hash: page.content_hash,
    source_fingerprint: page.source_fingerprint,
    updated_at: page.updated_at,
  };
}

function insertPages(db, pages = [], generatedAt = new Date().toISOString()) {
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
      content_hash,
      source_fingerprint,
      citation_coverage_score,
      weak_source_warning,
      rebuild_version,
      status,
      generated_at,
      updated_at,
      error_message
    ) VALUES (
      @id,
      @slug,
      @title,
      @page_type,
      @category,
      @subcategory,
      @summary,
      @markdown,
      @content_hash,
      @source_fingerprint,
      @citation_coverage_score,
      @weak_source_warning,
      @rebuild_version,
      @status,
      @generated_at,
      @updated_at,
      @error_message
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      page_type = excluded.page_type,
      category = excluded.category,
      subcategory = excluded.subcategory,
      summary = excluded.summary,
      markdown = excluded.markdown,
      content_hash = excluded.content_hash,
      source_fingerprint = excluded.source_fingerprint,
      citation_coverage_score = excluded.citation_coverage_score,
      weak_source_warning = excluded.weak_source_warning,
      rebuild_version = excluded.rebuild_version,
      status = excluded.status,
      generated_at = excluded.generated_at,
      updated_at = excluded.updated_at,
      error_message = excluded.error_message
  `);

  const insertSection = db.prepare(`
    INSERT INTO wiki_page_sections (
      id,
      page_id,
      section_key,
      heading,
      heading_level,
      body_markdown,
      order_index,
      content_hash,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @page_id,
      @section_key,
      @heading,
      @heading_level,
      @body_markdown,
      @order_index,
      @content_hash,
      @created_at,
      @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      section_key = excluded.section_key,
      heading = excluded.heading,
      heading_level = excluded.heading_level,
      body_markdown = excluded.body_markdown,
      order_index = excluded.order_index,
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at
  `);

  const insertSource = db.prepare(`
    INSERT INTO wiki_page_sources (
      id,
      page_id,
      file_id,
      source_ref,
      filename,
      absolute_path,
      relative_path,
      location,
      evidence,
      source_order,
      source_hash,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @page_id,
      @file_id,
      @source_ref,
      @filename,
      @absolute_path,
      @relative_path,
      @location,
      @evidence,
      @source_order,
      @source_hash,
      @created_at,
      @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      file_id = excluded.file_id,
      source_ref = excluded.source_ref,
      filename = excluded.filename,
      absolute_path = excluded.absolute_path,
      relative_path = excluded.relative_path,
      location = excluded.location,
      evidence = excluded.evidence,
      source_order = excluded.source_order,
      source_hash = excluded.source_hash,
      updated_at = excluded.updated_at
  `);

  const insertChunk = db.prepare(`
    INSERT INTO wiki_source_chunks (
      id,
      page_id,
      page_source_id,
      file_id,
      source_ref,
      chunk_ref,
      chunk_number,
      stable_chunk_key,
      heading,
      text,
      evidence,
      location,
      line_start,
      line_end,
      char_start,
      char_end,
      page_number,
      content_hash,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @page_id,
      @page_source_id,
      @file_id,
      @source_ref,
      @chunk_ref,
      @chunk_number,
      @stable_chunk_key,
      @heading,
      @text,
      @evidence,
      @location,
      @line_start,
      @line_end,
      @char_start,
      @char_end,
      @page_number,
      @content_hash,
      @created_at,
      @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      page_source_id = excluded.page_source_id,
      file_id = excluded.file_id,
      source_ref = excluded.source_ref,
      chunk_ref = excluded.chunk_ref,
      chunk_number = excluded.chunk_number,
      stable_chunk_key = excluded.stable_chunk_key,
      heading = excluded.heading,
      text = excluded.text,
      evidence = excluded.evidence,
      location = excluded.location,
      line_start = excluded.line_start,
      line_end = excluded.line_end,
      char_start = excluded.char_start,
      char_end = excluded.char_end,
      page_number = excluded.page_number,
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at
  `);

  const insertRelation = db.prepare(`
    INSERT INTO wiki_page_relations (
      id,
      source_page_id,
      target_page_id,
      relation_type,
      label,
      score,
      evidence_json,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @source_page_id,
      @target_page_id,
      @relation_type,
      @label,
      @score,
      @evidence_json,
      @created_at,
      @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      target_page_id = excluded.target_page_id,
      relation_type = excluded.relation_type,
      label = excluded.label,
      score = excluded.score,
      evidence_json = excluded.evidence_json,
      updated_at = excluded.updated_at
  `);

  for (const page of pages) {
    const updatedAt = page.updated_at || generatedAt;
    const sources = page.sources || [];
    const citationRefs = page.markdown?.match(/\[[S]\d+(?::C\d+)?\]/g) || [];
    const citationCoverageScore = sources.length ? Math.min(1, citationRefs.length / Math.max(1, sources.length)) : 0;

    insertPage.run({
      id: page.id,
      slug: page.slug,
      title: page.title,
      page_type: page.page_type,
      category: page.category || null,
      subcategory: page.subcategory || null,
      summary: page.summary || '',
      markdown: page.markdown || '',
      content_hash: hashText(page.markdown || ''),
      source_fingerprint: pageSourceFingerprint(page),
      citation_coverage_score: citationCoverageScore,
      weak_source_warning: sources.length ? 0 : 1,
      rebuild_version: 1,
      status: 'active',
      generated_at: generatedAt,
      updated_at: updatedAt,
      error_message: null,
    });

    for (const section of splitMarkdownSections(page, updatedAt)) {
      insertSection.run(section);
    }

    sources.forEach((source, sourceIndex) => {
      if (!source.file_id) return;

      const pageSourceId = sourceRecordId(page.id, source.ref);

      insertSource.run({
        id: pageSourceId,
        page_id: page.id,
        file_id: source.file_id,
        source_ref: source.ref,
        filename: source.filename || 'Unknown source',
        absolute_path: source.absolute_path || '',
        relative_path: source.relative_path || null,
        location: source.location || null,
        evidence: source.evidence || null,
        source_order: sourceIndex + 1,
        source_hash: sourceHash(source),
        created_at: updatedAt,
        updated_at: updatedAt,
      });

      (source.chunks || []).forEach((chunk, chunkIndex) => {
        const chunkRef = chunk.ref || `${source.ref}:C${chunkIndex + 1}`;
        const chunkText = chunk.text || '';

        insertChunk.run({
          id: chunkRecordId(page.id, chunkRef),
          page_id: page.id,
          page_source_id: pageSourceId,
          file_id: source.file_id,
          source_ref: chunk.source_ref || source.ref,
          chunk_ref: chunkRef,
          chunk_number: chunk.chunk_number || chunkIndex + 1,
          stable_chunk_key: stableChunkKey({ source, chunk: { ...chunk, ref: chunkRef } }),
          heading: chunk.heading ? String(chunk.heading) : null,
          text: chunkText,
          evidence: chunk.evidence || '',
          location: chunk.location || null,
          line_start: chunk.line_start || null,
          line_end: chunk.line_end || null,
          char_start: chunk.char_start || null,
          char_end: chunk.char_end || null,
          page_number: chunk.page_number || null,
          content_hash: hashText(chunkText),
          created_at: updatedAt,
          updated_at: updatedAt,
        });
      });
    });

    (page.related_pages || []).forEach((relatedPage, index) => {
      const targetPageId = relatedPage.id || relatedPage.slug || relatedPage.title || `related-${index}`;
      insertRelation.run({
        id: relationRecordId(page.id, relatedPage, index),
        source_page_id: page.id,
        target_page_id: targetPageId,
        relation_type: 'semantic',
        label: relatedPage.title || relatedPage.slug || relatedPage.id || 'Related Page',
        score: null,
        evidence_json: safeJson([], []),
        created_at: updatedAt,
        updated_at: updatedAt,
      });
    });
  }
}

export function replacePersistedWikiPages(db, pages = [], generatedAt = new Date().toISOString()) {
  ensureWikiPersistenceSchema(db);
  const pageIds = pages.map((page) => page.id).filter(Boolean);

  if (!pageIds.length) return listPersistedWikiPages(db);

  const placeholders = pageIds.map(() => '?').join(',');

  const transaction = db.transaction(() => {
    db.prepare(`DELETE FROM wiki_page_relations WHERE source_page_id IN (${placeholders})`).run(...pageIds);
    db.prepare(`DELETE FROM wiki_source_chunks WHERE page_id IN (${placeholders})`).run(...pageIds);
    db.prepare(`DELETE FROM wiki_page_sources WHERE page_id IN (${placeholders})`).run(...pageIds);
    db.prepare(`DELETE FROM wiki_page_sections WHERE page_id IN (${placeholders})`).run(...pageIds);
    db.prepare(`DELETE FROM wiki_pages WHERE id IN (${placeholders})`).run(...pageIds);
    insertPages(db, pages, generatedAt);
  });

  transaction();
  return listPersistedWikiPages(db);
}

export function persistWikiPages(db, wiki) {
  ensureWikiPersistenceSchema(db);

  const generatedAt = wiki?.generated_at || new Date().toISOString();
  const pages = Array.isArray(wiki?.pages) ? wiki.pages : [];

  const transaction = db.transaction(() => {
    clearPersistedWiki(db);
    insertPages(db, pages, generatedAt);
  });

  transaction();

  return listPersistedWikiPages(db);
}

function getEvidenceRowsForPageIds(db, pageIds) {
  if (!pageIds.length) return { sections: [], sources: [], chunks: [], relations: [] };
  const placeholders = pageIds.map(() => '?').join(',');

  return {
    sections: db.prepare(`
      SELECT *
      FROM wiki_page_sections
      WHERE page_id IN (${placeholders})
      ORDER BY page_id ASC, order_index ASC
    `).all(...pageIds),
    sources: db.prepare(`
      SELECT *
      FROM wiki_page_sources
      WHERE page_id IN (${placeholders})
      ORDER BY page_id ASC, source_order ASC, source_ref ASC
    `).all(...pageIds),
    chunks: db.prepare(`
      SELECT *
      FROM wiki_source_chunks
      WHERE page_id IN (${placeholders})
      ORDER BY page_id ASC, source_ref ASC, chunk_number ASC
    `).all(...pageIds),
    relations: db.prepare(`
      SELECT *
      FROM wiki_page_relations
      WHERE source_page_id IN (${placeholders})
      ORDER BY source_page_id ASC, label ASC
    `).all(...pageIds),
  };
}

export function listPersistedWikiPages(db, { limit = 500 } = {}) {
  ensureWikiPersistenceSchema(db);

  const pageRows = db.prepare(`
    SELECT *
    FROM wiki_pages
    WHERE status = 'active'
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
  const evidence = getEvidenceRowsForPageIds(db, pageIds);

  const sectionsByPage = new Map();
  for (const section of evidence.sections) {
    if (!sectionsByPage.has(section.page_id)) sectionsByPage.set(section.page_id, []);
    sectionsByPage.get(section.page_id).push(section);
  }

  const sourcesByPage = new Map();
  for (const source of evidence.sources) {
    if (!sourcesByPage.has(source.page_id)) sourcesByPage.set(source.page_id, []);
    sourcesByPage.get(source.page_id).push(source);
  }

  const chunksByPage = new Map();
  for (const chunk of evidence.chunks) {
    if (!chunksByPage.has(chunk.page_id)) chunksByPage.set(chunk.page_id, []);
    chunksByPage.get(chunk.page_id).push(chunk);
  }

  const relationsByPage = new Map();
  for (const relation of evidence.relations) {
    if (!relationsByPage.has(relation.source_page_id)) relationsByPage.set(relation.source_page_id, []);
    relationsByPage.get(relation.source_page_id).push(relation);
  }

  const pages = pageRows.map((page) => hydrateWikiPage({
    page,
    sections: sectionsByPage.get(page.id) || [],
    sources: sourcesByPage.get(page.id) || [],
    chunks: chunksByPage.get(page.id) || [],
    relations: relationsByPage.get(page.id) || [],
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

export function getPersistedWikiPageBySlug(db, slug) {
  ensureWikiPersistenceSchema(db);

  const page = db.prepare(`
    SELECT *
    FROM wiki_pages
    WHERE slug = @slug
      AND status = 'active'
  `).get({ slug });

  if (!page) return null;

  const evidence = getEvidenceRowsForPageIds(db, [page.id]);
  return hydrateWikiPage({
    page,
    sections: evidence.sections,
    sources: evidence.sources,
    chunks: evidence.chunks,
    relations: evidence.relations,
  });
}

export function getPersistedWikiPageEvidence(db, pageId) {
  ensureWikiPersistenceSchema(db);

  const page = db.prepare(`
    SELECT id, slug, title, page_type, category, subcategory, citation_coverage_score, weak_source_warning, updated_at
    FROM wiki_pages
    WHERE id = @pageId
      AND status = 'active'
  `).get({ pageId });

  if (!page) return null;

  const evidence = getEvidenceRowsForPageIds(db, [pageId]);
  return {
    page,
    sections: evidence.sections,
    sources: evidence.sources,
    chunks: evidence.chunks,
    relations: evidence.relations,
  };
}

export function getPersistedWikiChunkByRef(db, { pageId, chunkRef }) {
  ensureWikiPersistenceSchema(db);

  return db.prepare(`
    SELECT c.*, s.filename, s.absolute_path, s.relative_path
    FROM wiki_source_chunks c
    JOIN wiki_page_sources s ON s.id = c.page_source_id
    WHERE c.page_id = @pageId
      AND c.chunk_ref = @chunkRef
  `).get({ pageId, chunkRef }) || null;
}

export function recordWikiRebuild(db, {
  id = crypto.randomUUID(),
  mode = 'full',
  status = 'completed',
  input = {},
  summary = {},
  startedAt = null,
  completedAt = null,
  createdAt = new Date().toISOString(),
  errorMessage = null,
} = {}) {
  ensureWikiPersistenceSchema(db);

  db.prepare(`
    INSERT INTO wiki_rebuilds (
      id,
      mode,
      status,
      input_json,
      summary_json,
      started_at,
      completed_at,
      created_at,
      error_message
    ) VALUES (
      @id,
      @mode,
      @status,
      @input_json,
      @summary_json,
      @started_at,
      @completed_at,
      @created_at,
      @error_message
    )
  `).run({
    id,
    mode,
    status,
    input_json: safeJson(input, {}),
    summary_json: safeJson(summary, {}),
    started_at: startedAt,
    completed_at: completedAt,
    created_at: createdAt,
    error_message: errorMessage,
  });

  return db.prepare('SELECT * FROM wiki_rebuilds WHERE id = ?').get(id);
}
