import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertEnterpriseResourceScope,
  createEnterpriseAuthorizationContext,
  mapOidcIdentityClaims,
} from '../src/enterprise/identityAuthorization.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rlsMigrationPath = path.resolve(__dirname, '../src/db/production/002_enterprise_rls_foundation.sql');

function resolvedWorkspaceContext(overrides = {}) {
  return {
    productionResolutionEnabled: true,
    resolution: {
      mode: 'production-persistence',
      status: 'resolved',
      tenant: 'resolved',
      workspace: 'resolved',
    },
    resolvedTenant: { id: 'tenant-123', slug: 'acme' },
    resolvedWorkspace: { id: 'workspace-789', tenant_id: 'tenant-123', slug: 'client-ops' },
    ...overrides,
  };
}

test('enterprise authorization context accepts only an authenticated principal with a resolved tenant/workspace scope', () => {
  const context = createEnterpriseAuthorizationContext({
    principal: {
      type: 'user',
      id: 'user-1',
      authenticated: true,
      identity: { protocol: 'oidc', provider: 'https://id.example.test', subject: 'subject-1' },
    },
    workspaceContext: resolvedWorkspaceContext(),
  });

  assert.equal(context.authorized, true);
  assert.equal(context.tenantId, 'tenant-123');
  assert.equal(context.workspaceId, 'workspace-789');
  assert.equal(context.principal.id, 'user-1');
});

test('enterprise authorization context fails closed for anonymous, unresolved, missing, or cross-tenant workspace state', () => {
  const anonymous = createEnterpriseAuthorizationContext({
    principal: { type: 'anonymous', authenticated: false },
    workspaceContext: resolvedWorkspaceContext(),
  });
  const unresolved = createEnterpriseAuthorizationContext({
    principal: { type: 'user', id: 'user-1', authenticated: true },
    workspaceContext: resolvedWorkspaceContext({ resolution: { mode: 'production-persistence', status: 'unresolved' } }),
  });
  const missingWorkspace = createEnterpriseAuthorizationContext({
    principal: { type: 'user', id: 'user-1', authenticated: true },
    workspaceContext: resolvedWorkspaceContext({ resolvedWorkspace: null }),
  });
  const crossTenantWorkspace = createEnterpriseAuthorizationContext({
    principal: { type: 'user', id: 'user-1', authenticated: true },
    workspaceContext: resolvedWorkspaceContext({
      resolvedWorkspace: { id: 'workspace-foreign', tenant_id: 'tenant-999', slug: 'foreign' },
    }),
  });

  assert.equal(anonymous.authorized, false);
  assert.equal(anonymous.reason, 'principal-not-authenticated');
  assert.equal(unresolved.authorized, false);
  assert.equal(unresolved.reason, 'workspace-scope-unresolved');
  assert.equal(missingWorkspace.authorized, false);
  assert.equal(missingWorkspace.reason, 'workspace-scope-missing');
  assert.equal(crossTenantWorkspace.authorized, false);
  assert.equal(crossTenantWorkspace.reason, 'workspace-tenant-mismatch');
});

test('resource scope guard denies cross-tenant and cross-workspace access without exposing foreign-resource details', () => {
  const authorization = createEnterpriseAuthorizationContext({
    principal: { type: 'user', id: 'user-1', authenticated: true },
    workspaceContext: resolvedWorkspaceContext(),
  });

  assert.deepEqual(
    assertEnterpriseResourceScope(authorization, { tenantId: 'tenant-123', workspaceId: 'workspace-789' }),
    { allowed: true, reason: null },
  );
  assert.deepEqual(
    assertEnterpriseResourceScope(authorization, { tenantId: 'tenant-999', workspaceId: 'workspace-789' }),
    { allowed: false, reason: 'resource-scope-denied' },
  );
  assert.deepEqual(
    assertEnterpriseResourceScope(authorization, { tenantId: 'tenant-123', workspaceId: 'workspace-foreign' }),
    { allowed: false, reason: 'resource-scope-denied' },
  );
  assert.deepEqual(
    assertEnterpriseResourceScope({ authorized: false }, { tenantId: 'tenant-123', workspaceId: 'workspace-789' }),
    { allowed: false, reason: 'resource-scope-denied' },
  );
});

test('OIDC identity mapping is provider-neutral and rejects incomplete claims', () => {
  const mapped = mapOidcIdentityClaims({
    issuer: 'https://identity.example.test/',
    subject: 'subject-123',
    email: 'User@Example.test',
    displayName: 'Example User',
  });

  assert.equal(mapped.status, 'mapped');
  assert.deepEqual(mapped.identity, {
    protocol: 'oidc',
    provider: 'https://identity.example.test',
    subject: 'subject-123',
    email: 'user@example.test',
    displayName: 'Example User',
  });
  assert.equal(mapOidcIdentityClaims({ issuer: '', subject: 'subject-123' }).status, 'invalid');
  assert.equal(mapOidcIdentityClaims({ issuer: 'https://identity.example.test', subject: '' }).status, 'invalid');
});

test('enterprise RLS migration is fail-closed and covers tenant/workspace production tables', () => {
  const sql = fs.readFileSync(rlsMigrationPath, 'utf8');

  assert.match(sql, /current_setting\('eai\.tenant_id', true\)/);
  assert.match(sql, /current_setting\('eai\.workspace_id', true\)/);
  assert.match(sql, /ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE workspaces FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE workspace_documents ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE workspace_jobs ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /CREATE POLICY eai_workspace_documents_scope/);
  assert.match(sql, /WITH CHECK/);
});
