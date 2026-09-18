import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createPreviewArchivePlan } from '../src/archive/archivePlanner.js';

function createProfile(overrides = {}) {
  return {
    id: 'profile-1',
    name: 'Test Archive',
    source_roots: [{ path: path.resolve('fixtures/source') }],
    archive_destination: path.resolve('fixtures/archive'),
    copy_policy: 'copy_first',
    overwrite_policy: 'never_without_explicit_approval',
    approval_policy: 'manual_before_execution',
    ...overrides,
  };
}

function createSnapshot(overrides = {}) {
  return {
    source_path: path.resolve('fixtures/source/invoice.pdf'),
    source_fingerprint: {
      hash: 'sha256:abc123',
      size_bytes: 120341,
      mtime_ms: 1785580800000,
    },
    suggested_relative_path: path.join('Finance', '2026', 'invoice.pdf'),
    ai_generated_fields: ['summary', 'classification', 'summary'],
    evidence_refs: [{
      type: 'extracted_text_span',
      source_path: path.resolve('fixtures/source/invoice.pdf'),
      locator: 'page=1',
    }],
    ...overrides,
  };
}

test('preview planner creates deterministic immutable copy-only plan without mutation authority', () => {
  const input = {
    profile: createProfile(),
    source_snapshots: [createSnapshot()],
  };

  const first = createPreviewArchivePlan(input);
  const second = createPreviewArchivePlan(input);

  assert.deepEqual(first, second);
  assert.equal(first.mode, 'preview_only');
  assert.equal(first.filesystem_mutation_allowed, false);
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].action, 'copy');
  assert.equal(first.items[0].requires_approval, true);
  assert.equal(first.items[0].approval_status, 'pending');
  assert.equal(first.items[0].conflict_status, 'none');
  assert.equal(first.items[0].sidecar_path, `${first.items[0].suggested_archive_path}.everythingai.json`);
  assert.deepEqual(first.items[0].ai_generated_fields, ['classification', 'summary']);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.items), true);
  assert.equal(Object.isFrozen(first.items[0]), true);
});

test('preview planner produces identical plan regardless of input snapshot order', () => {
  const snapshotA = createSnapshot({
    source_path: path.resolve('fixtures/source/a.pdf'),
    suggested_relative_path: 'a.pdf',
    source_fingerprint: { hash: 'sha256:a', size_bytes: 1, mtime_ms: 1 },
  });
  const snapshotB = createSnapshot({
    source_path: path.resolve('fixtures/source/b.pdf'),
    suggested_relative_path: 'b.pdf',
    source_fingerprint: { hash: 'sha256:b', size_bytes: 2, mtime_ms: 2 },
  });

  const first = createPreviewArchivePlan({ profile: createProfile(), source_snapshots: [snapshotA, snapshotB] });
  const second = createPreviewArchivePlan({ profile: createProfile(), source_snapshots: [snapshotB, snapshotA] });

  assert.equal(first.plan_id, second.plan_id);
  assert.deepEqual(first.items.map((item) => item.plan_item_id), second.items.map((item) => item.plan_item_id));
});

test('preview planner fails closed for invalid archive profile', () => {
  assert.throws(
    () => createPreviewArchivePlan({
      profile: createProfile({ copy_policy: 'move' }),
      source_snapshots: [createSnapshot()],
    }),
    /INVALID_ARCHIVE_PROFILE/,
  );
});

test('preview planner rejects source snapshots outside configured roots', () => {
  assert.throws(
    () => createPreviewArchivePlan({
      profile: createProfile(),
      source_snapshots: [createSnapshot({ source_path: path.resolve('fixtures/other/file.pdf') })],
    }),
    /SOURCE_OUTSIDE_PROFILE_ROOTS/,
  );
});

test('preview planner rejects archive path escape attempts', () => {
  assert.throws(
    () => createPreviewArchivePlan({
      profile: createProfile(),
      source_snapshots: [createSnapshot({ suggested_relative_path: path.join('..', 'escaped.pdf') })],
    }),
    /ARCHIVE_PATH_ESCAPE_FORBIDDEN/,
  );
});

test('preview planner rejects duplicate destination collisions', () => {
  const first = createSnapshot({
    source_path: path.resolve('fixtures/source/one.pdf'),
    suggested_relative_path: 'same.pdf',
    source_fingerprint: { hash: 'sha256:one', size_bytes: 1, mtime_ms: 1 },
  });
  const second = createSnapshot({
    source_path: path.resolve('fixtures/source/two.pdf'),
    suggested_relative_path: 'same.pdf',
    source_fingerprint: { hash: 'sha256:two', size_bytes: 2, mtime_ms: 2 },
  });

  assert.throws(
    () => createPreviewArchivePlan({ profile: createProfile(), source_snapshots: [first, second] }),
    /DUPLICATE_ARCHIVE_DESTINATION/,
  );
});

test('preview planner requires complete source fingerprint evidence', () => {
  assert.throws(
    () => createPreviewArchivePlan({
      profile: createProfile(),
      source_snapshots: [createSnapshot({ source_fingerprint: { hash: '', size_bytes: 1, mtime_ms: 1 } })],
    }),
    /INVALID_SOURCE_SNAPSHOT/,
  );
});


test('preview planner normalizes AI enrichment into immutable deterministic plan evidence', () => {
  const generatedMetadata = {
    tags: {
      value: ['invoice', 'finance', 'invoice'],
      generated_by: 'provider-neutral-model',
      evidence_refs: [{
        type: 'document_text',
        source_path: path.resolve('fixtures/source/invoice.pdf'),
        locator: 'page=2',
      }],
    },
    summary: {
      value: 'Invoice summary',
      generated_by: 'provider-neutral-model',
      evidence_refs: [{
        type: 'document_text',
        source_path: path.resolve('fixtures/source/invoice.pdf'),
        locator: 'page=1',
      }],
    },
  };

  const first = createPreviewArchivePlan({
    profile: createProfile(),
    source_snapshots: [createSnapshot({ generated_metadata: generatedMetadata })],
  });
  const second = createPreviewArchivePlan({
    profile: createProfile(),
    source_snapshots: [createSnapshot({ generated_metadata: generatedMetadata })],
  });

  assert.equal(first.plan_id, second.plan_id);
  assert.equal(first.filesystem_mutation_allowed, false);
  assert.equal(first.execution_allowed, false);
  assert.equal(first.automatic_approval_allowed, false);

  const item = first.items[0];
  assert.equal(item.enrichment.enabled, true);
  assert.equal(item.enrichment.status, 'ready');
  assert.equal(item.enrichment.provider_neutral, true);
  assert.equal(item.enrichment.filesystem_mutation_allowed, false);
  assert.equal(item.enrichment.execution_allowed, false);
  assert.equal(item.enrichment.automatic_approval_allowed, false);
  assert.deepEqual(item.enrichment.metadata.tags.value, ['finance', 'invoice']);
  assert.equal(item.enrichment.metadata.summary.ai_generated, true);
  assert.deepEqual(item.ai_generated_fields, ['classification', 'summary', 'tags']);
  assert.equal(item.evidence_refs.some((entry) => entry.locator === 'page=2'), true);
  assert.equal(Object.isFrozen(item.enrichment), true);
});

test('preview planner makes normalized enrichment part of deterministic item identity', () => {
  const baseMetadata = {
    summary: {
      value: 'First summary',
      generated_by: 'provider-neutral-model',
      evidence_refs: [{
        type: 'document_text',
        source_path: path.resolve('fixtures/source/invoice.pdf'),
        locator: 'page=1',
      }],
    },
  };
  const changedMetadata = {
    summary: {
      ...baseMetadata.summary,
      value: 'Changed summary',
    },
  };

  const first = createPreviewArchivePlan({
    profile: createProfile(),
    source_snapshots: [createSnapshot({ generated_metadata: baseMetadata })],
  });
  const changed = createPreviewArchivePlan({
    profile: createProfile(),
    source_snapshots: [createSnapshot({ generated_metadata: changedMetadata })],
  });

  assert.notEqual(first.items[0].plan_item_id, changed.items[0].plan_item_id);
  assert.notEqual(first.plan_id, changed.plan_id);
});

test('preview planner honors profile enrichment disable switch and fails closed on generated input', () => {
  const disabledProfile = createProfile({ metadata_enrichment_enabled: false });

  const withoutGeneratedMetadata = createPreviewArchivePlan({
    profile: disabledProfile,
    source_snapshots: [createSnapshot({ generated_metadata: {} })],
  });
  assert.equal(withoutGeneratedMetadata.items[0].enrichment.enabled, false);
  assert.equal(withoutGeneratedMetadata.items[0].enrichment.status, 'disabled');
  assert.deepEqual(withoutGeneratedMetadata.items[0].enrichment.metadata, {});

  assert.throws(
    () => createPreviewArchivePlan({
      profile: disabledProfile,
      source_snapshots: [createSnapshot({
        generated_metadata: {
          summary: {
            value: 'Must be rejected',
            generated_by: 'provider-neutral-model',
            evidence_refs: [{
              type: 'document_text',
              source_path: path.resolve('fixtures/source/invoice.pdf'),
              locator: 'page=1',
            }],
          },
        },
      })],
    }),
    /AI_ENRICHMENT_DISABLED/,
  );
});

test('preview planner rejects malformed or unsupported generated enrichment through policy boundary', () => {
  assert.throws(
    () => createPreviewArchivePlan({
      profile: createProfile(),
      source_snapshots: [createSnapshot({
        generated_metadata: {
          arbitrary: {
            value: 'not allowed',
            generated_by: 'provider-neutral-model',
            evidence_refs: [{
              type: 'document_text',
              source_path: path.resolve('fixtures/source/invoice.pdf'),
              locator: 'page=1',
            }],
          },
        },
      })],
    }),
    /ENRICHMENT_FIELD_NOT_ALLOWED:arbitrary/,
  );

  assert.throws(
    () => createPreviewArchivePlan({
      profile: createProfile(),
      source_snapshots: [createSnapshot({
        generated_metadata: {
          summary: {
            value: 'Missing evidence',
            generated_by: 'provider-neutral-model',
            evidence_refs: [],
          },
        },
      })],
    }),
    /AI_EVIDENCE_REQUIRED:summary/,
  );
});
