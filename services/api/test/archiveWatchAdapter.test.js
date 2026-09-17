import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

async function loadAdapter() {
  try {
    const module = await import('../src/archive/archiveWatchAdapter.js');
    assert.equal(typeof module.buildArchiveWatchReviewCandidate, 'function');
    return module.buildArchiveWatchReviewCandidate;
  } catch (error) {
    assert.fail(`archive watcher adapter is not implemented: ${error.message}`);
  }
}

function fp(hash = 'sha256:source', sizeBytes = 10, mtimeMs = 1000) {
  return { hash, size_bytes: sizeBytes, mtime_ms: mtimeMs };
}

function sourceRoot() {
  return path.resolve('fixtures/source');
}

function sourcePath() {
  return path.resolve('fixtures/source/invoice.pdf');
}

function archivePath() {
  return path.resolve('fixtures/archive/invoice.pdf');
}

function profile(overrides = {}) {
  return {
    id: 'profile-1',
    name: 'Watcher Archive',
    source_roots: [{ path: sourceRoot(), watch_enabled: true }],
    archive_destination: path.resolve('fixtures/archive'),
    copy_policy: 'copy_first',
    overwrite_policy: 'never_without_explicit_approval',
    approval_policy: 'manual_before_execution',
    ...overrides,
  };
}

function priorExecution(overrides = {}) {
  return {
    source_path: sourcePath(),
    archive_path: archivePath(),
    sidecar_path: `${archivePath()}.everythingai.json`,
    source_fingerprint: fp('sha256:source', 10, 1000),
    archive_fingerprint: fp('sha256:archive', 10, 1000),
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    profile: profile(),
    source_path: sourcePath(),
    source_fingerprint: fp('sha256:source-new', 12, 2000),
    prior_execution: priorExecution(),
    observed_archive: {
      archive_exists: true,
      archive_fingerprint: fp('sha256:archive', 10, 1000),
      sidecar_exists: true,
      destination_conflict: false,
    },
    event: { type: 'change', observed_at: '2026-09-17T13:00:00.000Z' },
    ...overrides,
  };
}

test('duplicate semantic watcher events produce the same stable review candidate regardless of timestamp', async () => {
  const build = await loadAdapter();
  const first = build(input({ event: { type: 'change', observed_at: '2026-09-17T13:00:00.000Z' } }));
  const second = build(input({ event: { type: 'change', observed_at: '2026-09-17T13:01:00.000Z' } }));

  assert.equal(first.candidate_id, second.candidate_id);
  assert.deepEqual(first, second);
  assert.equal(first.stale_state, 'source_changed');
  assert.equal(first.review_mode, 'update_preview');
  assert.equal(first.preview_required, true);
  assert.equal(first.manual_review_required, false);
  assert.equal(first.execution_allowed, false);
  assert.equal(first.automatic_approval_allowed, false);
  assert.equal(first.filesystem_mutation_allowed, false);
  assert.equal(Object.isFrozen(first), true);
});

test('source outside configured profile roots fails closed', async () => {
  const build = await loadAdapter();
  assert.throws(
    () => build(input({ source_path: path.resolve('fixtures/other/invoice.pdf') })),
    /SOURCE_OUTSIDE_PROFILE_ROOTS/,
  );
});

test('watch-disabled source root is ignored without creating preview or execution intent', async () => {
  const build = await loadAdapter();
  const result = build(input({
    profile: profile({ source_roots: [{ path: sourceRoot(), watch_enabled: false }] }),
  }));

  assert.equal(result.ignored, true);
  assert.equal(result.reason, 'WATCH_DISABLED_FOR_SOURCE_ROOT');
  assert.equal(result.candidate_id, null);
  assert.equal(result.preview_required, false);
  assert.equal(result.execution_allowed, false);
  assert.equal(result.automatic_approval_allowed, false);
  assert.equal(result.filesystem_mutation_allowed, false);
});

for (const scenario of [
  {
    name: 'source_changed',
    overrides: {},
    reviewMode: 'update_preview',
  },
  {
    name: 'archive_missing',
    overrides: {
      source_fingerprint: fp('sha256:source', 10, 1000),
      observed_archive: {
        archive_exists: false,
        archive_fingerprint: null,
        sidecar_exists: false,
        destination_conflict: false,
      },
    },
    reviewMode: 'rebuild_preview',
  },
  {
    name: 'sidecar_missing',
    overrides: {
      source_fingerprint: fp('sha256:source', 10, 1000),
      observed_archive: {
        archive_exists: true,
        archive_fingerprint: fp('sha256:archive', 10, 1000),
        sidecar_exists: false,
        destination_conflict: false,
      },
    },
    reviewMode: 'sidecar_preview',
  },
]) {
  test(`${scenario.name} produces a preview-only review candidate`, async () => {
    const build = await loadAdapter();
    const result = build(input(scenario.overrides));

    assert.equal(result.ignored, false);
    assert.equal(result.stale_state, scenario.name);
    assert.equal(result.review_mode, scenario.reviewMode);
    assert.equal(result.preview_required, true);
    assert.equal(result.manual_review_required, false);
    assert.equal(result.execution_allowed, false);
    assert.equal(result.automatic_approval_allowed, false);
    assert.equal(result.filesystem_mutation_allowed, false);
    assert.ok(result.candidate_id.startsWith('archive_watch_'));
  });
}

for (const scenario of [
  {
    name: 'archive_changed',
    observed_archive: {
      archive_exists: true,
      archive_fingerprint: fp('sha256:archive-edited', 11, 3000),
      sidecar_exists: true,
      destination_conflict: false,
    },
  },
  {
    name: 'conflict',
    observed_archive: {
      archive_exists: true,
      archive_fingerprint: fp('sha256:archive', 10, 1000),
      sidecar_exists: true,
      destination_conflict: true,
    },
  },
]) {
  test(`${scenario.name} produces manual-review-only candidate with no execution authority`, async () => {
    const build = await loadAdapter();
    const result = build(input({
      source_fingerprint: fp('sha256:source', 10, 1000),
      observed_archive: scenario.observed_archive,
    }));

    assert.equal(result.stale_state, scenario.name);
    assert.equal(result.review_mode, 'manual_review');
    assert.equal(result.preview_required, false);
    assert.equal(result.manual_review_required, true);
    assert.equal(result.execution_allowed, false);
    assert.equal(result.automatic_approval_allowed, false);
    assert.equal(result.filesystem_mutation_allowed, false);
  });
}

test('current state is ignored as no review work is required', async () => {
  const build = await loadAdapter();
  const result = build(input({ source_fingerprint: fp('sha256:source', 10, 1000) }));

  assert.equal(result.stale_state, 'current');
  assert.equal(result.ignored, true);
  assert.equal(result.reason, 'NO_ARCHIVE_REVIEW_REQUIRED');
  assert.equal(result.preview_required, false);
  assert.equal(result.manual_review_required, false);
  assert.equal(result.execution_allowed, false);
});

test('candidate includes immutable normalized evidence but does not expose executor or approval capabilities', async () => {
  const build = await loadAdapter();
  const result = build(input());

  assert.equal(result.profile_id, 'profile-1');
  assert.equal(result.source_path, sourcePath());
  assert.deepEqual(result.source_fingerprint, fp('sha256:source-new', 12, 2000));
  assert.equal(result.prior_execution.archive_path, archivePath());
  assert.equal(Object.isFrozen(result.source_fingerprint), true);
  assert.equal(Object.isFrozen(result.prior_execution), true);
  assert.equal('execute' in result, false);
  assert.equal('executor' in result, false);
  assert.equal('approval_token' in result, false);
  assert.equal('approve' in result, false);
});
