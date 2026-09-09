import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createLocalObjectStorageAdapter } from '../src/storage/objectStorage.js';
import {
  createEnterpriseBackupManifest,
  validateEnterpriseRestoreCandidate,
} from '../src/enterprise/backupRestore.js';

const scope = { tenantId: 'tenant-phase4-a', workspaceId: 'workspace-phase4-a' };
const crossScope = { tenantId: 'tenant-phase4-b', workspaceId: 'workspace-phase4-a' };

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

test('disposable object store survives backup -> destructive wipe -> restore with integrity and isolation', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-phase4-object-'));
  const liveRoot = path.join(tempRoot, 'live');
  const backupRoot = path.join(tempRoot, 'backup');
  const adapter = createLocalObjectStorageAdapter({ rootDir: liveRoot });

  try {
    const objects = [
      { objectId: 'object-a', body: Buffer.from('phase4-object-a') },
      { objectId: 'object-b', body: Buffer.from('phase4-object-b') },
    ];

    const inventory = [];
    for (const object of objects) {
      const written = await adapter.putObject({ scope, objectId: object.objectId, body: object.body, contentType: 'text/plain' });
      inventory.push({
        objectId: object.objectId,
        storageKey: written.key,
        size: written.size,
        checksumSha256: sha256(object.body),
        checksumVerified: true,
      });
    }

    await fs.cp(liveRoot, backupRoot, { recursive: true });

    const manifest = createEnterpriseBackupManifest({
      scope,
      schemaVersion: '003_object_metadata',
      postgres: {
        backupId: 'phase4-disposable-postgres-backup',
        checksumSha256: 'a'.repeat(64),
        checksumVerified: true,
      },
      objects: inventory,
      createdAt: '2026-09-07T00:00:00.000Z',
    });

    await fs.rm(liveRoot, { recursive: true, force: true });
    const afterWipe = await adapter.getObject({ scope, objectId: 'object-a' });
    assert.equal(afterWipe.found, false);

    await fs.cp(backupRoot, liveRoot, { recursive: true });

    for (const expected of objects) {
      const restored = await adapter.getObject({ scope, objectId: expected.objectId });
      assert.equal(restored.found, true);
      assert.deepEqual(restored.body, expected.body);
      assert.equal(sha256(restored.body), sha256(expected.body));
    }

    const unauthorized = await adapter.getObject({ scope: crossScope, objectId: 'object-a' });
    assert.equal(unauthorized.found, false);

    const validation = await validateEnterpriseRestoreCandidate({
      manifest,
      trustedManifestSha256: manifest.manifestSha256,
      expectedScope: scope,
      scopeGuard: async (candidate) => candidate.tenantId === scope.tenantId && candidate.workspaceId === scope.workspaceId,
      targetGuard: async (target) => target?.isolated === true && target?.disposable === true && target?.id === 'restore-test-phase4',
      supportedSchemaVersions: ['003_object_metadata'],
      requireVerifiedChecksums: true,
      target: { isolated: true, disposable: true, id: 'restore-test-phase4' },
      adapters: {
        postgres: async () => ({ ok: true }),
        object: async ({ object }) => {
          const restored = await adapter.getObject({ scope, objectId: object.objectId });
          return {
            ok: restored.found
              && restored.size === object.size
              && sha256(restored.body) === object.checksumSha256,
          };
        },
      },
    });

    assert.equal(validation.status, 'validated');
    assert.equal(validation.productionRestorePerformed, false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('object recovery detects deliberately corrupted restored bytes', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-phase4-corrupt-'));
  const adapter = createLocalObjectStorageAdapter({ rootDir: tempRoot });

  try {
    const original = Buffer.from('trusted-phase4-payload');
    await adapter.putObject({ scope, objectId: 'corrupt-me', body: original });
    const restored = await adapter.getObject({ scope, objectId: 'corrupt-me' });
    assert.equal(sha256(restored.body), sha256(original));

    await adapter.putObject({ scope, objectId: 'corrupt-me', body: Buffer.from('tampered-phase4-payload') });
    const corrupted = await adapter.getObject({ scope, objectId: 'corrupt-me' });
    assert.notEqual(sha256(corrupted.body), sha256(original));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
