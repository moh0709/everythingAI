import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  deriveArchiveMetadataProvenance,
  getArchiveEnrichmentState,
} from '../apps/everything-ai-ui/src/admin/archiveReviewModel.ts';

function item(overrides = {}) {
  return {
    plan_item_id: 'item-1',
    source_path: '/source/report.pdf',
    suggested_archive_path: '/archive/report.pdf',
    approval_status: 'pending',
    conflict_status: 'none',
    stale_state: 'current',
    ai_generated_fields: [],
    evidence_refs: [],
    ...overrides,
  };
}

test('Admin model exposes enabled, disabled, and not-supplied enrichment state', () => {
  assert.equal(getArchiveEnrichmentState(item()), 'not_supplied');
  assert.equal(getArchiveEnrichmentState(item({ enrichment: { enabled: false, status: 'disabled', metadata: {} } })), 'disabled');
  assert.equal(getArchiveEnrichmentState(item({ enrichment: { enabled: true, status: 'ready', metadata: {} } })), 'enabled');
});

test('Admin model distinguishes AI-generated and user-edited metadata provenance', () => {
  const views = deriveArchiveMetadataProvenance(item({
    enrichment: {
      enabled: true,
      status: 'ready',
      metadata: {
        summary: {
          value: 'AI summary',
          generated_by: 'provider-neutral-model',
          ai_generated: true,
          evidence_refs: [{ type: 'text', source_path: '/source/report.pdf', locator: 'page=1' }],
        },
        classification: {
          value: 'Finance',
          generated_by: null,
          ai_generated: false,
          evidence_refs: [],
          user_provenance: {
            edited_by: 'user-7',
            edited_at: '2026-09-18T13:30:00.000Z',
            replaced_ai_generated: true,
            prior_generated_by: 'provider-neutral-model',
            prior_evidence_refs: [
              { type: 'text', source_path: '/source/report.pdf', locator: 'page=2' },
              { type: 'text', source_path: '/source/report.pdf', locator: 'page=3' },
            ],
          },
        },
        tags: {
          value: ['reviewed'],
          generated_by: null,
          ai_generated: false,
          evidence_refs: [],
          user_provenance: {
            edited_by: 'user-8',
            edited_at: '2026-09-18T13:31:00.000Z',
            replaced_ai_generated: false,
            prior_generated_by: null,
            prior_evidence_refs: [],
          },
        },
      },
    },
  }));

  assert.deepEqual(views.map((entry) => entry.field), ['classification', 'summary', 'tags']);

  const classification = views.find((entry) => entry.field === 'classification');
  assert.equal(classification.origin, 'user_edited');
  assert.equal(classification.edited_by, 'user-7');
  assert.equal(classification.replaced_ai_generated, true);
  assert.equal(classification.prior_generated_by, 'provider-neutral-model');
  assert.equal(classification.prior_evidence_count, 2);

  const summary = views.find((entry) => entry.field === 'summary');
  assert.equal(summary.origin, 'ai_generated');
  assert.equal(summary.generated_by, 'provider-neutral-model');
  assert.equal(summary.evidence_count, 1);

  const tags = views.find((entry) => entry.field === 'tags');
  assert.equal(tags.origin, 'user_authored');
  assert.equal(tags.edited_by, 'user-8');
});

test('Admin enrichment UI contract remains preference/review-only with no execution authority', () => {
  const source = fs.readFileSync(
    'apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx',
    'utf8',
  );

  assert.match(source, /AI metadata enrichment/);
  assert.match(source, /Enabled for future preview generation/);
  assert.match(source, /does not call a model/);
  assert.match(source, /does not execute filesystem writes/);
  assert.match(source, /No execute\/run action exists/);
  assert.match(source, /Metadata provenance/);
  assert.match(source, /replaced AI-generated value/);
});
