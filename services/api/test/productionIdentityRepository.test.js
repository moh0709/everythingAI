import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductionIdentityPersistenceAdapter,
  createProductionIdentityRepository,
  createProductionIdentityRepositoryFactory,
} from '../src/db/production/index.js';

test('production identity repository does not create or use an adapter by default', () => {
  let adapterCreated = 0;
  const repository = createProductionIdentityRepository({
    tenants: [
      { id: 'tenant-123', slug: 'acme' },
      { id: 'tenant-456', slug: 'beta' },
    ],
    adapterFactory: () => {
      adapterCreated += 1;
      return createProductionIdentityPersistenceAdapter({
        delegate: {
          findTenantByStableId() {
            throw new Error('adapter should not be created in default mode');
          },
        },
      });
    },
  });

  const tenant = repository.findTenantByStableId('tenant-123');

  assert.equal(adapterCreated, 0);
  assert.equal(repository.productionMode, false);
  assert.equal(tenant.status, 'found');
  assert.equal(tenant.record.id, 'tenant-123');
});

test('production identity repository factory only creates an adapter when production mode is enabled', () => {
  let adapterCreated = 0;
  const buildRepository = createProductionIdentityRepositoryFactory({
    adapterFactory: () => {
      adapterCreated += 1;
      return createProductionIdentityPersistenceAdapter({
        delegate: {
          findTenantByStableId(stableId) {
            return { status: 'found', record: { id: stableId, slug: 'acme' } };
          },
        },
      });
    },
  });

  const localRepository = buildRepository({
    tenants: [{ id: 'tenant-123', slug: 'acme' }],
  });
  assert.equal(adapterCreated, 0);
  assert.equal(localRepository.findTenantByStableId('tenant-123').status, 'found');

  const productionRepository = buildRepository({
    productionMode: true,
  });

  assert.equal(adapterCreated, 1);
  assert.equal(productionRepository.productionMode, true);
  assert.equal(productionRepository.findTenantByStableId('tenant-456').status, 'found');
});

test('production identity repository resolves tenants and workspaces through an injected adapter', () => {
  const calls = [];
  const repository = createProductionIdentityRepository({
    productionMode: true,
    adapter: {
      findTenantByStableId(stableId) {
        calls.push(['findTenantByStableId', stableId]);
        return { status: 'found', record: { id: stableId, slug: 'acme' } };
      },
      findTenantBySlug(slug) {
        calls.push(['findTenantBySlug', slug]);
        return { status: 'found', record: { id: 'tenant-123', slug } };
      },
      findWorkspaceByStableId(params) {
        calls.push(['findWorkspaceByStableId', params]);
        return { status: 'found', record: { id: params.workspaceId, tenantId: params.tenantId, slug: 'client-ops' } };
      },
      findWorkspaceBySlug(params) {
        calls.push(['findWorkspaceBySlug', params]);
        return { status: 'found', record: { id: 'workspace-789', tenantId: params.tenantId, slug: params.workspaceSlug } };
      },
    },
  });

  const exactTenant = repository.findTenantByStableId('tenant-123');
  const slugTenant = repository.findTenantBySlug('acme');
  const exactWorkspace = repository.findWorkspaceByStableId({ tenantId: 'tenant-123', workspaceId: 'workspace-789' });
  const slugWorkspace = repository.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'client-ops' });

  assert.deepEqual(calls, [
    ['findTenantByStableId', 'tenant-123'],
    ['findTenantBySlug', 'acme'],
    ['findWorkspaceByStableId', { tenantId: 'tenant-123', workspaceId: 'workspace-789' }],
    ['findWorkspaceBySlug', { tenantId: 'tenant-123', workspaceSlug: 'client-ops' }],
  ]);
  assert.equal(exactTenant.status, 'found');
  assert.equal(slugTenant.status, 'found');
  assert.equal(exactWorkspace.status, 'found');
  assert.equal(exactWorkspace.record.tenantId, 'tenant-123');
  assert.equal(slugWorkspace.status, 'found');
  assert.equal(slugWorkspace.record.tenantId, 'tenant-123');
});

test('production identity repository keeps missing and ambiguous adapter outcomes unresolved and safe', () => {
  const repository = createProductionIdentityRepository({
    productionMode: true,
    adapter: {
      findTenantByStableId() {
        return { status: 'missing', record: null };
      },
      findTenantBySlug() {
        return { status: 'ambiguous', records: [{ id: 'tenant-1' }, { id: 'tenant-2' }] };
      },
      findWorkspaceByStableId() {
        return { status: 'ambiguous', records: [{ id: 'workspace-1' }, { id: 'workspace-2' }] };
      },
      findWorkspaceBySlug() {
        return { status: 'missing', record: null };
      },
    },
  });

  assert.equal(repository.findTenantByStableId('tenant-missing').status, 'missing');
  assert.equal(repository.findTenantBySlug('duplicate').status, 'ambiguous');
  assert.equal(repository.findWorkspaceByStableId({ tenantId: 'tenant-123', workspaceId: 'workspace-789' }).status, 'ambiguous');
  assert.equal(repository.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'missing' }).status, 'missing');
});
