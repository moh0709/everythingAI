import { ensureWikiPersistenceSchema, listPersistedWikiPages, replacePersistedWikiPages as replacePages } from './wikiRepository.js';

export function deletePersistedWikiPages(db, pageIds = []) {
  ensureWikiPersistenceSchema(db);
  if (!pageIds.length) return;

  const placeholders = pageIds.map(() => '?').join(',');

  db.prepare(`
    DELETE FROM wiki_page_relations
    WHERE source_page_id IN (${placeholders})
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
    DELETE FROM wiki_page_sections
    WHERE page_id IN (${placeholders})
  `).run(...pageIds);

  db.prepare(`
    DELETE FROM wiki_pages
    WHERE id IN (${placeholders})
  `).run(...pageIds);
}

export function replacePersistedWikiPages(
  db,
  pages = [],
  generatedAt = new Date().toISOString()
) {
  ensureWikiPersistenceSchema(db);
  if (!pages.length) return listPersistedWikiPages(db);
  return replacePages(db, pages, generatedAt);
}
