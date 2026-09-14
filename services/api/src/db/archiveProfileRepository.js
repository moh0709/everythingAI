import crypto from 'node:crypto';
import { validateArchiveProfile } from '../archive/archiveProfileModel.js';

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    source_roots: parseJson(row.source_roots_json, []),
    archive_destination: row.archive_destination,
    copy_policy: row.copy_policy,
    overwrite_policy: row.overwrite_policy,
    metadata_enrichment_enabled: row.metadata_enrichment_enabled === 1,
    approval_policy: row.approval_policy,
    archive_inside_source_acknowledged: row.archive_inside_source_acknowledged === 1,
    full_drive_warning_acknowledged: row.full_drive_warning_acknowledged === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function ensureArchiveProfileSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS archive_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_roots_json TEXT NOT NULL,
      archive_destination TEXT NOT NULL,
      copy_policy TEXT NOT NULL CHECK (copy_policy = 'copy_first'),
      overwrite_policy TEXT NOT NULL CHECK (overwrite_policy = 'never_without_explicit_approval'),
      metadata_enrichment_enabled INTEGER NOT NULL DEFAULT 1 CHECK (metadata_enrichment_enabled IN (0, 1)),
      approval_policy TEXT NOT NULL CHECK (approval_policy = 'manual_before_execution'),
      archive_inside_source_acknowledged INTEGER NOT NULL DEFAULT 0 CHECK (archive_inside_source_acknowledged IN (0, 1)),
      full_drive_warning_acknowledged INTEGER NOT NULL DEFAULT 0 CHECK (full_drive_warning_acknowledged IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_archive_profiles_name
      ON archive_profiles(name);
  `);
}

export function listArchiveProfiles(db) {
  ensureArchiveProfileSchema(db);
  return db.prepare(`
    SELECT *
    FROM archive_profiles
    ORDER BY created_at ASC, id ASC
  `).all().map(mapRow);
}

export function getArchiveProfile(db, id) {
  ensureArchiveProfileSchema(db);
  return mapRow(db.prepare(`
    SELECT *
    FROM archive_profiles
    WHERE id = @id
  `).get({ id }));
}

export function saveArchiveProfile(db, input = {}) {
  ensureArchiveProfileSchema(db);
  const validation = validateArchiveProfile(input);
  if (!validation.valid) {
    const error = new Error('Invalid archive profile');
    error.code = 'INVALID_ARCHIVE_PROFILE';
    error.validation_errors = validation.errors;
    throw error;
  }

  const now = new Date().toISOString();
  const id = validation.profile.id || crypto.randomUUID();
  const existing = getArchiveProfile(db, id);
  const profile = validation.profile;

  db.prepare(`
    INSERT INTO archive_profiles (
      id,
      name,
      source_roots_json,
      archive_destination,
      copy_policy,
      overwrite_policy,
      metadata_enrichment_enabled,
      approval_policy,
      archive_inside_source_acknowledged,
      full_drive_warning_acknowledged,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @name,
      @source_roots_json,
      @archive_destination,
      @copy_policy,
      @overwrite_policy,
      @metadata_enrichment_enabled,
      @approval_policy,
      @archive_inside_source_acknowledged,
      @full_drive_warning_acknowledged,
      @created_at,
      @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      source_roots_json = excluded.source_roots_json,
      archive_destination = excluded.archive_destination,
      copy_policy = excluded.copy_policy,
      overwrite_policy = excluded.overwrite_policy,
      metadata_enrichment_enabled = excluded.metadata_enrichment_enabled,
      approval_policy = excluded.approval_policy,
      archive_inside_source_acknowledged = excluded.archive_inside_source_acknowledged,
      full_drive_warning_acknowledged = excluded.full_drive_warning_acknowledged,
      updated_at = excluded.updated_at
  `).run({
    id,
    name: profile.name,
    source_roots_json: JSON.stringify(profile.source_roots),
    archive_destination: profile.archive_destination,
    copy_policy: profile.copy_policy,
    overwrite_policy: profile.overwrite_policy,
    metadata_enrichment_enabled: profile.metadata_enrichment_enabled ? 1 : 0,
    approval_policy: profile.approval_policy,
    archive_inside_source_acknowledged: profile.archive_inside_source_acknowledged ? 1 : 0,
    full_drive_warning_acknowledged: profile.full_drive_warning_acknowledged ? 1 : 0,
    created_at: existing?.created_at || now,
    updated_at: now,
  });

  return getArchiveProfile(db, id);
}

export function deleteArchiveProfile(db, id) {
  ensureArchiveProfileSchema(db);
  return db.prepare(`DELETE FROM archive_profiles WHERE id = @id`).run({ id }).changes > 0;
}
