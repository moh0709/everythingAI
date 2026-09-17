import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyArchiveApprovalIntent,
  deriveArchiveBulkReviewSummary,
  filterArchiveReviewItems,
  isArchiveReviewItemBlocked,
} from '../apps/everything-ai-ui/src/admin/archiveReviewModel.ts';

function item(id, staleState, overrides = {}) {
  return {
    plan_item_id: id,
    source_path: `/source/${id}.pdf`,
    suggested_archive_path: `/archive/${id}.pdf`,
    approval_status: 'pending',
    conflict_status: 'none',
    stale_state: staleState,
    review_mode: staleState === 'archive_changed' || staleState === 'conflict'
      ? 'manual_review'
      : 'update_preview',
    ai_generated_fields: [],
    evidence_refs: [],
    ...overrides,
  };
}

const fixtures = [
  item('current', 'current'),
  item('source', 'source_changed'),
  item('missing', 'archive_missing'),
  item('archive', 'archive_changed'),
  item('sidecar', 'sidecar_missing'),
  item('conflict', 'conflict'),
];

test('stale filter returns every non-current stale state', () => {
  assert.deepEqual(
    filterArchiveReviewItems(fixtures, 'stale').map((entry) => entry.plan_item_id),
    ['source', 'missing', 'archive', 'sidecar', 'conflict'],
  );
});

test('exact stale-state filters expose source/archive/sidecar/conflict review queues', () => {
  for (const staleState of ['source_changed', 'archive_missing', 'archive_changed', 'sidecar_missing', 'conflict']) {
    const filtered = filterArchiveReviewItems(fixtures, staleState);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].stale_state, staleState);
  }
});

test('manual-review stale states block approval intent while preview stale states remain reviewable', () => {
  assert.equal(isArchiveReviewItemBlocked(item('source', 'source_changed')), false);
  assert.equal(isArchiveReviewItemBlocked(item('missing', 'archive_missing')), false);
  assert.equal(isArchiveReviewItemBlocked(item('sidecar', 'sidecar_missing')), false);
  assert.equal(isArchiveReviewItemBlocked(item('archive', 'archive_changed')), true);
  assert.equal(isArchiveReviewItemBlocked(item('conflict', 'conflict')), true);

  const selected = new Set(['source', 'archive', 'conflict']);
  const updated = applyArchiveApprovalIntent(fixtures, selected, 'approved');
  assert.equal(updated.find((entry) => entry.plan_item_id === 'source').approval_status, 'approved');
  assert.equal(updated.find((entry) => entry.plan_item_id === 'archive').approval_status, 'pending');
  assert.equal(updated.find((entry) => entry.plan_item_id === 'conflict').approval_status, 'pending');
});

test('bulk summary exposes stale and per-state counts and blocks approve-all for manual-review selections', () => {
  const summary = deriveArchiveBulkReviewSummary(fixtures, new Set(fixtures.map((entry) => entry.plan_item_id)));

  assert.equal(summary.selected_count, 6);
  assert.equal(summary.stale_count, 5);
  assert.equal(summary.conflict_count, 2);
  assert.equal(summary.reviewable_count, 4);
  assert.equal(summary.can_approve_all, false);
  assert.deepEqual(summary.stale_state_counts, {
    current: 1,
    source_changed: 1,
    archive_missing: 1,
    archive_changed: 1,
    sidecar_missing: 1,
    conflict: 1,
  });
});

test('existing conflict_status blocking remains inherited alongside stale-state blocking', () => {
  const blocked = item('legacy', 'current', { conflict_status: 'stale' });
  assert.equal(isArchiveReviewItemBlocked(blocked), true);
});
