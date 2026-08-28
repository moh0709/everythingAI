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
import { withEnterpriseScopedTransaction } from '../src/db/production/enterpriseScopedTransaction.js';

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

test('scoped PostgreSQL transaction sets tenant/workspace locally before persistence work and commits', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params: params ?? [] });
      return { rows: [] };
    },
  };

  const result = await withEnterpriseScopedTransaction(
    client,
    { tenantId: ' tenant-123 ', workspaceId: ' workspace-789 ' },
    async (scopedClient, scope) => {
      assert.equal(scopedClient, client);
      assert.deepEqual(scope, { tenantId: 'tenant-123', workspaceId: 'workspace-789' });
      await scopedClient.query('SELECT * FROM workspace_documents');
      return 'done';
    },
  );

  assert.equal(result, 'done');
  assert.deepEqual(calls, [
    { sql: 'BEGIN', params: [] },
    { sql: "SELECT set_config('eai.tenant_id', $1, true)", params: ['tenant-123'] },
    { sql: "SELECT set_config('eai.workspace_id', $1, true)", params: ['workspace-789'] },
    { sql: 'SELECT * FROM workspace_documents', params: [] },
    { sql: 'COMMIT', params: [] },
  ]);
});

test('scoped PostgreSQL transaction rejects missing scope before BEGIN and rolls back operation failures', async () => {
  const missingScopeCalls = [];
  const missingScopeClient = {
    async query(sql, params) {
      missingScopeCalls.push({ sql, params });
      return { rows: [] };
    },
  };

  await assert.rejects(
    withEnterpriseScopedTransaction(missingScopeClient, { tenantId: 'tenant-123' }, async () => null),
    /tenant and workspace scope are required/i,
  );
  assert.deepEqual(missingScopeCalls, []);

  const rollbackCalls = [];
  const rollbackClient = {
    async query(sql, params) {
      rollbackCalls.push({ sql, params: params ?? [] });
      return { rows: [] };
    },
  };

  await assert.rejects(
    withEnterpriseScopedTransaction(
      rollbackClient,
      { tenantId: 'tenant-123', workspaceId: 'workspace-789' },
      async () => {
        throw new Error('persistence failed');
      },
    ),
    /persistence failed/,
  );

  assert.equal(rollbackCalls.at(-1).sql, 'ROLLBACK');
  assert.equal(rollbackCalls.some((call) => call.sql === 'COMMIT'), false);
});
