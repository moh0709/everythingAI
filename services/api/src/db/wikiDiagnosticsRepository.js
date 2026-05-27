import { ensureWikiIncrementalSchema } from './wikiIncrementalRepository.js';
import { ensureWikiPersistenceSchema } from './wikiRepository.js';

export function getWikiDiagnostics(db, { limit = 250 } = {}) {
  ensureWikiPersistenceSchema(db);
  ensureWikiIncrementalSchema(db);

  const buildState = db.prepare(`
    SELECT key, value, updated_at
    FROM wiki_build_state
    ORDER BY key ASC
  `).all();

  const fingerprints = db.prepare(`
    SELECT file_id, absolute_path, content_hash, content_length, extracted_at, updated_at
    FROM wiki_file_fingerprints
    ORDER BY updated_at DESC, file_id ASC
    LIMIT @limit
  `).all({ limit });

  const dependencies = db.prepare(`
    SELECT id, page_id, file_id, source_ref, updated_at
    FROM wiki_page_dependencies
    ORDER BY page_id ASC, file_id ASC, source_ref ASC
    LIMIT @limit
  `).all({ limit });

  const rebuilds = db.prepare(`
    SELECT id, mode, status, input_json, summary_json, started_at, completed_at, created_at, error_message
    FROM wiki_rebuilds
    ORDER BY created_at DESC
    LIMIT @limit
  `).all({ limit });

  const pageStats = db.prepare(`
    SELECT
      COUNT(*) AS total_pages,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_pages,
      SUM(CASE WHEN status = 'stale' THEN 1 ELSE 0 END) AS stale_pages,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_pages,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived_pages
    FROM wiki_pages
  `).get();

  const evidenceStats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM wiki_page_sections) AS section_count,
      (SELECT COUNT(*) FROM wiki_page_sources) AS source_count,
      (SELECT COUNT(*) FROM wiki_source_chunks) AS chunk_count,
      (SELECT COUNT(*) FROM wiki_page_relations) AS relation_count
  `).get();

  return {
    generated_at: new Date().toISOString(),
    page_stats: {
      total_pages: Number(pageStats.total_pages || 0),
      active_pages: Number(pageStats.active_pages || 0),
      stale_pages: Number(pageStats.stale_pages || 0),
      failed_pages: Number(pageStats.failed_pages || 0),
      archived_pages: Number(pageStats.archived_pages || 0),
    },
    evidence_stats: {
      section_count: Number(evidenceStats.section_count || 0),
      source_count: Number(evidenceStats.source_count || 0),
      chunk_count: Number(evidenceStats.chunk_count || 0),
      relation_count: Number(evidenceStats.relation_count || 0),
    },
    build_state: buildState,
    fingerprints,
    dependencies,
    rebuilds: rebuilds.map((rebuild) => ({
      ...rebuild,
      input: JSON.parse(rebuild.input_json || '{}'),
      summary: JSON.parse(rebuild.summary_json || '{}'),
    })),
  };
}
