import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildScopedObjectKey,
  createLocalObjectStorageAdapter,
  createS3CompatibleObjectStorageAdapter,
} from '../src/storage/objectStorage.js';

const scope = { tenantId: 'tenant-123', workspaceId: 'workspace-789' };

test('scoped object keys are tenant/workspace bound and reject traversal or missing scope', () => {
  assert.equal(
    buildScopedObjectKey(scope, 'object-abc'),
    'tenants/tenant-123/workspaces/workspace-789/objects/object-abc',
  );
  assert.throws(() => buildScopedObjectKey({ tenantId: 'tenant-123' }, 'object-abc'), /tenant and workspace scope are required/i);
  assert.throws(() => buildScopedObjectKey(scope, '../secret'), /invalid object identifier/i);
  assert.throws(() => buildScopedObjectKey(scope, '/absolute'), /invalid object identifier/i);
  assert.throws(() => buildScopedObjectKey(scope, 'folder/object'), /invalid object identifier/i);
});

test('local adapter round-trips scoped bytes without enterprise configuration', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eai-object-storage-'));
  const storage = createLocalObjectStorageAdapter({ rootDir });

  try {
    const put = await storage.putObject({ scope, objectId: 'object-1', body: Buffer.from('hello'), contentType: 'text/plain' });
    assert.equal(put.key, 'tenants/tenant-123/workspaces/workspace-789/objects/object-1');
    assert.equal(put.size, 5);

    const head = await storage.headObject({ scope, objectId: 'object-1' });
    assert.equal(head.found, true);
    assert.equal(head.size, 5);

    const get = await storage.getObject({ scope, objectId: 'object-1' });
    assert.equal(get.found, true);
    assert.equal(get.body.toString('utf8'), 'hello');

    const foreign = await storage.getObject({
      scope: { tenantId: 'tenant-999', workspaceId: 'workspace-789' },
      objectId: 'object-1',
    });
    assert.equal(foreign.found, false);

    const removed = await storage.deleteObject({ scope, objectId: 'object-1' });
    assert.equal(removed.deleted, true);
    assert.equal((await storage.headObject({ scope, objectId: 'object-1' })).found, false);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test('S3-compatible adapter is provider-neutral, scoped, and never exposes credentials in results', async () => {
  const calls = [];
  const client = {
    async putObject(input) { calls.push({ op: 'put', input }); return { etag: 'etag-1' }; },
    async getObject(input) { calls.push({ op: 'get', input }); return { body: Buffer.from('remote'), contentLength: 6, contentType: 'text/plain' }; },
    async headObject(input) { calls.push({ op: 'head', input }); return { contentLength: 6, contentType: 'text/plain', etag: 'etag-1' }; },
    async deleteObject(input) { calls.push({ op: 'delete', input }); return {}; },
  };

  const storage = createS3CompatibleObjectStorageAdapter({
    client,
    bucket: 'documents',
    endpoint: 'https://objects.example.test',
    region: 'local',
    accessKeyId: 'secret-access-key-id',
    secretAccessKey: 'secret-access-key',
  });

  const put = await storage.putObject({ scope, objectId: 'remote-1', body: Buffer.from('remote') });
  assert.equal(put.key, 'tenants/tenant-123/workspaces/workspace-789/objects/remote-1');
  assert.equal(JSON.stringify(put).includes('secret-access-key'), false);
  assert.equal(JSON.stringify(storage).includes('secret-access-key'), false);

  const get = await storage.getObject({ scope, objectId: 'remote-1' });
  assert.equal(get.body.toString('utf8'), 'remote');
  await storage.headObject({ scope, objectId: 'remote-1' });
  await storage.deleteObject({ scope, objectId: 'remote-1' });

  assert.deepEqual(calls.map((call) => call.op), ['put', 'get', 'head', 'delete']);
  for (const call of calls) {
    assert.equal(call.input.bucket, 'documents');
    assert.match(call.input.key, /^tenants\/tenant-123\/workspaces\/workspace-789\/objects\//);
    assert.equal('accessKeyId' in call.input, false);
    assert.equal('secretAccessKey' in call.input, false);
  }
});

test('S3-compatible adapter fails closed before client access when scope is incomplete', async () => {
  let called = false;
  const client = {
    async getObject() { called = true; return {}; },
  };
  const storage = createS3CompatibleObjectStorageAdapter({ client, bucket: 'documents' });

  await assert.rejects(
    storage.getObject({ scope: { tenantId: 'tenant-123' }, objectId: 'remote-1' }),
    /tenant and workspace scope are required/i,
  );
  assert.equal(called, false);
});