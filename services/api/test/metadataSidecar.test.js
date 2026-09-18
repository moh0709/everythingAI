import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildMetadataSidecar, writeMetadataSidecar } from '../src/archive/metadataSidecar.js';

function fixture(root) {
  const archivePath = path.join(root, 'archive', 'invoice.pdf');
  return {
    execution: {
      status: 'copied',
      execution_id: 'exec-1',
      plan_id: 'plan-1',
      plan_item_id: 'item-1',
      source_path: path.join(root, 'source', 'invoice.pdf'),
      archive_path: archivePath,
      source_fingerprint: { hash: 'sha256:source', size_bytes: 10, mtime_ms: 1 },
      archive_fingerprint: { hash: 'sha256:archive', size_bytes: 10, mtime_ms: 2 },
    },
    approval: {
      approved: true,
      approved_by: 'user-1',
      approved_at: '2026-09-14T18:00:00.000Z',
      plan_id: 'plan-1',
      plan_item_id: 'item-1',
    },
    metadata: {
      summary: {
        value: 'Invoice summary',
        generated_by: 'EverythingAI',
        ai_generated: true,
        evidence_refs: [{ type: 'text', source_path: 'invoice.pdf', locator: 'page=1' }],
      },
    },
    created_at: '2026-09-14T18:00:00.000Z',
  };
}

test('builds provenance-rich sidecar only from accepted execution evidence', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const input = fixture(root);
  const sidecar = buildMetadataSidecar(input);
  assert.equal(sidecar.approval.plan_id, 'plan-1');
  assert.equal(sidecar.metadata.summary.ai_generated, true);
  assert.equal(sidecar.metadata.summary.evidence_refs.length, 1);
});

test('writes sidecar with no-overwrite create semantics', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const input = fixture(root);
  await fs.mkdir(path.dirname(input.execution.archive_path), { recursive: true });
  await fs.writeFile(input.execution.archive_path, 'archive');
  const first = await writeMetadataSidecar(input);
  assert.equal(first.sidecar_path, `${input.execution.archive_path}.everythingai.json`);
  await assert.rejects(() => writeMetadataSidecar(input), /EEXIST/);
});

test('rejects missing AI evidence and mismatched approval', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const input = fixture(root);
  input.metadata.summary.evidence_refs = [];
  assert.throws(() => buildMetadataSidecar(input), /AI_EVIDENCE_REQUIRED/);

  const other = fixture(root);
  other.approval.plan_item_id = 'wrong-item';
  assert.throws(() => buildMetadataSidecar(other), /APPROVAL_SCOPE_MISMATCH/);
});

test('rejects secret-bearing metadata fields and URLs', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const keyed = fixture(root);
  keyed.metadata.api_key = { value: 'secret', ai_generated: false, evidence_refs: [] };
  assert.throws(() => buildMetadataSidecar(keyed), /SENSITIVE_FIELD_FORBIDDEN/);

  const url = fixture(root);
  url.metadata.summary.value = 'https://example.com/?token=secret';
  assert.throws(() => buildMetadataSidecar(url), /SECRET_BEARING_VALUE_FORBIDDEN/);
});


test('builds sidecar metadata directly from accepted planner enrichment evidence', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const input = fixture(root);
  input.metadata = {};
  input.plan_item = {
    plan_item_id: 'item-1',
    enrichment: {
      filesystem_mutation_allowed: false,
      execution_allowed: false,
      automatic_approval_allowed: false,
      metadata: {
        classification: {
          value: 'Finance',
          generated_by: 'provider-neutral-model',
          ai_generated: true,
          evidence_refs: [{ type: 'document_text', source_path: 'invoice.pdf', locator: 'page=1' }],
        },
        tags: {
          value: ['finance', 'invoice'],
          generated_by: 'provider-neutral-model',
          ai_generated: true,
          evidence_refs: [{ type: 'document_text', source_path: 'invoice.pdf', locator: 'page=2' }],
        },
      },
    },
  };

  const sidecar = buildMetadataSidecar(input);
  assert.equal(sidecar.metadata.classification.ai_generated, true);
  assert.equal(sidecar.metadata.classification.generated_by, 'provider-neutral-model');
  assert.deepEqual(sidecar.metadata.tags.value, ['finance', 'invoice']);
  assert.equal(sidecar.metadata.classification.user_provenance, null);
});

test('user metadata can replace AI value with explicit provenance without inheriting AI evidence', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const input = fixture(root);
  input.metadata = {};
  input.plan_item = {
    plan_item_id: 'item-1',
    enrichment: {
      filesystem_mutation_allowed: false,
      execution_allowed: false,
      automatic_approval_allowed: false,
      metadata: {
        summary: {
          value: 'AI summary',
          generated_by: 'provider-neutral-model',
          ai_generated: true,
          evidence_refs: [{ type: 'document_text', source_path: 'invoice.pdf', locator: 'page=1' }],
        },
      },
    },
  };
  input.user_metadata = {
    summary: {
      value: 'Reviewed human summary',
      edited_by: 'user-7',
      edited_at: '2026-09-18T13:00:00.000Z',
    },
  };

  const sidecar = buildMetadataSidecar(input);
  assert.equal(sidecar.metadata.summary.value, 'Reviewed human summary');
  assert.equal(sidecar.metadata.summary.ai_generated, false);
  assert.equal(sidecar.metadata.summary.generated_by, null);
  assert.deepEqual(sidecar.metadata.summary.evidence_refs, []);
  assert.equal(sidecar.metadata.summary.user_provenance.edited_by, 'user-7');
  assert.equal(sidecar.metadata.summary.user_provenance.replaced_ai_generated, true);
  assert.equal(sidecar.metadata.summary.user_provenance.prior_generated_by, 'provider-neutral-model');
  assert.equal(sidecar.metadata.summary.user_provenance.prior_evidence_refs.length, 1);
});

test('user metadata can supplement bounded metadata with explicit provenance', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const input = fixture(root);
  input.metadata = {};
  input.user_metadata = {
    tags: {
      value: ['reviewed', 'finance', 'reviewed'],
      edited_by: 'user-9',
      edited_at: '2026-09-18T13:05:00.000Z',
    },
  };

  const sidecar = buildMetadataSidecar(input);
  assert.deepEqual(sidecar.metadata.tags.value, ['finance', 'reviewed']);
  assert.equal(sidecar.metadata.tags.ai_generated, false);
  assert.equal(sidecar.metadata.tags.user_provenance.replaced_ai_generated, false);
  assert.equal(sidecar.metadata.tags.user_provenance.prior_generated_by, null);
});

test('sidecar fails closed for ambiguous metadata source or unsafe enrichment authority', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const ambiguous = fixture(root);
  ambiguous.plan_item = {
    plan_item_id: 'item-1',
    enrichment: {
      filesystem_mutation_allowed: false,
      execution_allowed: false,
      automatic_approval_allowed: false,
      metadata: {},
    },
  };
  assert.throws(() => buildMetadataSidecar(ambiguous), /METADATA_SOURCE_AMBIGUOUS/);

  const unsafe = fixture(root);
  unsafe.metadata = {};
  unsafe.plan_item = {
    plan_item_id: 'item-1',
    enrichment: {
      filesystem_mutation_allowed: true,
      execution_allowed: false,
      automatic_approval_allowed: false,
      metadata: {},
    },
  };
  assert.throws(() => buildMetadataSidecar(unsafe), /UNSAFE_ENRICHMENT_AUTHORITY/);
});

test('sidecar rejects plan item scope mismatch and malformed user provenance', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const mismatch = fixture(root);
  mismatch.metadata = {};
  mismatch.plan_item = {
    plan_item_id: 'other-item',
    enrichment: {
      filesystem_mutation_allowed: false,
      execution_allowed: false,
      automatic_approval_allowed: false,
      metadata: {},
    },
  };
  assert.throws(() => buildMetadataSidecar(mismatch), /PLAN_ITEM_SCOPE_MISMATCH/);

  const missingEditor = fixture(root);
  missingEditor.metadata = {};
  missingEditor.user_metadata = {
    summary: {
      value: 'Human summary',
      edited_at: '2026-09-18T13:10:00.000Z',
    },
  };
  assert.throws(() => buildMetadataSidecar(missingEditor), /EDITED_BY_REQUIRED:summary/);

  const unsupported = fixture(root);
  unsupported.metadata = {};
  unsupported.user_metadata = {
    arbitrary: {
      value: 'not allowed',
      edited_by: 'user-1',
      edited_at: '2026-09-18T13:10:00.000Z',
    },
  };
  assert.throws(() => buildMetadataSidecar(unsupported), /USER_METADATA_FIELD_NOT_ALLOWED:arbitrary/);
});

test('user provenance and plan enrichment reject secret-bearing values', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-sidecar-'));
  const userSecret = fixture(root);
  userSecret.metadata = {};
  userSecret.user_metadata = {
    summary: {
      value: 'https://example.test/?token=secret',
      edited_by: 'user-1',
      edited_at: '2026-09-18T13:10:00.000Z',
    },
  };
  assert.throws(() => buildMetadataSidecar(userSecret), /SECRET_BEARING_VALUE_FORBIDDEN/);

  const planSecret = fixture(root);
  planSecret.metadata = {};
  planSecret.plan_item = {
    plan_item_id: 'item-1',
    enrichment: {
      filesystem_mutation_allowed: false,
      execution_allowed: false,
      automatic_approval_allowed: false,
      metadata: {
        summary: {
          value: 'https://example.test/?api_key=secret',
          generated_by: 'provider-neutral-model',
          ai_generated: true,
          evidence_refs: [{ type: 'document_text', source_path: 'invoice.pdf', locator: 'page=1' }],
        },
      },
    },
  };
  assert.throws(() => buildMetadataSidecar(planSecret), /SECRET_BEARING_VALUE_FORBIDDEN/);
});
