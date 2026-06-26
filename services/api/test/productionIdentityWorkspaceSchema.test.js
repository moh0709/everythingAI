import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveRequestContext, requestContextHeaders } from '../src/middleware/requestContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../src/db/production/001_identity_workspace_schema.sql');

const requiredTables = [
  'users',
  'auth_identities',
  'tenants',
  'tenant_memberships',
  'workspaces',
  'workspace_memberships',
  'roles',
  'role_permissions',
  'permission_grants',
  'service_principals',
  'service_principal_permissions',
  'audit_events',
  'workspace_sources',
  'workspace_documents',
  'workspace_jobs',
  'workspace_job_events',
  'workspace_connector_links',
  'secrets_metadata',
];

test('production identity/workspace schema draft contains the expected foundation tables', async () => {
  const schema = await fs.readFile(schemaPath, 'utf8');

  assert.match(schema, /CREATE EXTENSION IF NOT EXISTS pgcrypto;/);
  assert.match(schema, /-- EAI-TASK-029 draft: production PostgreSQL identity\/workspace schema foundation/);
  assert.equal(schema.includes('sqlite_master'), false);

  for (const tableName of requiredTables) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\b`));
  }

  assert.match(schema, /CREATE TABLE IF NOT EXISTS audit_events[\s\S]*actor_type TEXT NOT NULL CHECK/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS workspace_jobs[\s\S]*workspace_id UUID NOT NULL REFERENCES workspaces\(id\) ON DELETE CASCADE/);
});

test('request-context scaffolding normalizes actor, tenant, workspace, and request headers', () => {
  const context = deriveRequestContext({
    headers: {
      [requestContextHeaders.actorType]: 'service_principal',
      [requestContextHeaders.actorId]: 'sp-123',
      [requestContextHeaders.actorEmail]: 'bot@example.com',
      [requestContextHeaders.tenantId]: 'tenant-456',
      [requestContextHeaders.tenantSlug]: 'acme',
      [requestContextHeaders.workspaceId]: 'workspace-789',
      [requestContextHeaders.workspaceSlug]: 'client-success',
      [requestContextHeaders.requestId]: 'req-abc',
      [requestContextHeaders.requestSource]: 'browser',
    },
  });

  const fallbackContext = deriveRequestContext({ headers: { [requestContextHeaders.actorType]: 'not-a-real-type' } });

  assert.deepEqual(context, {
    actor: {
      type: 'service_principal',
      id: 'sp-123',
      email: 'bot@example.com',
    },
    tenant: {
      id: 'tenant-456',
      slug: 'acme',
    },
    workspace: {
      id: 'workspace-789',
      slug: 'client-success',
    },
    request: {
      id: 'req-abc',
      source: 'browser',
    },
  });

  assert.equal(fallbackContext.actor.type, 'anonymous');
  assert.equal(fallbackContext.request.source, 'api');
  assert.equal(fallbackContext.tenant.id, null);
  assert.equal(fallbackContext.workspace.id, null);
});
