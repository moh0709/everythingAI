import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionWorkspaceContextMiddleware } from '../src/db/production/workspaceContextMiddleware.js';

function createQueryResponder(calls, tenantId = 'tenant-123', workspaceId = 'workspace-789') {
  return (sql, params) => {
    calls.push({ sql, params });

    if (sql === 'SELECT id, slug FROM tenants WHERE id = $1 LIMIT 2') {
      return { rows: [{ id: tenantId, slug: 'acme' }] };
    }

    if (sql === 'SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 2') {
      return { rows: [{ id: tenantId, slug: 'acme' }] };
    }

    if (sql === 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND id = $2 LIMIT 2') {
      return { rows: [{ id: workspaceId, tenant_id: tenantId, slug: 'client-ops' }] };
    }

    if (sql === 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND slug = $2 LIMIT 2') {
      return { rows: [{ id: workspaceId, tenant_id: tenantId, slug: 'client-ops' }] };
    }

    return { rows: [] };
  };
}

test('production workspace context middleware stays disabled unless production mode is enabled', () => {
  let repositoryFactoryCalls = 0;
  const middleware = createProductionWorkspaceContextMiddleware({
    productionMode: false,
    productionAdapterFactory() {
      repositoryFactoryCalls += 1;
      return {
        findTenantByStableId() {
          throw new Error('should not be called');
        },
      };
    },
  });

  assert.equal(middleware, null);
  assert.equal(repositoryFactoryCalls, 0);
});

test('production workspace context middleware accepts an injected postgres client', () => {
  const calls = [];
  const middleware = createProductionWorkspaceContextMiddleware({
    productionMode: true,
    postgresClient: {
      query: createQueryResponder(calls),
    },
  });

  const req = {
    requestContext: {
      tenant: { id: 'tenant-123' },
      workspace: { id: 'workspace-789' },
    },
  };

  middleware(req, {}, () => {});

  assert.equal(req.workspaceContext.productionResolutionEnabled, true);
  assert.equal(req.workspaceContext.resolution.status, 'resolved');
  assert.equal(req.workspaceContext.resolvedTenant.id, 'tenant-123');
  assert.equal(req.workspaceContext.resolvedWorkspace.id, 'workspace-789');
  assert.deepEqual(calls, [
    {
      sql: 'SELECT id, slug FROM tenants WHERE id = $1 LIMIT 2',
      params: ['tenant-123'],
    },
    {
      sql: 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND id = $2 LIMIT 2',
      params: ['tenant-123', 'workspace-789'],
    },
  ]);
});

test('production workspace context middleware accepts an injected postgres pool', () => {
  const calls = [];
  const middleware = createProductionWorkspaceContextMiddleware({
    productionMode: true,
    pool: {
      query: createQueryResponder(calls),
    },
  });

  const req = {
    requestContext: {
      tenant: { slug: 'acme' },
      workspace: { slug: 'client-ops' },
    },
  };

  middleware(req, {}, () => {});

  assert.equal(req.workspaceContext.productionResolutionEnabled, true);
  assert.equal(req.workspaceContext.resolution.status, 'resolved');
  assert.equal(req.workspaceContext.resolvedTenant.slug, 'acme');
  assert.equal(req.workspaceContext.resolvedWorkspace.slug, 'client-ops');
  assert.deepEqual(calls, [
    {
      sql: 'SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 2',
      params: ['acme'],
    },
    {
      sql: 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND slug = $2 LIMIT 2',
      params: ['tenant-123', 'client-ops'],
    },
  ]);
});