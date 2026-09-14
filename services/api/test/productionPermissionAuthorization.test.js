import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductionPermissionAuthorizationMiddleware,
  createProductionPermissionRequirementMiddleware,
  hasProductionPermission,
  resolvePermissionAuthorizationMiddleware,
} from '../src/middleware/permissionAuthorization.js';

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

function createMembershipAuthorizedRequest() {
  return {
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
      membership: { id: 'membership-1', role: 'editor' },
    },
  };
}

test('production permission authorization resolves normalized roles and permissions after membership authorization', async () => {
  const middleware = createProductionPermissionAuthorizationMiddleware({
    async resolvePermissions(scope, context) {
      assert.deepEqual(scope, {
        principal: { id: 'user-1', type: 'user' },
        tenant: { id: 'tenant-1' },
        workspace: { id: 'workspace-1' },
        membership: { id: 'membership-1', role: 'editor' },
      });
      assert.equal(context.requestContext.requestId, 'req-1');
      return {
        status: 'resolved',
        roles: ['editor', ' editor ', 'member'],
        permissions: ['files.read', ' files.write ', 'files.read'],
      };
    },
  });

  const req = createMembershipAuthorizedRequest();
  const res = createResponseRecorder();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(req.authorizationContext.permissionStatus, 'resolved');
  assert.deepEqual(req.authorizationContext.roles, ['editor', 'member']);
  assert.deepEqual(req.authorizationContext.permissions, ['files.read', 'files.write']);
  assert.equal(Object.isFrozen(req.authorizationContext), true);
  assert.equal(Object.isFrozen(req.authorizationContext.permissions), true);
});

test('production permission authorization requires the accepted membership authorization boundary', async () => {
  const middleware = createProductionPermissionAuthorizationMiddleware({
    resolvePermissions: async () => assert.fail('permission lookup should not run'),
  });
  const req = createMembershipAuthorizedRequest();
  req.authorizationContext.status = 'denied';
  const res = createResponseRecorder();

  await middleware(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Forbidden');
});

test('production permission authorization fails closed for missing, denied, and ambiguous resolution', async () => {
  const outcomes = [
    { status: 'missing' },
    { status: 'denied' },
    { status: 'ambiguous' },
    { status: 'resolved', denied: true },
    { status: 'resolved', ambiguous: true },
  ];

  for (const outcome of outcomes) {
    const middleware = createProductionPermissionAuthorizationMiddleware({
      resolvePermissions: async () => outcome,
    });
    const req = createMembershipAuthorizedRequest();
    const res = createResponseRecorder();

    await middleware(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
    assert.equal(JSON.stringify(res.body).includes('tenant-1'), false);
    assert.equal(JSON.stringify(res.body).includes('workspace-1'), false);
  }
});

test('production permission authorization reports unavailable resolver without leaking private diagnostics', async () => {
  const unavailable = createProductionPermissionAuthorizationMiddleware();
  const unavailableResponse = createResponseRecorder();

  await unavailable(
    createMembershipAuthorizedRequest(),
    unavailableResponse,
    () => assert.fail('next should not be called'),
  );
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(unavailableResponse.body.error, 'AuthorizationUnavailable');

  const failing = createProductionPermissionAuthorizationMiddleware({
    async resolvePermissions() {
      throw new Error('private persistence diagnostic');
    },
  });
  const failingResponse = createResponseRecorder();

  await failing(
    createMembershipAuthorizedRequest(),
    failingResponse,
    () => assert.fail('next should not be called'),
  );
  assert.equal(failingResponse.statusCode, 503);
  assert.equal(failingResponse.body.error, 'AuthorizationUnavailable');
  assert.equal(JSON.stringify(failingResponse.body).includes('private persistence diagnostic'), false);
});

test('permission helper and requirement middleware enforce exact permission keys deterministically', () => {
  const req = createMembershipAuthorizedRequest();
  req.authorizationContext = {
    ...req.authorizationContext,
    permissionStatus: 'resolved',
    permissions: ['files.read', 'files.write'],
  };

  assert.equal(hasProductionPermission(req.authorizationContext, 'files.read'), true);
  assert.equal(hasProductionPermission(req.authorizationContext, 'files.delete'), false);
  assert.equal(hasProductionPermission(req.authorizationContext, ' files.read '), true);

  const allowed = createProductionPermissionRequirementMiddleware(['files.read', 'files.write']);
  const allowedResponse = createResponseRecorder();
  let nextCalls = 0;
  allowed(req, allowedResponse, () => {
    nextCalls += 1;
  });
  assert.equal(nextCalls, 1);

  const denied = createProductionPermissionRequirementMiddleware(['files.delete']);
  const deniedResponse = createResponseRecorder();
  denied(req, deniedResponse, () => assert.fail('next should not be called'));
  assert.equal(deniedResponse.statusCode, 403);
  assert.equal(deniedResponse.body.error, 'Forbidden');
});

test('permission requirement with no required permissions is a no-op', () => {
  const middleware = createProductionPermissionRequirementMiddleware();
  let nextCalls = 0;
  middleware({}, createResponseRecorder(), () => {
    nextCalls += 1;
  });
  assert.equal(nextCalls, 1);
});

test('permission authorization resolver preserves local mode unless production enforcement is explicitly enabled', () => {
  let localNextCalls = 0;
  const localMiddleware = resolvePermissionAuthorizationMiddleware();
  localMiddleware({}, {}, () => {
    localNextCalls += 1;
  });
  assert.equal(localNextCalls, 1);

  const customMiddleware = () => {};
  const resolved = resolvePermissionAuthorizationMiddleware(
    { productionPermissionAuthorization: true },
    {
      createProductionPermissionAuthorizationMiddleware({ resolvePermissions }) {
        assert.equal(typeof resolvePermissions, 'function');
        return customMiddleware;
      },
      resolvePermissions: async () => ({ status: 'resolved' }),
    },
  );

  assert.equal(resolved, customMiddleware);
});
