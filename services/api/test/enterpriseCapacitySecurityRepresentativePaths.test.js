import test from 'node:test';
import assert from 'node:assert/strict';

import { runBoundedCapacityScenario } from '../src/enterprise/capacitySecurity.js';
import { createEnterpriseAuthorizationContext } from '../src/enterprise/identityAuthorization.js';
import { createPostgresObjectMetadataRepository } from '../src/db/production/objectMetadataRepository.js';
import { createS3CompatibleObjectStorageAdapter } from '../src/storage/objectStorage.js';
import { createEnterpriseHealthReporter } from '../src/enterprise/runtimeHealth.js';
import {
  createEnterpriseBackupManifest,
  validateEnterpriseRestoreCandidate,
} from '../src/enterprise/backupRestore.js';

const scope = { tenantId: 'tenant-a', workspaceId: 'workspace-a' };

function createMetadataClient() {
  return {
    async query(sql, params = []) {
      if (/INSERT INTO workspace_object_metadata/i.test(sql)) {
        return {
          rows: [{
            tenant_id: params[0],
            workspace_id: params[1],
            object_id: params[2],
            storage_adapter: params[3],
            storage_key: params[4],
            size_bytes: params[5],
            checksum_sha256: null,
            checksum_verified: false,
            content_type: params[6],
            migration_state: 'planned',
          }],
        };
      }
      if (/SELECT \*\s+FROM workspace_object_metadata/i.test(sql)) {
        return {
          rows: [{
            tenant_id: params[0],
            workspace_id: params[1],
            object_id: params[2],
            storage_adapter: 's3-compatible',
            storage_key: params[3],
            size_bytes: 2,
            checksum_sha256: null,
            checksum_verified: false,
            content_type: 'text/plain',
            migration_state: 'planned',
          }],
        };
      }
      return { rows: [] };
    },
  };
}

function createStorageAdapter() {
  const client = {
    async putObject() { return {}; },
    async getObject() { return { body: Buffer.from('ok') }; },
    async headObject() { return { contentLength: 2 }; },
    async deleteObject() { return {}; },
  };
  return createS3CompatibleObjectStorageAdapter({
    bucket: 'enterprise-capacity',
    client,
    scopeGuard: async (candidate) => (
      candidate.tenantId === scope.tenantId
      && candidate.workspaceId === scope.workspaceId
    ),
  });
}

function createRestoreManifest() {
  return createEnterpriseBackupManifest({
    scope,
    schemaVersion: 'schema-v1',
    createdAt: '2026-08-28T00:00:00.000Z',
    postgres: { backupId: 'pg-capacity-1' },
    objects: [{
      objectId: 'object-1',
      storageKey: 'tenants/tenant-a/workspaces/workspace-a/objects/object-1',
      size: 2,
    }],
  });
}

async function assertBoundedPass(name, operation) {
  const result = await runBoundedCapacityScenario({
    name,
    iterations: 8,
    concurrency: 2,
    maxIterations: 16,
    maxConcurrency: 4,
    operationTimeoutMs: 1000,
    maxOperationTimeoutMs: 2000,
    operation,
  });
  assert.equal(result.status, 'pass', `${name} should pass bounded regression capacity`);
  assert.equal(result.measured.attemptedIterations, 8);
  assert.equal(result.measured.failures, 0);
  assert.ok(result.measured.peakConcurrency <= 2);
  assert.equal(result.claims.regressionEvidenceOnly, true);
  assert.equal(result.claims.productionValidated, false);
}

test('bounded capacity evidence exercises representative enterprise paths rather than synthetic no-op work', async () => {
  await assertBoundedPass('authorization-context-resolution', async () => {
    const authorization = createEnterpriseAuthorizationContext({
      principal: { id: 'user-1', type: 'user', authenticated: true },
      workspaceContext: {
        productionResolutionEnabled: true,
        resolution: { mode: 'production-persistence', status: 'resolved' },
        resolvedTenant: { id: scope.tenantId },
        resolvedWorkspace: { id: scope.workspaceId, tenant_id: scope.tenantId },
      },
    });
    return { ok: authorization.authorized === true };
  });

  const metadataRepository = createPostgresObjectMetadataRepository({
    client: createMetadataClient(),
    scopeGuard: async (candidate) => (
      candidate.tenantId === scope.tenantId
      && candidate.workspaceId === scope.workspaceId
    ),
  });
  await assertBoundedPass('object-metadata-read-write-planning', async ({ index }) => {
    const objectId = `object-${index}`;
    const written = await metadataRepository.recordPlannedObject({
      scope,
      objectId,
      storageAdapter: 's3-compatible',
      size: 2,
      contentType: 'text/plain',
    });
    const read = await metadataRepository.getObject({ scope, objectId });
    return { ok: written?.objectId === objectId && read?.objectId === objectId };
  });

  const storage = createStorageAdapter();
  await assertBoundedPass('object-storage-adapter-operations', async ({ index }) => {
    const objectId = `capacity-object-${index}`;
    await storage.putObject({ scope, objectId, body: Buffer.from('ok'), contentType: 'text/plain' });
    const head = await storage.headObject({ scope, objectId });
    return { ok: head?.size === 2 || head?.contentLength === 2 };
  });

  const health = createEnterpriseHealthReporter({
    config: { mode: 'enterprise', enterpriseEnabled: true },
    checks: {
      postgres: async () => true,
      identity: async () => true,
      objectStorage: async () => true,
    },
  });
  await assertBoundedPass('enterprise-runtime-health-evaluation', async () => {
    const readiness = await health.readiness();
    return { ok: readiness.status === 'ready' };
  });

  const manifest = createRestoreManifest();
  await assertBoundedPass('restore-manifest-validation', async () => {
    const result = await validateEnterpriseRestoreCandidate({
      manifest,
      trustedManifestSha256: manifest.manifestSha256,
      expectedScope: scope,
      scopeGuard: async () => true,
      supportedSchemaVersions: ['schema-v1'],
      target: { id: 'capacity-restore-target', isolated: true, disposable: true },
      targetGuard: async () => true,
      adapters: {
        postgres: async () => ({ ok: true }),
        object: async () => ({ ok: true }),
      },
    });
    return { ok: result.status === 'pass' };
  });
});
