import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionIdentityRepository } from '../src/db/production/identityRepository.js';

test('production identity repository resolves tenants by exact ID and slug fallback', () => {
  const repository = createProductionIdentityRepository({
    tenants: [
      { id: 'tenant-123', slug: 'acme' },
      { id: 'tenant-456', slug: 'beta' },
      { id: 'tenant-amb-1', slug: 'duplicate' },
      { id: 'tenant-amb-2', slug: 'duplicate' },
    ],
  });

  const exactTenant = repository.findTenantByStableId('tenant-123');
  const slugTenant = repository.findTenantBySlug('acme');
  const missingTenant = repository.findTenantByStableId('tenant-missing');
  const ambiguousTenant = repository.findTenantBySlug('duplicate');

  assert.equal(exactTenant.status, 'found');
  assert.deepEqual(exactTenant.record, {
    id: 'tenant-123',
    slug: 'acme',
    record: { id: 'tenant-123', slug: 'acme' },
  });
  assert.equal(slugTenant.status, 'found');
  assert.equal(slugTenant.record.id, 'tenant-123');
  assert.equal(missingTenant.status, 'missing');
  assert.equal(ambiguousTenant.status, 'ambiguous');
  assert.equal(ambiguousTenant.records.length, 2);
});

test('production identity repository resolves workspaces scoped to a tenant', () => {
  const repository = createProductionIdentityRepository({
    tenants: [
      { id: 'tenant-123', slug: 'acme' },
      { id: 'tenant-456', slug: 'beta' },
    ],
    workspaces: [
      { id: 'workspace-789', tenantId: 'tenant-123', slug: 'client-ops' },
      { id: 'workspace-888', tenantId: 'tenant-456', slug: 'client-ops' },
      { id: 'workspace-amb-1', tenantId: 'tenant-123', slug: 'duplicate' },
      { id: 'workspace-amb-2', tenantId: 'tenant-123', slug: 'duplicate' },
    ],
  });

  const exactWorkspace = repository.findWorkspaceByStableId({ tenantId: 'tenant-123', workspaceId: 'workspace-789' });
  const slugWorkspace = repository.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'client-ops' });
  const tenantMismatch = repository.findWorkspaceByStableId({ tenantId: 'tenant-456', workspaceId: 'workspace-789' });
  const missingWorkspace = repository.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'missing' });
  const ambiguousWorkspace = repository.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'duplicate' });

  assert.equal(exactWorkspace.status, 'found');
  assert.equal(exactWorkspace.record.id, 'workspace-789');
  assert.equal(exactWorkspace.record.tenantId, 'tenant-123');
  assert.equal(slugWorkspace.status, 'found');
  assert.equal(slugWorkspace.record.slug, 'client-ops');
  assert.equal(tenantMismatch.status, 'missing');
  assert.equal(missingWorkspace.status, 'missing');
  assert.equal(ambiguousWorkspace.status, 'ambiguous');
  assert.equal(ambiguousWorkspace.records.length, 2);
});
