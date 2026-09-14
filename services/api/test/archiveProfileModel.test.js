import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  normalizeArchiveProfile,
  validateArchiveProfile,
} from '../src/archive/archiveProfileModel.js';
import {
  deleteArchiveProfile,
  getArchiveProfile,
  listArchiveProfiles,
  saveArchiveProfile,
} from '../src/db/archiveProfileRepository.js';

function validProfile(overrides = {}) {
  return {
    name: 'Finance Archive',
    source_roots: [
      {
        path: '/source/finance',
        watch_enabled: true,
        recursive: true,
        full_drive: false,
        include_hidden: false,
        include_patterns: ['**/*'],
        exclude_patterns: ['**/.git/**'],
        max_file_size_bytes: 10_000_000,
      },
    ],
    archive_destination: '/archive/finance',
    copy_policy: 'copy_first',
    overwrite_policy: 'never_without_explicit_approval',
    metadata_enrichment_enabled: true,
    approval_policy: 'manual_before_execution',
    ...overrides,
  };
}

test('archive profile applies safe defaults without enabling mutation authority', () => {
  const profile = normalizeArchiveProfile({
    name: 'Default Archive',
    source_roots: [{ path: '/source/default' }],
    archive_destination: '/archive/default',
  });

  assert.equal(profile.copy_policy, 'copy_first');
  assert.equal(profile.overwrite_policy, 'never_without_explicit_approval');
  assert.equal(profile.approval_policy, 'manual_before_execution');
  assert.equal(profile.metadata_enrichment_enabled, true);
});

test('archive destination must differ from source path', () => {
  const result = validateArchiveProfile(validProfile({ archive_destination: '/source/finance' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'SOURCE_DESTINATION_MUST_DIFFER'));
});

test('archive destination nested inside source requires explicit acknowledgement', () => {
  const result = validateArchiveProfile(validProfile({ archive_destination: '/source/finance/archive' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'DESTINATION_INSIDE_SOURCE_REQUIRES_ACKNOWLEDGEMENT'));

  const acknowledged = validateArchiveProfile(validProfile({
    archive_destination: '/source/finance/archive',
    archive_inside_source_acknowledged: true,
  }));
  assert.equal(acknowledged.valid, true);
});

test('full-drive source requires explicit warning acknowledgement', () => {
  const result = validateArchiveProfile(validProfile({
    source_roots: [{ path: '/drive', full_drive: true }],
  }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'FULL_DRIVE_REQUIRES_ACKNOWLEDGEMENT'));
});

test('archive profile persistence round-trips validated configuration', () => {
  const db = new Database(':memory:');
  const saved = saveArchiveProfile(db, validProfile());

  assert.ok(saved.id);
  assert.equal(saved.name, 'Finance Archive');
  assert.equal(saved.source_roots.length, 1);
  assert.equal(saved.copy_policy, 'copy_first');
  assert.equal(saved.overwrite_policy, 'never_without_explicit_approval');
  assert.equal(saved.approval_policy, 'manual_before_execution');

  const fetched = getArchiveProfile(db, saved.id);
  assert.deepEqual(fetched, saved);
  assert.equal(listArchiveProfiles(db).length, 1);

  assert.equal(deleteArchiveProfile(db, saved.id), true);
  assert.equal(getArchiveProfile(db, saved.id), null);
  db.close();
});

test('repository refuses unsafe profile persistence', () => {
  const db = new Database(':memory:');

  assert.throws(
    () => saveArchiveProfile(db, validProfile({ copy_policy: 'move_originals' })),
    (error) => error?.code === 'INVALID_ARCHIVE_PROFILE'
      && error.validation_errors.some((item) => item.code === 'COPY_FIRST_REQUIRED'),
  );

  assert.equal(listArchiveProfiles(db).length, 0);
  db.close();
});
