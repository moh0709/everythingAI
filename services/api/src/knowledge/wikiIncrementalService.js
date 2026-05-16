import crypto from 'node:crypto';
import { getWikiPagesDependingOnFiles } from '../db/wikiIncrementalRepository.js';

function hashContent(value) {
  return crypto
    .createHash('sha1')
    .update(value || '')
    .digest('hex');
}

function normalizeExtractedRow(row) {
  const text = row.extracted_text || row.content || '';

  return {
    file_id: row.file_id || row.id,
    absolute_path: row.absolute_path || row.path || null,
    content_hash: hashContent(text),
    content_length: text.length,
    extracted_at: row.extracted_at || row.updated_at || null,
  };
}

export function collectCurrentWikiFingerprints(db) {
  const rows = db.prepare(`
    SELECT
      f.id,
      f.absolute_path,
      d.content AS extracted_text,
      d.updated_at,
      d.created_at
    FROM files f
    LEFT JOIN document_extractions d
      ON d.file_id = f.id
  `).all();

  return rows.map(normalizeExtractedRow);
}

export function detectChangedWikiFiles(db, currentFingerprints = []) {
  const existingRows = db.prepare(`
    SELECT *
    FROM wiki_file_fingerprints
  `).all();

  const existingMap = new Map(
    existingRows.map((row) => [row.file_id, row])
  );

  const changed = [];
  const unchanged = [];
  const added = [];

  for (const fingerprint of currentFingerprints) {
    const existing = existingMap.get(fingerprint.file_id);

    if (!existing) {
      added.push(fingerprint);
      changed.push(fingerprint);
      continue;
    }

    if (
      existing.content_hash !== fingerprint.content_hash ||
      Number(existing.content_length || 0) !== Number(fingerprint.content_length || 0)
    ) {
      changed.push(fingerprint);
    } else {
      unchanged.push(fingerprint);
    }
  }

  return {
    added,
    changed,
    unchanged,
    changed_file_ids: changed.map((item) => item.file_id),
  };
}

export function buildIncrementalWikiPlan(db) {
  const currentFingerprints = collectCurrentWikiFingerprints(db);

  const result = detectChangedWikiFiles(db, currentFingerprints);

  const affectedPages = getWikiPagesDependingOnFiles(
    db,
    result.changed_file_ids
  );

  return {
    generated_at: new Date().toISOString(),
    changed_files: result.changed,
    unchanged_files: result.unchanged,
    added_files: result.added,
    changed_file_count: result.changed.length,
    affected_pages: affectedPages,
    affected_page_count: affectedPages.length,
  };
}
