import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isSameOrNestedPath(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function sha256File(filePath) {
  const data = await fs.readFile(filePath);
  return `sha256:${crypto.createHash('sha256').update(data).digest('hex')}`;
}

async function fingerprintFile(filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) throw new Error('SOURCE_NOT_FILE');
  return Object.freeze({
    hash: await sha256File(filePath),
    size_bytes: stat.size,
    mtime_ms: stat.mtimeMs,
  });
}

function fingerprintsMatch(expected = {}, actual = {}) {
  return normalizeString(expected.hash) === normalizeString(actual.hash)
    && expected.size_bytes === actual.size_bytes
    && Math.abs(Number(expected.mtime_ms) - Number(actual.mtime_ms)) < 1;
}

function requireExecutablePlanItem(plan, planItemId) {
  if (!plan || plan.mode !== 'preview_only' || !Array.isArray(plan.items)) {
    throw new Error('INVALID_ARCHIVE_PLAN');
  }

  const item = plan.items.find((entry) => entry?.plan_item_id === planItemId);
  if (!item) throw new Error('PLAN_ITEM_NOT_FOUND');
  if (item.action !== 'copy') throw new Error('UNSUPPORTED_ARCHIVE_ACTION');
  if (item.requires_approval !== true) throw new Error('PLAN_ITEM_APPROVAL_CONTRACT_INVALID');
  if (item.conflict_status !== 'none') throw new Error('PLAN_ITEM_CONFLICT_REQUIRES_REVIEW');

  const destination = path.resolve(item.suggested_archive_path);
  const archiveRoot = path.resolve(plan.archive_destination);
  if (!isSameOrNestedPath(archiveRoot, destination)) {
    throw new Error('ARCHIVE_DESTINATION_OUTSIDE_PLAN_ROOT');
  }

  return { item, destination, archiveRoot };
}

function validateApproval({ plan, item, destination, approval }) {
  if (!approval || approval.approved !== true) throw new Error('EXPLICIT_APPROVAL_REQUIRED');
  if (approval.plan_id !== plan.plan_id) throw new Error('APPROVAL_PLAN_MISMATCH');
  if (approval.plan_item_id !== item.plan_item_id) throw new Error('APPROVAL_PLAN_ITEM_MISMATCH');
  if (path.resolve(normalizeString(approval.destination)) !== destination) {
    throw new Error('APPROVAL_DESTINATION_MISMATCH');
  }
  if (!fingerprintsMatch(item.source_fingerprint, approval.source_fingerprint)) {
    throw new Error('APPROVAL_SOURCE_FINGERPRINT_MISMATCH');
  }
}

export async function executeApprovedArchiveCopy({ plan, plan_item_id: planItemId, approval } = {}) {
  const { item, destination, archiveRoot } = requireExecutablePlanItem(plan, normalizeString(planItemId));
  validateApproval({ plan, item, destination, approval });

  const sourcePath = path.resolve(item.source_path);
  const sourceBefore = await fingerprintFile(sourcePath);
  if (!fingerprintsMatch(item.source_fingerprint, sourceBefore)) {
    throw new Error('SOURCE_FINGERPRINT_STALE');
  }

  await fs.mkdir(path.dirname(destination), { recursive: true });

  try {
    await fs.copyFile(sourcePath, destination, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('ARCHIVE_DESTINATION_EXISTS');
    throw error;
  }

  let archiveFingerprint;
  try {
    archiveFingerprint = await fingerprintFile(destination);
    const sourceAfter = await fingerprintFile(sourcePath);
    if (!fingerprintsMatch(sourceBefore, sourceAfter)) {
      await fs.rm(destination, { force: true });
      throw new Error('SOURCE_CHANGED_DURING_COPY');
    }

    if (archiveFingerprint.hash !== sourceBefore.hash || archiveFingerprint.size_bytes !== sourceBefore.size_bytes) {
      await fs.rm(destination, { force: true });
      throw new Error('ARCHIVE_COPY_VERIFICATION_FAILED');
    }
  } catch (error) {
    if (error?.message === 'SOURCE_CHANGED_DURING_COPY' || error?.message === 'ARCHIVE_COPY_VERIFICATION_FAILED') {
      throw error;
    }
    await fs.rm(destination, { force: true });
    throw error;
  }

  return Object.freeze({
    status: 'copied',
    plan_id: plan.plan_id,
    plan_item_id: item.plan_item_id,
    action: 'copy',
    source_path: sourcePath,
    archive_path: destination,
    archive_root: archiveRoot,
    source_fingerprint: sourceBefore,
    archive_fingerprint: archiveFingerprint,
    source_mutated: false,
    overwrite_performed: false,
    approval_required: true,
  });
}
