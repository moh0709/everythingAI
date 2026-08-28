import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEnterpriseBackupManifest,
  validateEnterpriseRestoreCandidate,
} from '../src/enterprise/backupRestore.js';

const scope = { tenantId: 'tenant-123', workspaceId: 'workspace-789' };

function baseInput() {
  return {
    scope,
    schemaVersion: '003_object_metadata',
    postgres: {
      backupId: 'pg-backup-2026-08-28T120000Z',
      checksumSha256: 'a'.repeat(64),
      checksumVerified: true,
    },
    objects: [
      {
        objectId: 'obj-b',
        storageKey: 'tenants/tenant-123/workspaces/workspace-789/objects/obj-b',
        size: 7,
        checksumSha256: 'b'.repeat(64),
        checksumVerified: false,
      },
      {
        objectId: 'obj-a',
        storageKey: 'tenants/tenant-123/workspaces/workspace-789/objects/obj-a',
        size: 5,
        checksumSha256: 'c'.repeat(64),
        checksumVerified: true,
      },
    ],
    createdAt: '2026-08-28T12:00:00.000Z',
  };
}

test('backup manifest is deterministic, provider-neutral, scoped and secret-free', () => {
  const first = createEnterpriseBackupManifest(baseInput());
  const reordered = baseInput();
  reordered.objects.reverse();
  const second = createEnterpriseBackupManifest(reordered);

  assert.deepEqual(first, second);
  assert.equal(first.kind, 'everythingai.enterprise-backup-manifest');
  assert.equal(first.version, 1);
  assert.equal(first.scope.tenantId, scope.tenantId);
  assert.equal(first.scope.workspaceId, scope.workspaceId);
  assert.deepEqual(first.objects.map((item) => item.objectId), ['obj-a', 'obj-b']);
  assert.match(first.manifestSha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(first).includes('password'), false);
  assert.equal(JSON.stringify(first).includes('databaseUrl'), false);
  assert.equal(JSON.stringify(first).includes('accessKey'), false);
});

test('backup manifest rejects secret-bearing input instead of serializing it', () => {
  const input = baseInput();
  input.postgres.databaseUrl = 'postgres://user:secret@example/db';
  assert.throws(() => createEnterpriseBackupManifest(input), /secret|credential|connection/i);

  const s3Input = baseInput();
  s3Input.objects[0].accessKey = 'AKIA_TEST_SECRET';
  assert.throws(() => createEnterpriseBackupManifest(s3Input), /secret|credential/i);
});

test('manifest preserves checksum verification truth and never upgrades unverified evidence', () => {
  const manifest = createEnterpriseBackupManifest(baseInput());
  const unverified = manifest.objects.find((item) => item.objectId === 'obj-b');
  assert.equal(unverified.checksumVerified, false);
  assert.equal(unverified.checksumSha256, 'b'.repeat(64));
});

test('restore validation fails closed on tampering before adapters are invoked', async () => {
  const manifest = createEnterpriseBackupManifest(baseInput());
  manifest.objects[0].size += 1;
  let adapterCalls = 0;
  const result = await validateEnterpriseRestoreCandidate({
    manifest,
    expectedScope: scope,
    supportedSchemaVersions: ['003_object_metadata'],
    target: { isolated: true, disposable: true, id: 'restore-test-1' },
    adapters: {
      postgres: async () => { adapterCalls += 1; return { ok: true }; },
      object: async () => { adapterCalls += 1; return { ok: true }; },
    },
  });
  assert.equal(result.status, 'blocked');
  assert.match(result.reason, /tamper|manifest.*integrity/i);
  assert.equal(adapterCalls, 0);
});

test('restore validation denies cross-tenant and cross-workspace scope before adapters are invoked', async () => {
  const manifest = createEnterpriseBackupManifest(baseInput());
  let adapterCalls = 0;
  for (const expectedScope of [
    { tenantId: 'tenant-other', workspaceId: scope.workspaceId },
    { tenantId: scope.tenantId, workspaceId: 'workspace-other' },
  ]) {
    const result = await validateEnterpriseRestoreCandidate({
      manifest,
      expectedScope,
      supportedSchemaVersions: ['003_object_metadata'],
      target: { isolated: true, disposable: true, id: 'restore-test-2' },
      adapters: {
        postgres: async () => { adapterCalls += 1; return { ok: true }; },
        object: async () => { adapterCalls += 1; return { ok: true }; },
      },
    });
    assert.equal(result.status, 'blocked');
    assert.match(result.reason, /scope|tenant|workspace/i);
  }
  assert.equal(adapterCalls, 0);
});

test('restore validation requires an isolated disposable target and supported schema', async () => {
  const manifest = createEnterpriseBackupManifest(baseInput());
  const unsafe = await validateEnterpriseRestoreCandidate({
    manifest,
    expectedScope: scope,
    supportedSchemaVersions: ['003_object_metadata'],
    target: { isolated: false, disposable: false, id: 'production' },
    adapters: {},
  });
  assert.equal(unsafe.status, 'blocked');
  assert.match(unsafe.reason, /isolated|disposable/i);

  const unsupported = await validateEnterpriseRestoreCandidate({
    manifest,
    expectedScope: scope,
    supportedSchemaVersions: ['999_future'],
    target: { isolated: true, disposable: true, id: 'restore-test-3' },
    adapters: {},
  });
  assert.equal(unsupported.status, 'blocked');
  assert.match(unsupported.reason, /schema|migration/i);
});

test('restore validation blocks required unverified checksums and distinguishes validated state truthfully', async () => {
  const manifest = createEnterpriseBackupManifest(baseInput());
  const blocked = await validateEnterpriseRestoreCandidate({
    manifest,
    expectedScope: scope,
    supportedSchemaVersions: ['003_object_metadata'],
    requireVerifiedChecksums: true,
    target: { isolated: true, disposable: true, id: 'restore-test-4' },
    adapters: {},
  });
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.reason, /checksum.*unverified|unverified.*checksum/i);

  const verifiedInput = baseInput();
  verifiedInput.objects = verifiedInput.objects.map((item) => ({ ...item, checksumVerified: true }));
  const verifiedManifest = createEnterpriseBackupManifest(verifiedInput);
  const validated = await validateEnterpriseRestoreCandidate({
    manifest: verifiedManifest,
    expectedScope: scope,
    supportedSchemaVersions: ['003_object_metadata'],
    requireVerifiedChecksums: true,
    target: { isolated: true, disposable: true, id: 'restore-test-5' },
    adapters: {
      postgres: async ({ backup }) => ({ ok: backup.backupId === verifiedManifest.postgres.backupId }),
      object: async ({ object }) => ({ ok: object.storageKey.startsWith('tenants/tenant-123/workspaces/workspace-789/') }),
    },
  });
  assert.equal(validated.status, 'validated');
  assert.equal(validated.destructive, false);
  assert.equal(validated.productionRestorePerformed, false);
});
