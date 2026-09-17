import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

async function loadBridge() {
  try {
    const module = await import('../src/archive/archiveUpdatePreview.js');
    assert.equal(typeof module.createArchiveUpdatePreview, 'function');
    return module.createArchiveUpdatePreview;
  } catch (error) {
    assert.fail(`archive update preview bridge is not implemented: ${error.message}`);
  }
}

function fp(hash = 'sha256:current', sizeBytes = 12, mtimeMs = 2000) {
  return { hash, size_bytes: sizeBytes, mtime_ms: mtimeMs };
}

function sourcePath() {
  return path.resolve('fixtures/source/invoice.pdf');
}

function archivePath() {
  return path.resolve('fixtures/archive/Finance/2026/invoice.pdf');
}

function profile() {
  return {
    id: 'profile-1',
    name: 'Watcher Archive',
    source_roots: [{ path: path.resolve('fixtures/source'), watch_enabled: true }],
    archive_destination: path.resolve('fixtures/archive'),
    copy_policy: 'copy_first',
    overwrite_policy: 'never_without_explicit_approval',
    approval_policy: 'manual_before_execution',
  };
}

function candidate(staleState, overrides = {}) {
  const reviewMode = {
    source_changed: 'update_preview',
    archive_missing: 'rebuild_preview',
    sidecar_missing: 'sidecar_preview',
    archive_changed: 'manual_review',
    conflict: 'manual_review',
  }[staleState];

  return {
    ignored: false,
    candidate_id: `archive_watch_${staleState}`,
    profile_id: 'profile-1',
    source_path: sourcePath(),
    source_fingerprint: fp(),
    prior_execution: {
      source_path: sourcePath(),
      archive_path: archivePath(),
      sidecar_path: `${archivePath()}.everythingai.json`,
      source_fingerprint: fp('sha256:previous', 10, 1000),
      archive_fingerprint: fp('sha256:archive', 10, 1000),
    },
    stale_state: staleState,
    review_mode: reviewMode,
    preview_required: staleState !== 'archive_changed' && staleState !== 'conflict',
    manual_review_required: staleState === 'archive_changed' || staleState === 'conflict',
    execution_allowed: false,
    automatic_approval_allowed: false,
    filesystem_mutation_allowed: false,
    ...overrides,
  };
}

function sourceSnapshot(overrides = {}) {
  return {
    source_path: sourcePath(),
    source_fingerprint: fp(),
    suggested_relative_path: path.join('Finance', '2026', 'invoice.pdf'),
    ai_generated_fields: ['summary'],
    evidence_refs: [{ type: 'watcher', source_path: sourcePath(), locator: 'cycle=test' }],
    ...overrides,
  };
}

for (const scenario of [
  ['source_changed', 'update_preview'],
  ['archive_missing', 'rebuild_preview'],
]) {
  test(`${scenario[0]} creates approval-required preview plan bound to current source fingerprint`, async () => {
    const createPreview = await loadBridge();
    const result = createPreview({
      candidate: candidate(scenario[0]),
      profile: profile(),
      source_snapshot: sourceSnapshot(),
    });

    assert.equal(result.proposal_type, scenario[1]);
    assert.equal(result.mode, 'preview_only');
    assert.equal(result.requires_approval, true);
    assert.equal(result.execution_allowed, false);
    assert.equal(result.automatic_approval_allowed, false);
    assert.equal(result.filesystem_mutation_allowed, false);
    assert.equal(result.candidate_id, `archive_watch_${scenario[0]}`);
    assert.ok(result.plan);
    assert.equal(result.plan.mode, 'preview_only');
    assert.equal(result.plan.filesystem_mutation_allowed, false);
    assert.equal(result.plan.items.length, 1);
    assert.deepEqual(result.plan.items[0].source_fingerprint, fp());
    assert.equal(result.plan.items[0].requires_approval, true);
    assert.equal(Object.isFrozen(result), true);
  });
}

test('sidecar_missing creates sidecar regeneration preview without archive copy plan', async () => {
  const createPreview = await loadBridge();
  const result = createPreview({
    candidate: candidate('sidecar_missing'),
    profile: profile(),
    source_snapshot: sourceSnapshot(),
  });

  assert.equal(result.proposal_type, 'sidecar_regeneration_preview');
  assert.equal(result.mode, 'preview_only');
  assert.equal(result.requires_approval, true);
  assert.equal(result.execution_allowed, false);
  assert.equal(result.filesystem_mutation_allowed, false);
  assert.equal(result.plan, null);
  assert.equal(result.archive_path, archivePath());
  assert.equal(result.sidecar_path, `${archivePath()}.everythingai.json`);
  assert.deepEqual(result.source_fingerprint, fp());
  assert.equal('writer' in result, false);
  assert.equal('execute' in result, false);
});

for (const staleState of ['archive_changed', 'conflict']) {
  test(`${staleState} remains manual-review-only and never produces an executable preview`, async () => {
    const createPreview = await loadBridge();
    const result = createPreview({
      candidate: candidate(staleState),
      profile: profile(),
      source_snapshot: sourceSnapshot(),
    });

    assert.equal(result.proposal_type, 'manual_review');
    assert.equal(result.mode, 'manual_review_only');
    assert.equal(result.requires_approval, false);
    assert.equal(result.execution_allowed, false);
    assert.equal(result.automatic_approval_allowed, false);
    assert.equal(result.filesystem_mutation_allowed, false);
    assert.equal(result.plan, null);
  });
}

test('bridge fails closed when current source snapshot no longer matches watcher candidate fingerprint', async () => {
  const createPreview = await loadBridge();
  assert.throws(
    () => createPreview({
      candidate: candidate('source_changed'),
      profile: profile(),
      source_snapshot: sourceSnapshot({
        source_fingerprint: fp('sha256:changed-again', 13, 3000),
      }),
    }),
    /WATCH_CANDIDATE_SOURCE_FINGERPRINT_STALE/,
  );
});

test('bridge fails closed for candidate/profile/source mismatches and ignored candidates', async () => {
  const createPreview = await loadBridge();

  assert.throws(
    () => createPreview({
      candidate: candidate('source_changed', { profile_id: 'other-profile' }),
      profile: profile(),
      source_snapshot: sourceSnapshot(),
    }),
    /WATCH_CANDIDATE_PROFILE_MISMATCH/,
  );

  assert.throws(
    () => createPreview({
      candidate: candidate('source_changed'),
      profile: profile(),
      source_snapshot: sourceSnapshot({ source_path: path.resolve('fixtures/source/other.pdf') }),
    }),
    /WATCH_CANDIDATE_SOURCE_MISMATCH/,
  );

  assert.throws(
    () => createPreview({
      candidate: candidate('source_changed', { ignored: true }),
      profile: profile(),
      source_snapshot: sourceSnapshot(),
    }),
    /WATCH_CANDIDATE_NOT_REVIEWABLE/,
  );
});
