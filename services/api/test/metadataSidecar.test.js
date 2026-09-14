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
