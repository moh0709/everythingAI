import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionIdentityRepository } from '../src/db/production/identityRepository.js';
import { deriveRequestContext, requestContextHeaders } from '../src/middleware/requestContext.js';
import { attachWorkspaceContext, createWorkspaceContextMiddleware, deriveWorkspaceContext } from '../src/middleware/workspaceContext.js';

test('workspace context scaffolding consumes requestContext and remains read-only when production resolution is disabled', () => {
  const req = {
    headers: {
      [requestContextHeaders.actorType]: 'user',
      [requestContextHeaders.tenantId]: 'tenant-123',
      [requestContextHeaders.workspaceSlug]: 'client-ops',
    },
  };

  req.requestContext = deriveRequestContext(req);
  const workspaceContext = deriveWorkspaceContext(req);

  assert.equal(workspaceContext.readOnly, true);
  assert.equal(workspaceContext.requestContext, req.requestContext);
  assert.deepEqual(workspaceContext.tenant, {
    id: 'tenant-123',
    slug: null,
  });
  assert.deepEqual(workspaceContext.workspace, {
    id: null,
    slug: 'client-ops',
  });
  assert.deepEqual(workspaceContext.resolution, {
    mode: 'request-context',
    status: 'scoped',
    tenant: 'present',
    workspace: 'present',
  });
  assert.equal('productionResolutionEnabled' in workspaceContext, false);
});

test('production resolution can resolve tenant ID, tenant slug fallback, and tenant-scoped workspace lookups with an injected repository', () => {
  const repository = createProductionIdentityRepository({
    tenants: [
      { id: 'tenant-123', slug: 'acme' },
      { id: 'tenant-456', slug: 'beta' },
    ],
    workspaces: [
      { id: 'workspace-789', tenantId: 'tenant-123', slug: 'client-ops' },
      { id: 'workspace-888', tenantId: 'tenant-456', slug: 'client-ops' },
    ],
  });

  const exactTenantContext = deriveWorkspaceContext(
    {
      requestContext: {
        tenant: { id: 'tenant-123', slug: 'wrong-slug' },
        workspace: { id: 'workspace-789', slug: 'client-ops' },
      },
    },
    { productionResolution: true, identityRepository: repository },
  );

  const slugTenantContext = deriveWorkspaceContext(
    {
      requestContext: {
        tenant: { slug: 'acme' },
        workspace: { slug: 'client-ops' },
      },
    },
    { productionResolution: true, identityRepository: repository },
  );

  assert.equal(exactTenantContext.productionResolutionEnabled, true);
  assert.equal(exactTenantContext.resolution.mode, 'production-persistence');
  assert.equal(exactTenantContext.resolution.status, 'resolved');
  assert.equal(exactTenantContext.resolvedTenant.id, 'tenant-123');
  assert.equal(exactTenantContext.resolvedWorkspace.id, 'workspace-789');
  assert.equal(slugTenantContext.resolution.status, 'resolved');
  assert.equal(slugTenantContext.resolvedTenant.slug, 'acme');
  assert.equal(slugTenantContext.resolvedWorkspace.tenantId, 'tenant-123');
});

test('production resolution falls back to unresolved when records are absent or ambiguous', () => {
  const repository = createProductionIdentityRepository({
    tenants: [
      { id: 'tenant-123', slug: 'acme' },
      { id: 'tenant-dup-1', slug: 'duplicate' },
      { id: 'tenant-dup-2', slug: 'duplicate' },
    ],
    workspaces: [
      { id: 'workspace-789', tenantId: 'tenant-123', slug: 'client-ops' },
      { id: 'workspace-dup-1', tenantId: 'tenant-123', slug: 'duplicate-workspace' },
      { id: 'workspace-dup-2', tenantId: 'tenant-123', slug: 'duplicate-workspace' },
    ],
  });

  const missingTenant = deriveWorkspaceContext(
    {
      requestContext: {
        tenant: { id: 'tenant-missing' },
        workspace: { id: 'workspace-789' },
      },
    },
    { productionResolution: true, identityRepository: repository },
  );

  const ambiguousTenant = deriveWorkspaceContext(
    {
      requestContext: {
        tenant: { slug: 'duplicate' },
        workspace: { slug: 'duplicate-workspace' },
      },
    },
    { productionResolution: true, identityRepository: repository },
  );

  const ambiguousWorkspace = deriveWorkspaceContext(
    {
      requestContext: {
        tenant: { id: 'tenant-123' },
        workspace: { slug: 'duplicate-workspace' },
      },
    },
    { productionResolution: true, identityRepository: repository },
  );

  assert.equal(missingTenant.resolution.status, 'unresolved');
  assert.equal(missingTenant.resolution.tenant, 'missing');
  assert.equal(missingTenant.resolution.workspace, 'missing');
  assert.equal(missingTenant.resolvedTenant, null);
  assert.equal(ambiguousTenant.resolution.status, 'unresolved');
  assert.equal(ambiguousTenant.resolution.tenant, 'ambiguous');
  assert.equal(ambiguousWorkspace.resolution.status, 'unresolved');
  assert.equal(ambiguousWorkspace.resolution.workspace, 'ambiguous');
});

test('attachWorkspaceContext stores the derived workspace context on the request', () => {
  const req = {
    headers: {
      [requestContextHeaders.actorType]: 'service_principal',
    },
  };

  attachWorkspaceContext(req, {}, () => {});

  assert.ok(req.workspaceContext);
  assert.equal(req.workspaceContext.readOnly, true);
  assert.equal(req.workspaceContext.resolution.status, 'unresolved');
  assert.equal(req.workspaceContext.requestContext.actor.type, 'service_principal');
});

test('createWorkspaceContextMiddleware can be configured for explicit production resolution', () => {
  const repository = createProductionIdentityRepository({
    tenants: [{ id: 'tenant-123', slug: 'acme' }],
    workspaces: [{ id: 'workspace-789', tenantId: 'tenant-123', slug: 'client-ops' }],
  });
  const middleware = createWorkspaceContextMiddleware({ productionResolution: true, identityRepository: repository });
  const req = {
    headers: {
      [requestContextHeaders.tenantSlug]: 'acme',
      [requestContextHeaders.workspaceSlug]: 'client-ops',
    },
  };

  middleware(req, {}, () => {});

  assert.equal(req.workspaceContext.resolution.status, 'resolved');
  assert.equal(req.workspaceContext.resolvedTenant.id, 'tenant-123');
  assert.equal(req.workspaceContext.resolvedWorkspace.id, 'workspace-789');
});
