import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildScopedObjectKey } from './objectStorage.js';

function normalizeScope(scope) {
  if (!scope || typeof scope !== 'object') {
    throw new Error('Tenant and workspace scope are required');
  }
  const tenantId = typeof scope.tenantId === 'string' ? scope.tenantId.trim() : '';
  const workspaceId = typeof scope.workspaceId === 'string' ? scope.workspaceId.trim() : '';
  if (!tenantId || !workspaceId) {
    throw new Error('Tenant and workspace scope are required');
  }
  return { tenantId, workspaceId };
}

function normalizeDocumentId(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Migration documentId is required');
  }
  return value.trim();
}

function normalizeRelativePath(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Invalid relative path');
  }
  const normalized = value.trim();
  if (path.isAbsolute(normalized)) throw new Error('Invalid relative path');
  return normalized;
}

function ensureInsideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Source path resolved outside migration root');
  }
}

function deterministicObjectId(scope, documentId) {
  const digest = crypto
    .createHash('sha256')
    .update(`${scope.tenantId}\u0000${scope.workspaceId}\u0000${documentId}`)
    .digest('hex');
  return `obj-${digest.slice(0, 32)}`;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export async function createLocalObjectMigrationPlan({ rootDir, scope, entries } = {}) {
  if (typeof rootDir !== 'string' || rootDir.trim().length === 0) {
    throw new Error('Migration rootDir is required');
  }
  if (!Array.isArray(entries)) {
    throw new Error('Migration entries are required');
  }

  const exactScope = normalizeScope(scope);
  const root = await fs.realpath(path.resolve(rootDir));
  const normalizedEntries = entries.map((entry) => ({
    documentId: normalizeDocumentId(entry?.documentId),
    relativePath: normalizeRelativePath(entry?.relativePath),
    contentType: typeof entry?.contentType === 'string' && entry.contentType.trim().length > 0
      ? entry.contentType.trim()
      : null,
  }));

  const uniqueDocumentIds = new Set(normalizedEntries.map((entry) => entry.documentId));
  if (uniqueDocumentIds.size !== normalizedEntries.length) {
    throw new Error('Migration documentId values must be unique');
  }

  normalizedEntries.sort((a, b) => a.documentId.localeCompare(b.documentId));

  const items = [];
  for (const entry of normalizedEntries) {
    const lexicalCandidate = path.resolve(root, entry.relativePath);
    ensureInsideRoot(root, lexicalCandidate);

    let sourcePath;
    try {
      sourcePath = await fs.realpath(lexicalCandidate);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(`Migration source is missing for document ${entry.documentId}`);
      }
      throw error;
    }
    ensureInsideRoot(root, sourcePath);

    const stat = await fs.stat(sourcePath);
    if (!stat.isFile()) {
      throw new Error(`Migration source must be a file for document ${entry.documentId}`);
    }

    const body = await fs.readFile(sourcePath);
    const objectId = deterministicObjectId(exactScope, entry.documentId);
    items.push({
      documentId: entry.documentId,
      sourceRelativePath: entry.relativePath,
      objectId,
      storageKey: buildScopedObjectKey(exactScope, objectId),
      size: body.length,
      checksumSha256: sha256(body),
      checksumComputedForPlan: true,
      checksumVerifiedForCutover: false,
      contentType: entry.contentType,
      migrationState: 'planned',
      action: 'plan-copy',
    });
  }

  return {
    mode: 'dry-run',
    destructive: false,
    scope: exactScope,
    items,
  };
}