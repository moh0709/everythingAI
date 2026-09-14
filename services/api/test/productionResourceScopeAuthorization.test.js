import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductionResourceScopeAuthorizationMiddleware,
  resolveResourceScopeAuthorizationMiddleware,
} from '../src/middleware/resourceScopeAuthorization.js';

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createAuthorizedRequest() {
  return {
    params: { fileId: 'file-1' },
    requestContext: { requestId: 'req-1' },
    workspaceContext: {
      resolvedTenant: { id: 'tenant-1' },
      resolvedWorkspace: { id: 'workspace-1' },
      resolution: { status: 'resolved' },
    },
    authorizationContext: {
      status: 'authorized',
      principalId: 'user-1',
      principalType: 'user',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      permissionStatus: 'resolved',
      permissions: ['documents.read'],
    },
  };
}

test('resource scope authorization allows exact tenant/workspace ownership with required permission', async () => {
  const middleware = createProductionResourceScopeAuthorizationMiddleware({
    requiredPermissions: ['documents.read'],
    async resolveResourceScope(scope, context) {
      assert.equal(scope.resourceId, 'file-1');
      assert.equal(scope.tenant.id, 'tenant-1');
      assert.equal(scope.workspace.id, 'workspace-1');
      assert.equal(context.requestContext.requestId, 'req-1');
      return {
        status: 'resolved',
        resourceScope: { tenantId: 'tenant-1', workspaceId: 'workspace-1' },
      };
    },
  });

  const req = createAuthorizedRequest();
  const res = createResponseRecorder();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(req.resourceAuthorizationContext.status, 'authorized');
  assert.equal(req.resourceAuthorizationContext.resourceId, 'file-1');
  assert.deepEqual(req.resourceAuthorizationContext.requiredPermissions, ['documents.read']);
});

test('resource scope authorization denies same-tenant different-workspace resources', async () => {
  const middleware = createProductionResourceScopeAuthorizationMiddleware({
    requiredPermissions: ['documents.read'],
    resolveResourceScope: async () => ({
      status: 'resolved',
      resourceScope: { tenantId: 'tenant-1', workspaceId: 'workspace-2' },
    }),
  });
  const res = createResponseRecorder();

  await middleware(createAuthorizedRequest(), res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Forbidden');
});

test('resource scope authorization denies cross-tenant resources without leaking scope details', async () => {
  const middleware = createProductionResourceScopeAuthorizationMiddleware({
    requiredPermissions: ['documents.read'],
    resolveResourceScope: async () => ({
      status: 'resolved',
      resourceScope: { tenantId: 'tenant-2', workspaceId: 'workspace-9' },
    }),
  });
  const res = createResponseRecorder();

  await middleware(createAuthorizedRequest(), res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(JSON.stringify(res.body).includes('tenant-2'), false);
  assert.equal(JSON.stringify(res.body).includes('workspace-9'), false);
});

test('resource scope authorization denies missing, ambiguous, and denied resource scope', async () => {
  const outcomes = [
    { status: 'missing' },
    { status: 'ambiguous' },
    { status: 'resolved', ambiguous: true },
    { status: 'resolved', denied: true },
    { status: 'resolved', resourceScope: null },
  ];

  for (const outcome of outcomes) {
    const middleware = createProductionResourceScopeAuthorizationMiddleware({
      requiredPermissions: ['documents.read'],
      resolveResourceScope: async () => outcome,
    });
    const res = createResponseRecorder();

    await middleware(createAuthorizedRequest(), res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
  }
});

test('resource scope authorization requires the explicit permission key', async () => {
  const middleware = createProductionResourceScopeAuthorizationMiddleware({
    requiredPermissions: ['documents.read'],
    resolveResourceScope: async () => assert.fail('resource lookup should not run'),
  });
  const req = createAuthorizedRequest();
  req.authorizationContext.permissions = ['documents.write'];
  const res = createResponseRecorder();

  await middleware(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Forbidden');
});

test('resource scope authorization reports unavailable resolver failures without leaking diagnostics', async () => {
  const unavailable = createProductionResourceScopeAuthorizationMiddleware({
    requiredPermissions: ['documents.read'],
  });
  const unavailableResponse = createResponseRecorder();

  await unavailable(createAuthorizedRequest(), unavailableResponse, () => assert.fail('next should not be called'));
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(unavailableResponse.body.error, 'AuthorizationUnavailable');

  const failing = createProductionResourceScopeAuthorizationMiddleware({
    requiredPermissions: ['documents.read'],
    async resolveResourceScope() {
      throw new Error('private database diagnostic');
    },
  });
  const failingResponse = createResponseRecorder();

  await failing(createAuthorizedRequest(), failingResponse, () => assert.fail('next should not be called'));
  assert.equal(failingResponse.statusCode, 503);
  assert.equal(JSON.stringify(failingResponse.body).includes('private database diagnostic'), false);
});

test('resource scope resolver preserves local mode unless production enforcement is explicitly enabled', () => {
  let localNextCalls = 0;
  const localMiddleware = resolveResourceScopeAuthorizationMiddleware();
  localMiddleware({}, {}, () => {
    localNextCalls += 1;
  });
  assert.equal(localNextCalls, 1);

  const customMiddleware = () => {};
  const resolved = resolveResourceScopeAuthorizationMiddleware(
    {
      productionResourceScopeAuthorization: true,
      requiredPermissions: ['documents.read'],
    },
    {
      createProductionResourceScopeAuthorizationMiddleware({ requiredPermissions, resolveResourceScope }) {
        assert.deepEqual(requiredPermissions, ['documents.read']);
        assert.equal(typeof resolveResourceScope, 'function');
        return customMiddleware;
      },
      resolveResourceScope: async () => ({ status: 'resolved' }),
    },
  );

  assert.equal(resolved, customMiddleware);
});
