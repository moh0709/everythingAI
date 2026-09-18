import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArchiveEnrichment } from '../src/archive/archiveEnrichmentPolicy.js';

function profile(overrides = {}) {
  return {
    id: 'profile-1',
    name: 'Knowledge Archive',
    source_roots: [{ path: '/source/knowledge' }],
    archive_destination: '/archive/knowledge',
    copy_policy: 'copy_first',
    overwrite_policy: 'never_without_explicit_approval',
    approval_policy: 'manual_before_execution',
    metadata_enrichment_enabled: true,
    ...overrides,
  };
}

function evidence(locator = 'page=1') {
  return [{ type: 'document_text', source_path: '/source/knowledge/report.pdf', locator }];
}

test('normalizes bounded AI metadata with field-level provenance and no mutation authority', () => {
  const result = normalizeArchiveEnrichment({
    profile: profile(),
    generated_metadata: {
      tags: {
        value: ['finance', 'invoice', 'finance'],
        generated_by: 'provider-neutral-model',
        evidence_refs: [...evidence('page=2'), ...evidence('page=2')],
      },
      summary: {
        value: 'Quarterly invoice summary',
        generated_by: 'provider-neutral-model',
        evidence_refs: evidence(),
      },
      classification: {
        value: 'Finance',
        generated_by: 'provider-neutral-model',
        evidence_refs: evidence('page=1'),
      },
    },
  });

  assert.equal(result.enabled, true);
  assert.equal(result.status, 'ready');
  assert.equal(result.provider_neutral, true);
  assert.equal(result.filesystem_mutation_allowed, false);
  assert.equal(result.execution_allowed, false);
  assert.equal(result.automatic_approval_allowed, false);
  assert.deepEqual(result.metadata.tags.value, ['finance', 'invoice']);
  assert.equal(result.metadata.summary.ai_generated, true);
  assert.equal(result.metadata.summary.generated_by, 'provider-neutral-model');
  assert.equal(result.metadata.tags.evidence_refs.length, 1);
  assert.deepEqual(Object.keys(result.metadata), ['classification', 'summary', 'tags']);
});

test('explicit profile disable switch blocks generated enrichment input', () => {
  const disabledProfile = profile({ metadata_enrichment_enabled: false });

  const disabled = normalizeArchiveEnrichment({
    profile: disabledProfile,
    generated_metadata: {},
  });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.status, 'disabled');
  assert.deepEqual(disabled.metadata, {});

  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: disabledProfile,
      generated_metadata: {
        summary: {
          value: 'Should not be accepted',
          generated_by: 'model',
          evidence_refs: evidence(),
        },
      },
    }),
    /AI_ENRICHMENT_DISABLED/,
  );
});

test('rejects unsupported fields and malformed generated values', () => {
  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        arbitrary_field: {
          value: 'not allowed',
          generated_by: 'model',
          evidence_refs: evidence(),
        },
      },
    }),
    /ENRICHMENT_FIELD_NOT_ALLOWED:arbitrary_field/,
  );

  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        summary: {
          value: '',
          generated_by: 'model',
          evidence_refs: evidence(),
        },
      },
    }),
    /ENRICHMENT_VALUE_REQUIRED:summary/,
  );

  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        tags: {
          value: ['valid', ''],
          generated_by: 'model',
          evidence_refs: evidence(),
        },
      },
    }),
    /INVALID_ENRICHMENT_TAG/,
  );
});

test('requires generator identity and evidence for every AI-generated field', () => {
  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        summary: {
          value: 'Missing generator',
          evidence_refs: evidence(),
        },
      },
    }),
    /GENERATED_BY_REQUIRED:summary/,
  );

  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        classification: {
          value: 'Finance',
          generated_by: 'model',
          evidence_refs: [],
        },
      },
    }),
    /AI_EVIDENCE_REQUIRED:classification/,
  );
});

test('normalizes and sorts evidence refs deterministically', () => {
  const result = normalizeArchiveEnrichment({
    profile: profile(),
    generated_metadata: {
      summary: {
        value: 'Evidence ordering test',
        generated_by: 'model',
        evidence_refs: [
          { type: 'document_text', source_path: '/source/knowledge/report.pdf', locator: 'page=3' },
          { type: 'document_text', source_path: '/source/knowledge/report.pdf', locator: 'page=1' },
          { type: 'document_text', source_path: '/source/knowledge/report.pdf', locator: 'page=3' },
        ],
      },
    },
  });

  assert.deepEqual(
    result.metadata.summary.evidence_refs.map((entry) => entry.locator),
    ['page=1', 'page=3'],
  );
});

test('rejects secret-bearing metadata keys, values and evidence locations', () => {
  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        summary: {
          value: 'safe',
          generated_by: 'model',
          evidence_refs: evidence(),
          api_key: 'secret',
        },
      },
    }),
    /SENSITIVE_FIELD_FORBIDDEN/,
  );

  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        summary: {
          value: 'https://example.test/report?token=secret',
          generated_by: 'model',
          evidence_refs: evidence(),
        },
      },
    }),
    /SECRET_BEARING_VALUE_FORBIDDEN/,
  );

  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile(),
      generated_metadata: {
        summary: {
          value: 'safe',
          generated_by: 'model',
          evidence_refs: [{
            type: 'document_text',
            source_path: '/source/knowledge/report.pdf',
            locator: 'https://example.test/page?api_key=secret',
          }],
        },
      },
    }),
    /SECRET_BEARING_VALUE_FORBIDDEN/,
  );
});

test('rejects invalid archive profiles before evaluating enrichment', () => {
  assert.throws(
    () => normalizeArchiveEnrichment({
      profile: profile({ copy_policy: 'move_originals' }),
      generated_metadata: {},
    }),
    (error) => error?.message === 'INVALID_ARCHIVE_PROFILE'
      && error.validation?.errors.some((item) => item.code === 'COPY_FIRST_REQUIRED'),
  );
});
