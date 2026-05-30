import crypto from 'node:crypto';
import { ensureWikiPersistenceSchema } from './wikiRepository.js';

const VALID_STATUSES = new Set([
  'unreviewed',
  'reviewed',
  'approved',
  'needs_attention',
  'rejected',
]);

function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim() : '';
}

export function ensureWikiHumanValidationSchema(db) {
  ensureWikiPersistenceSchema(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS wiki_human_validations (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('unreviewed', 'reviewed', 'approved', 'needs_attention', 'rejected')),
      reviewed_by TEXT,
      reviewed_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_human_validations_page_id
      ON wiki_human_validations(page_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_human_validations_status
      ON wiki_human_validations(status);
  `);
}

export function isValidHumanValidationStatus(status) {
  return VALID_STATUSES.has(normalizeStatus(status));
}

export function getWikiHumanValidation(db, pageId) {
  ensureWikiHumanValidationSchema(db);

  const page = db.prepare(`
    SELECT id, title
    FROM wiki_pages
    WHERE id = @pageId
      AND status = 'active'
  `).get({ pageId });

  if (!page) return null;

  const validation = db.prepare(`
    SELECT id, page_id, status, reviewed_by, reviewed_at, notes, created_at, updated_at
    FROM wiki_human_validations
    WHERE page_id = @pageId
  `).get({ pageId });

  if (validation) return validation;

  return {
    id: null,
    page_id: pageId,
    status: 'unreviewed',
    reviewed_by: null,
    reviewed_at: null,
    notes: null,
    created_at: null,
    updated_at: null,
  };
}

export function upsertWikiHumanValidation(db, {
  pageId,
  status,
  reviewedBy = null,
  notes = null,
  reviewedAt = new Date().toISOString(),
} = {}) {
  ensureWikiHumanValidationSchema(db);

  const normalizedStatus = normalizeStatus(status);
  if (!isValidHumanValidationStatus(normalizedStatus) || normalizedStatus === 'unreviewed') {
    const error = new Error('Invalid human validation status');
    error.code = 'INVALID_HUMAN_VALIDATION_STATUS';
    throw error;
  }

  const existing = getWikiHumanValidation(db, pageId);
  if (!existing) return null;

  const timestamp = new Date().toISOString();
  const id = existing.id || crypto.randomUUID();

  db.prepare(`
    INSERT INTO wiki_human_validations (
      id,
      page_id,
      status,
      reviewed_by,
      reviewed_at,
      notes,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @page_id,
      @status,
      @reviewed_by,
      @reviewed_at,
      @notes,
      @created_at,
      @updated_at
    )
    ON CONFLICT(page_id) DO UPDATE SET
      status = excluded.status,
      reviewed_by = excluded.reviewed_by,
      reviewed_at = excluded.reviewed_at,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run({
    id,
    page_id: pageId,
    status: normalizedStatus,
    reviewed_by: reviewedBy || null,
    reviewed_at: reviewedAt,
    notes: notes || null,
    created_at: existing.created_at || timestamp,
    updated_at: timestamp,
  });

  return getWikiHumanValidation(db, pageId);
}
