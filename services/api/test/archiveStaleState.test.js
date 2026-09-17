import test from 'node:test';
import assert from 'node:assert/strict';

async function loadEvaluator() {
  try {
    const module = await import('../src/archive/archiveStaleState.js');
    assert.equal(typeof module.evaluateArchiveStaleState, 'function', 'evaluateArchiveStaleState must be exported');
    return module.evaluateArchiveStaleState;
  } catch (error) {
    assert.fail(`archive stale-state evaluator is not implemented: ${error.message}`);
  }
}

function fingerprint(hash = 'sha256:source', sizeBytes = 10, mtimeMs = 1000) {
  return { hash, size_bytes: sizeBytes, mtime_ms: mtimeMs };
}

function execution(overrides = {}) {
  return {
    source_path: '/source/invoice.pdf',
    archive_path: '/archive/invoice.pdf',
    sidecar_path: '/archive/invoice.pdf.everythingai.json',
    source_fingerprint: fingerprint('sha256:source', 10, 1000),
    archive_fingerprint: fingerprint('sha256:archive', 10, 1000),
    ...overrides,
  };
}

function current(overrides = {}) {
  return {
    source_exists: true,
    source_fingerprint: fingerprint('sha256:source', 10, 1000),
    archive_exists: true,
    archive_fingerprint: fingerprint('sha256:archive', 10, 1000),
    sidecar_exists: true,
    destination_conflict: false,
    ...overrides,
  };
}

test('returns current when source, archive and sidecar still match accepted execution evidence', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({ execution: execution(), current: current() });

  assert.deepEqual(result, {
    state: 'current',
    reason: 'SOURCE_AND_ARCHIVE_MATCH_ACCEPTED_EXECUTION',
    preview_required: false,
    manual_review_required: false,
    filesystem_mutation_allowed: false,
  });
  assert.equal(Object.isFrozen(result), true);
});

test('returns source_changed when source fingerprint changes and requests update preview only', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({
    execution: execution(),
    current: current({ source_fingerprint: fingerprint('sha256:source-new', 11, 2000) }),
  });

  assert.equal(result.state, 'source_changed');
  assert.equal(result.reason, 'SOURCE_FINGERPRINT_CHANGED');
  assert.equal(result.preview_required, true);
  assert.equal(result.manual_review_required, false);
  assert.equal(result.filesystem_mutation_allowed, false);
});

test('returns archive_missing when accepted archive output is absent and requests rebuild preview', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({
    execution: execution(),
    current: current({ archive_exists: false, archive_fingerprint: null }),
  });

  assert.equal(result.state, 'archive_missing');
  assert.equal(result.reason, 'ARCHIVE_OUTPUT_MISSING');
  assert.equal(result.preview_required, true);
  assert.equal(result.manual_review_required, false);
  assert.equal(result.filesystem_mutation_allowed, false);
});

test('returns archive_changed when archive fingerprint differs and requires manual review', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({
    execution: execution(),
    current: current({ archive_fingerprint: fingerprint('sha256:archive-edited', 12, 3000) }),
  });

  assert.equal(result.state, 'archive_changed');
  assert.equal(result.reason, 'ARCHIVE_FINGERPRINT_CHANGED');
  assert.equal(result.preview_required, false);
  assert.equal(result.manual_review_required, true);
  assert.equal(result.filesystem_mutation_allowed, false);
});

test('returns sidecar_missing when archive is intact but metadata sidecar is absent', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({
    execution: execution(),
    current: current({ sidecar_exists: false }),
  });

  assert.equal(result.state, 'sidecar_missing');
  assert.equal(result.reason, 'METADATA_SIDECAR_MISSING');
  assert.equal(result.preview_required, true);
  assert.equal(result.manual_review_required, false);
  assert.equal(result.filesystem_mutation_allowed, false);
});

test('conflict takes precedence over every other stale state and requires manual review', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({
    execution: execution(),
    current: current({
      destination_conflict: true,
      archive_exists: false,
      archive_fingerprint: null,
      source_fingerprint: fingerprint('sha256:source-new', 11, 2000),
      sidecar_exists: false,
    }),
  });

  assert.equal(result.state, 'conflict');
  assert.equal(result.reason, 'UNEXPECTED_DESTINATION_CONFLICT');
  assert.equal(result.preview_required, false);
  assert.equal(result.manual_review_required, true);
  assert.equal(result.filesystem_mutation_allowed, false);
});

test('archive_changed takes precedence over source_changed because unmanaged archive edits require manual review', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({
    execution: execution(),
    current: current({
      source_fingerprint: fingerprint('sha256:source-new', 11, 2000),
      archive_fingerprint: fingerprint('sha256:archive-edited', 12, 3000),
    }),
  });

  assert.equal(result.state, 'archive_changed');
  assert.equal(result.manual_review_required, true);
  assert.equal(result.preview_required, false);
});

test('source_changed takes precedence over sidecar_missing so source update is reviewed first', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();
  const result = evaluateArchiveStaleState({
    execution: execution(),
    current: current({
      source_fingerprint: fingerprint('sha256:source-new', 11, 2000),
      sidecar_exists: false,
    }),
  });

  assert.equal(result.state, 'source_changed');
  assert.equal(result.preview_required, true);
});

test('fails closed when accepted execution fingerprint evidence is incomplete', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();

  assert.throws(
    () => evaluateArchiveStaleState({
      execution: execution({ source_fingerprint: { hash: '', size_bytes: 10, mtime_ms: 1000 } }),
      current: current(),
    }),
    /INVALID_ARCHIVE_EXECUTION_EVIDENCE/,
  );
});

test('fails closed when current observed evidence is malformed', async () => {
  const evaluateArchiveStaleState = await loadEvaluator();

  assert.throws(
    () => evaluateArchiveStaleState({
      execution: execution(),
      current: current({ archive_exists: true, archive_fingerprint: null }),
    }),
    /INVALID_ARCHIVE_OBSERVATION_EVIDENCE/,
  );
});
