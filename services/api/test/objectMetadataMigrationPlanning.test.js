import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPostgresObjectMetadataRepository,
} from '../src/db/production/objectMetadataRepository.js';
import {
  createLocalObjectMigrationPlan,
} from '../src/storage/objectMigrationPlanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(__dirname, '../src/db/production/003_object_metadata.sql');
const scope = { tenantId: 'tenant-123', workspaceId: 'workspace-789' };
const exactScopeGuard = async (candidate) => (
  candidate.tenantId === scope.tenantId && candidate.workspaceId === scope.workspaceId
);

function createQueryClient(rowsByStatement = new Map()) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      for (const [pattern, rows] of rowsByStatement.entries()) {
        if (pattern.test(sql)) return { rows };
      }
      return { rows: [] };
    },
  };
}

test('object metadata migration creates tenant/workspace-scoped durable metadata with fail-closed RLS', () => {
  const sql = fsSync.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS workspace_object_metadata/);
  assert.match(sql, /tenant_id UUID NOT NULL REFERENCES tenants\(id\)/);
  assert.match(sql, /workspace_id UUID NOT NULL REFERENCES workspaces\(id\)/);
  assert.match(sql, /object_id TEXT NOT NULL/);
  assert.match(sql, /storage_key TEXT NOT NULL/);
  assert.match(sql, /checksum_sha256 TEXT/);
  assert.match(sql, /checksum_verified BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(sql, /migration_state TEXT NOT NULL/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /eai_runtime\.current_tenant_id\(\)/);
  assert.match(sql, /eai_runtime\.current_workspace_id\(\)/);
  assert.match(sql, /eai_runtime\.workspace_in_current_scope\(workspace_id\)/);
  assert.match(sql, /WITH CHECK/);
});

test('metadata repository uses scoped transactions and derives storage keys instead of accepting raw keys', async () => {
  const client = createQueryClient(new Map([
    [/INSERT INTO workspace_object_metadata/, [{
      tenant_id: 'tenant-123', workspace_id: 'workspace-789', object_id: 'object-1',
      storage_adapter: 's3-compatible', storage_key: 'tenants/tenant-123/workspaces/workspace-789/objects/object-1',
      size_bytes: 5, checksum_sha256: null, checksum_verified: false, content_type: 'text/plain', migration_state: 'planned',
    }]],
  ]));
  const repository = createPostgresObjectMetadataRepository({ client, scopeGuard: exactScopeGuard });

  const saved = await repository.recordPlannedObject({
    scope,
    objectId: 'object-1',
    storageAdapter: 's3-compatible',
    size: 5,
    contentType: 'text/plain',
    storageKey: 'caller-controlled/key',
    checksumSha256: 'caller-supplied',
    checksumVerified: true,
  });

  assert.equal(saved.storageKey, 'tenants/tenant-123/workspaces/workspace-789/objects/object-1');
  assert.equal(saved.checksumVerified, false);
  assert.equal(saved.checksumSha256, null);
  assert.equal(client.calls[0].sql, 'BEGIN');
  assert.match(client.calls[1].sql, /set_config\('eai\.tenant_id'/);
  assert.match(client.calls[2].sql, /set_config\('eai\.workspace_id'/);
  assert.match(client.calls[3].sql, /INSERT INTO workspace_object_metadata/);
  assert.equal(client.calls.at(-1).sql, 'COMMIT');
  assert.equal(JSON.stringify(client.calls).includes('caller-controlled/key'), false);
  assert.equal(JSON.stringify(client.calls).includes('caller-supplied'), false);
});

test('metadata repository rejects incomplete scope before persistence access', async () => {
  const client = createQueryClient();
  const repository = createPostgresObjectMetadataRepository({ client, scopeGuard: exactScopeGuard });
  await assert.rejects(
    repository.getObject({ scope: { tenantId: 'tenant-123' }, objectId: 'object-1' }),
    /tenant and workspace scope are required/i,
  );
  assert.deepEqual(client.calls, []);
});

test('dry-run migration plan is deterministic, computes integrity evidence, and never mutates source bytes', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eai-migration-plan-'));
  try {
    await fs.writeFile(path.join(rootDir, 'b.txt'), 'bravo');
    await fs.writeFile(path.join(rootDir, 'a.txt'), 'alpha');
    const beforeA = await fs.readFile(path.join(rootDir, 'a.txt'));
    const beforeB = await fs.readFile(path.join(rootDir, 'b.txt'));

    const first = await createLocalObjectMigrationPlan({
      rootDir,
      scope,
      entries: [
        { documentId: 'doc-b', relativePath: 'b.txt', contentType: 'text/plain' },
        { documentId: 'doc-a', relativePath: 'a.txt', contentType: 'text/plain' },
      ],
    });
    const second = await createLocalObjectMigrationPlan({
      rootDir,
      scope,
      entries: [
        { documentId: 'doc-a', relativePath: 'a.txt', contentType: 'text/plain' },
        { documentId: 'doc-b', relativePath: 'b.txt', contentType: 'text/plain' },
      ],
    });

    assert.deepEqual(first, second);
    assert.equal(first.mode, 'dry-run');
    assert.equal(first.destructive, false);
    assert.deepEqual(first.items.map((item) => item.documentId), ['doc-a', 'doc-b']);
    assert.match(first.items[0].objectId, /^obj-[a-f0-9]{32}$/);
    assert.match(first.items[0].storageKey, /^tenants\/tenant-123\/workspaces\/workspace-789\/objects\/obj-/);
    assert.equal(first.items[0].size, 5);
    assert.match(first.items[0].checksumSha256, /^[a-f0-9]{64}$/);
    assert.equal(first.items[0].checksumComputedForPlan, true);
    assert.equal(first.items[0].checksumVerifiedForCutover, false);
    assert.deepEqual(await fs.readFile(path.join(rootDir, 'a.txt')), beforeA);
    assert.deepEqual(await fs.readFile(path.join(rootDir, 'b.txt')), beforeB);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test('migration planning rejects source traversal before reading outside the configured root', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eai-migration-root-'));
  try {
    await assert.rejects(
      createLocalObjectMigrationPlan({
        rootDir,
        scope,
        entries: [{ documentId: 'doc-escape', relativePath: '../secret.txt' }],
      }),
      /outside migration root|invalid relative path/i,
    );
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});
