import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresObjectMetadataRepository } from '../src/db/production/objectMetadataRepository.js';

const scope = { tenantId: 'tenant-123', workspaceId: 'workspace-789' };
const exactScopeGuard = async (candidate) => (
  candidate.tenantId === scope.tenantId && candidate.workspaceId === scope.workspaceId
);

function createClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/INSERT INTO workspace_object_metadata/.test(sql)) {
        return { rows: [{
          tenant_id: 'tenant-123',
          workspace_id: 'workspace-789',
          object_id: 'obj-0123456789abcdef0123456789abcdef',
          storage_adapter: 's3-compatible',
          storage_key: 'tenants/tenant-123/workspaces/workspace-789/objects/obj-0123456789abcdef0123456789abcdef',
          size_bytes: 5,
          checksum_sha256: '8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8',
          checksum_verified: false,
          content_type: 'text/plain',
          migration_state: 'planned',
        }] };
      }
      return { rows: [] };
    },
  };
}

test('production object metadata repository requires an explicit trusted scope guard', () => {
  assert.throws(
    () => createPostgresObjectMetadataRepository({ client: createClient() }),
    /scopeGuard is required/i,
  );
});

test('production object metadata repository denies foreign scope before BEGIN', async () => {
  const client = createClient();
  const repository = createPostgresObjectMetadataRepository({ client, scopeGuard: exactScopeGuard });

  await assert.rejects(
    repository.getObject({
      scope: { tenantId: 'tenant-999', workspaceId: 'workspace-789' },
      objectId: 'object-1',
    }),
    /scope is not authorized/i,
  );
  await assert.rejects(
    repository.getObject({
      scope: { tenantId: 'tenant-123', workspaceId: 'workspace-999' },
      objectId: 'object-1',
    }),
    /scope is not authorized/i,
  );
  assert.deepEqual(client.calls, []);
});

test('computed dry-run checksum can be durably recorded but remains unverified for cutover', async () => {
  const client = createClient();
  const repository = createPostgresObjectMetadataRepository({ client, scopeGuard: exactScopeGuard });
  const saved = await repository.recordComputedPlanObject({
    scope,
    storageAdapter: 's3-compatible',
    planItem: {
      objectId: 'obj-0123456789abcdef0123456789abcdef',
      storageKey: 'caller-must-not-control-this',
      size: 5,
      checksumSha256: '8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8',
      checksumComputedForPlan: true,
      checksumVerifiedForCutover: false,
      contentType: 'text/plain',
      migrationState: 'planned',
    },
  });

  assert.equal(saved.checksumSha256, '8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8');
  assert.equal(saved.checksumVerified, false);
  assert.equal(saved.storageKey, 'tenants/tenant-123/workspaces/workspace-789/objects/obj-0123456789abcdef0123456789abcdef');
  assert.equal(JSON.stringify(client.calls).includes('caller-must-not-control-this'), false);
});

test('computed-plan persistence rejects malformed or cutover-verified claims before database access', async () => {
  const client = createClient();
  const repository = createPostgresObjectMetadataRepository({ client, scopeGuard: exactScopeGuard });

  await assert.rejects(
    repository.recordComputedPlanObject({
      scope,
      storageAdapter: 's3-compatible',
      planItem: {
        objectId: 'obj-0123456789abcdef0123456789abcdef',
        size: 5,
        checksumSha256: 'not-a-sha256',
        checksumComputedForPlan: true,
        checksumVerifiedForCutover: false,
      },
    }),
    /checksum/i,
  );

  await assert.rejects(
    repository.recordComputedPlanObject({
      scope,
      storageAdapter: 's3-compatible',
      planItem: {
        objectId: 'obj-0123456789abcdef0123456789abcdef',
        size: 5,
        checksumSha256: '8ed3f6ad685b959ead7022518e1af76cd816f8e8ec7ccdda1ed4018e8f2223f8',
        checksumComputedForPlan: true,
        checksumVerifiedForCutover: true,
      },
    }),
    /cutover|verified/i,
  );

  assert.deepEqual(client.calls, []);
});
