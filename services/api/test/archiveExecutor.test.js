import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPreviewArchivePlan } from '../src/archive/archivePlanner.js';
import { executeApprovedArchiveCopy } from '../src/archive/archiveExecutor.js';

async function fingerprint(filePath) {
  const data = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  return {
    hash: `sha256:${crypto.createHash('sha256').update(data).digest('hex')}`,
    size_bytes: stat.size,
    mtime_ms: stat.mtimeMs,
  };
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-archive-executor-'));
  const sourceRoot = path.join(root, 'source');
  const archiveRoot = path.join(root, 'archive');
  await fs.mkdir(sourceRoot, { recursive: true });
  const sourcePath = path.join(sourceRoot, 'invoice.txt');
  await fs.writeFile(sourcePath, 'approved archive content', 'utf8');
  const sourceFingerprint = await fingerprint(sourcePath);

  const profile = {
    id: 'profile-1',
    name: 'Archive Test',
    source_roots: [{ path: sourceRoot }],
    archive_destination: archiveRoot,
  };

  const plan = createPreviewArchivePlan({
    profile,
    source_snapshots: [{
      source_path: sourcePath,
      source_fingerprint: sourceFingerprint,
      suggested_relative_path: path.join('Finance', 'invoice.txt'),
    }],
  });

  const item = plan.items[0];
  const approval = {
    approved: true,
    plan_id: plan.plan_id,
    plan_item_id: item.plan_item_id,
    destination: item.suggested_archive_path,
    source_fingerprint: { ...item.source_fingerprint },
  };

  return { root, sourceRoot, archiveRoot, sourcePath, sourceFingerprint, plan, item, approval };
}

async function cleanup(root) {
  await fs.rm(root, { recursive: true, force: true });
}

test('copies an explicitly approved plan item without mutating the source', async () => {
  const data = await fixture();
  try {
    const sourceBefore = await fs.readFile(data.sourcePath, 'utf8');
    const result = await executeApprovedArchiveCopy({
      plan: data.plan,
      plan_item_id: data.item.plan_item_id,
      approval: data.approval,
    });

    assert.equal(result.status, 'copied');
    assert.equal(result.source_mutated, false);
    assert.equal(result.overwrite_performed, false);
    assert.equal(result.approval_required, true);
    assert.equal(await fs.readFile(data.item.suggested_archive_path, 'utf8'), sourceBefore);
    assert.equal(await fs.readFile(data.sourcePath, 'utf8'), sourceBefore);
    assert.equal(result.archive_fingerprint.hash, result.source_fingerprint.hash);
  } finally {
    await cleanup(data.root);
  }
});

test('fails closed without explicit approval', async () => {
  const data = await fixture();
  try {
    await assert.rejects(
      executeApprovedArchiveCopy({ plan: data.plan, plan_item_id: data.item.plan_item_id }),
      /EXPLICIT_APPROVAL_REQUIRED/,
    );
    await assert.rejects(fs.access(data.item.suggested_archive_path));
  } finally {
    await cleanup(data.root);
  }
});

test('rejects approval bound to a different plan item or destination', async () => {
  const data = await fixture();
  try {
    await assert.rejects(
      executeApprovedArchiveCopy({
        plan: data.plan,
        plan_item_id: data.item.plan_item_id,
        approval: { ...data.approval, plan_item_id: 'other-item' },
      }),
      /APPROVAL_PLAN_ITEM_MISMATCH/,
    );

    await assert.rejects(
      executeApprovedArchiveCopy({
        plan: data.plan,
        plan_item_id: data.item.plan_item_id,
        approval: { ...data.approval, destination: path.join(data.archiveRoot, 'other.txt') },
      }),
      /APPROVAL_DESTINATION_MISMATCH/,
    );
  } finally {
    await cleanup(data.root);
  }
});

test('rejects a stale source before copying', async () => {
  const data = await fixture();
  try {
    await new Promise((resolve) => setTimeout(resolve, 5));
    await fs.writeFile(data.sourcePath, 'changed after preview', 'utf8');

    await assert.rejects(
      executeApprovedArchiveCopy({
        plan: data.plan,
        plan_item_id: data.item.plan_item_id,
        approval: data.approval,
      }),
      /SOURCE_FINGERPRINT_STALE/,
    );
    await assert.rejects(fs.access(data.item.suggested_archive_path));
  } finally {
    await cleanup(data.root);
  }
});

test('never overwrites an existing archive destination', async () => {
  const data = await fixture();
  try {
    await fs.mkdir(path.dirname(data.item.suggested_archive_path), { recursive: true });
    await fs.writeFile(data.item.suggested_archive_path, 'existing archive file', 'utf8');

    await assert.rejects(
      executeApprovedArchiveCopy({
        plan: data.plan,
        plan_item_id: data.item.plan_item_id,
        approval: data.approval,
      }),
      /ARCHIVE_DESTINATION_EXISTS/,
    );
    assert.equal(await fs.readFile(data.item.suggested_archive_path, 'utf8'), 'existing archive file');
  } finally {
    await cleanup(data.root);
  }
});

test('rejects a plan item whose destination escapes the archive root', async () => {
  const data = await fixture();
  try {
    const unsafeItem = {
      ...data.item,
      suggested_archive_path: path.join(data.root, 'escaped.txt'),
    };
    const unsafePlan = { ...data.plan, items: [unsafeItem] };
    const unsafeApproval = {
      ...data.approval,
      destination: unsafeItem.suggested_archive_path,
    };

    await assert.rejects(
      executeApprovedArchiveCopy({
        plan: unsafePlan,
        plan_item_id: unsafeItem.plan_item_id,
        approval: unsafeApproval,
      }),
      /ARCHIVE_DESTINATION_OUTSIDE_PLAN_ROOT/,
    );
  } finally {
    await cleanup(data.root);
  }
});
