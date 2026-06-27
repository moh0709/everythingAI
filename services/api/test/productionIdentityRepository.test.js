import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductionIdentityPostgresAdapter,
  createProductionIdentityRepository,
  createProductionIdentityRepositoryFactory,
} from '../src/db/production/index.js';

test('production identity repository does not create or use a PostgreSQL adapter by default', () => {
  let adapterCreated = 0;
  let queryCalled = 0;

  const repository = createProductionIdentityRepository({
    tenants: [
      { id: 'tenant-123', slug: 'acme' },
      { id: 'tenant-456', slug: 'beta' },
    ],
    productionAdapterFactory: () => {
      adapterCreated += 1;
      return createProductionIdentityPostgresAdapter({
        query() {
          queryCalled += 1;
          throw new Error('postgres adapter should not be used in default local mode');
        },
      });
    },
  });

  const tenant = repository.findTenantByStableId('tenant-123');

  assert.equal(adapterCreated, 0);
  assert.equal(queryCalled, 0);
  assert.equal(repository.productionMode, false);
  assert.equal(tenant.status, 'found');
  assert.equal(tenant.record.id, 'tenant-123');
});

test('production identity repository factory only creates the PostgreSQL adapter when production mode is enabled', () => {
  let adapterCreated = 0;
  const buildRepository = createProductionIdentityRepositoryFactory({
    productionAdapterFactory: () => {
      adapterCreated += 1;
      return createProductionIdentityPostgresAdapter({
        query() {
          return { rows: [{ id: 'tenant-456', slug: 'beta' }] };
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

test('production PostgreSQL adapter issues tenant and workspace queries with tenant-scoped parameters', () => {
  const calls = [];
  const adapter = createProductionIdentityPostgresAdapter({
    query(sql, params) {
      calls.push({ sql, params });

      if (sql === 'SELECT id, slug FROM tenants WHERE id = $1 LIMIT 2') {
        return { rows: [{ id: 'tenant-123', slug: 'acme' }] };
      }

      if (sql === 'SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 2') {
        return { rows: [{ id: 'tenant-123', slug: 'acme' }] };
      }

      if (sql === 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND id = $2 LIMIT 2') {
        return { rows: [{ id: 'workspace-789', tenant_id: 'tenant-123', slug: 'client-ops' }] };
      }

      if (sql === 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND slug = $2 LIMIT 2') {
        return { rows: [{ id: 'workspace-789', tenant_id: 'tenant-123', slug: 'client-ops' }] };
      }

      return { rows: [] };
    },
  });

  const exactTenant = adapter.findTenantByStableId('tenant-123');
  const slugTenant = adapter.findTenantBySlug('acme');
  const exactWorkspace = adapter.findWorkspaceByStableId({ tenantId: 'tenant-123', workspaceId: 'workspace-789' });
  const slugWorkspace = adapter.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'client-ops' });

  assert.deepEqual(calls, [
    {
      sql: 'SELECT id, slug FROM tenants WHERE id = $1 LIMIT 2',
      params: ['tenant-123'],
    },
    {
      sql: 'SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 2',
      params: ['acme'],
    },
    {
      sql: 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND id = $2 LIMIT 2',
      params: ['tenant-123', 'workspace-789'],
    },
    {
      sql: 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND slug = $2 LIMIT 2',
      params: ['tenant-123', 'client-ops'],
    },
  ]);
  assert.equal(exactTenant.status, 'found');
  assert.equal(exactTenant.record.slug, 'acme');
  assert.equal(slugTenant.status, 'found');
  assert.equal(exactWorkspace.status, 'found');
  assert.equal(exactWorkspace.record.tenant_id, 'tenant-123');
  assert.equal(slugWorkspace.status, 'found');
  assert.equal(slugWorkspace.record.tenant_id, 'tenant-123');
});

test('production PostgreSQL adapter returns missing and ambiguous results safely', () => {
  const adapter = createProductionIdentityPostgresAdapter({
    query(sql) {
      if (sql.includes('FROM tenants') && sql.includes('WHERE id = $1')) {
        return { rows: [] };
      }

      if (sql.includes('FROM tenants') && sql.includes('WHERE slug = $1')) {
        return { rows: [{ id: 'tenant-1' }, { id: 'tenant-2' }] };
      }

      if (sql.includes('FROM workspaces') && sql.includes('WHERE tenant_id = $1 AND id = $2')) {
        return { rows: [{ id: 'workspace-1' }, { id: 'workspace-2' }] };
      }

      if (sql.includes('FROM workspaces') && sql.includes('WHERE tenant_id = $1 AND slug = $2')) {
        return { rows: [] };
      }

      return { rows: [] };
    },
  });

  assert.equal(adapter.findTenantByStableId('tenant-missing').status, 'missing');
  assert.equal(adapter.findTenantBySlug('duplicate').status, 'ambiguous');
  assert.equal(adapter.findWorkspaceByStableId({ tenantId: 'tenant-123', workspaceId: 'workspace-789' }).status, 'ambiguous');
  assert.equal(adapter.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'missing' }).status, 'missing');
});

test('production identity repository resolves tenants and workspaces through an explicitly injected PostgreSQL adapter', () => {
  const calls = [];
  const repository = createProductionIdentityRepository({
    productionMode: true,
    productionAdapterFactory: () => createProductionIdentityPostgresAdapter({
      query(sql, params) {
        calls.push({ sql, params });

        if (sql === 'SELECT id, slug FROM tenants WHERE id = $1 LIMIT 2') {
          return { rows: [{ id: 'tenant-123', slug: 'acme' }] };
        }

        if (sql === 'SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 2') {
          return { rows: [{ id: 'tenant-123', slug: 'acme' }] };
        }

        if (sql === 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND id = $2 LIMIT 2') {
          return { rows: [{ id: 'workspace-789', tenant_id: 'tenant-123', slug: 'client-ops' }] };
        }

        if (sql === 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND slug = $2 LIMIT 2') {
          return { rows: [{ id: 'workspace-789', tenant_id: 'tenant-123', slug: 'client-ops' }] };
        }

        return { rows: [] };
      },
    }),
  });

  const exactTenant = repository.findTenantByStableId('tenant-123');
  const slugTenant = repository.findTenantBySlug('acme');
  const exactWorkspace = repository.findWorkspaceByStableId({ tenantId: 'tenant-123', workspaceId: 'workspace-789' });
  const slugWorkspace = repository.findWorkspaceBySlug({ tenantId: 'tenant-123', workspaceSlug: 'client-ops' });

  assert.equal(repository.productionMode, true);
  assert.equal(calls.length, 4);
  assert.equal(exactTenant.status, 'found');
  assert.equal(slugTenant.status, 'found');
  assert.equal(exactWorkspace.status, 'found');
  assert.equal(slugWorkspace.status, 'found');
  assert.equal(exactWorkspace.record.tenantId, 'tenant-123');
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
