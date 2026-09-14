import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductionAuditAttributionMiddleware,
  createProductionDeviceIdentityMiddleware,
  resolveAuditAttributionMiddleware,
  resolveDeviceIdentityMiddleware,
} from '../src/middleware/deviceAuditAttribution.js';

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
    headers: {},
    requestContext: {
      request: { id: 'req-1', source: 'api' },
    },
    workspaceContext: {
      resolvedTenant: { id: 'tenant-1' },
      resolvedWorkspace: { id: 'workspace-1' },
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

test('device identity allows a scope-bound resolved device and records bounded context', async () => {
  const middleware = createProductionDeviceIdentityMiddleware({
    async resolveDeviceIdentity(scope, context) {
      assert.equal(scope.deviceId, 'device-1');
      assert.equal(scope.principal.id, 'user-1');
      assert.equal(scope.tenant.id, 'tenant-1');
      assert.equal(scope.workspace.id, 'workspace-1');
      assert.equal(context.requestContext.request.id, 'req-1');
      return {
        status: 'resolved',
        device: {
          id: 'device-1',
          tenantId: 'tenant-1',
          workspaceId: 'workspace-1',
          type: 'client-agent',
        },
      };
    },
  });

  const req = createAuthorizedRequest();
  req.headers['x-device-id'] = 'device-1';
  const res = createResponseRecorder();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(req.deviceIdentityContext.status, 'resolved');
  assert.equal(req.deviceIdentityContext.deviceId, 'device-1');
  assert.equal(req.deviceIdentityContext.deviceType, 'client-agent');
  assert.equal(Object.isFrozen(req.deviceIdentityContext), true);
});

test('device identity is optional for user-only browser requests', async () => {
  const middleware = createProductionDeviceIdentityMiddleware({
    resolveDeviceIdentity: async () => assert.fail('resolver should not run without a device assertion'),
  });
  const req = createAuthorizedRequest();
  const res = createResponseRecorder();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.deepEqual(req.deviceIdentityContext, { status: 'not-present', deviceId: null });
});

test('device identity denies foreign, missing, ambiguous, and denied device scope without leakage', async () => {
  const outcomes = [
    { status: 'missing' },
    { status: 'ambiguous' },
    { status: 'resolved', ambiguous: true },
    { status: 'resolved', denied: true },
    { status: 'resolved', device: { id: 'device-1', tenantId: 'tenant-2', workspaceId: 'workspace-1' } },
    { status: 'resolved', device: { id: 'device-1', tenantId: 'tenant-1', workspaceId: 'workspace-2' } },
    { status: 'resolved', device: { id: 'device-2', tenantId: 'tenant-1', workspaceId: 'workspace-1' } },
  ];

  for (const outcome of outcomes) {
    const middleware = createProductionDeviceIdentityMiddleware({
      resolveDeviceIdentity: async () => outcome,
    });
    const req = createAuthorizedRequest();
    req.headers['x-device-id'] = 'device-1';
    const res = createResponseRecorder();

    await middleware(req, res, () => assert.fail('next should not be called'));
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
    assert.equal(JSON.stringify(res.body).includes('tenant-2'), false);
    assert.equal(JSON.stringify(res.body).includes('workspace-2'), false);
  }
});

test('device identity reports unavailable resolver failures without leaking diagnostics', async () => {
  const req = createAuthorizedRequest();
  req.headers['x-device-id'] = 'device-1';

  const unavailable = createProductionDeviceIdentityMiddleware();
  const unavailableResponse = createResponseRecorder();
  await unavailable(req, unavailableResponse, () => assert.fail('next should not be called'));
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(unavailableResponse.body.error, 'AuthorizationUnavailable');

  const failing = createProductionDeviceIdentityMiddleware({
    async resolveDeviceIdentity() {
      throw new Error('private resolver diagnostic');
    },
  });
  const failingResponse = createResponseRecorder();
  await failing(req, failingResponse, () => assert.fail('next should not be called'));
  assert.equal(failingResponse.statusCode, 503);
  assert.equal(JSON.stringify(failingResponse.body).includes('private resolver diagnostic'), false);
});

test('audit attribution derives actor and scope from authenticated authorization, not transport actor headers', () => {
  const middleware = createProductionAuditAttributionMiddleware();
  const req = createAuthorizedRequest();
  req.headers['x-actor-id'] = 'spoofed-user';
  req.headers['x-actor-type'] = 'system';
  req.deviceIdentityContext = {
    status: 'resolved',
    deviceId: 'device-1',
  };
  const res = createResponseRecorder();
  let nextCalls = 0;

  middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.deepEqual(req.auditAttribution, {
    actorType: 'user',
    actorId: 'user-1',
    tenantId: 'tenant-1',
    workspaceId: 'workspace-1',
    requestId: 'req-1',
    requestSource: 'api',
    deviceId: 'device-1',
  });
  assert.equal(Object.isFrozen(req.auditAttribution), true);
});

test('audit attribution supports user-only requests without a device', () => {
  const middleware = createProductionAuditAttributionMiddleware();
  const req = createAuthorizedRequest();
  req.deviceIdentityContext = { status: 'not-present', deviceId: null };
  const res = createResponseRecorder();

  middleware(req, res, () => {});

  assert.equal(req.auditAttribution.actorId, 'user-1');
  assert.equal(req.auditAttribution.deviceId, null);
});

test('audit attribution fails closed without accepted authorization context', () => {
  const middleware = createProductionAuditAttributionMiddleware();
  const req = createAuthorizedRequest();
  req.authorizationContext.status = 'denied';
  const res = createResponseRecorder();

  middleware(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Forbidden');
});

test('device and audit middleware resolvers preserve local compatibility unless explicitly enabled', () => {
  let deviceNextCalls = 0;
  resolveDeviceIdentityMiddleware()({}, {}, () => {
    deviceNextCalls += 1;
  });
  assert.equal(deviceNextCalls, 1);

  let auditNextCalls = 0;
  resolveAuditAttributionMiddleware()({}, {}, () => {
    auditNextCalls += 1;
  });
  assert.equal(auditNextCalls, 1);

  const customDeviceMiddleware = () => {};
  const resolvedDevice = resolveDeviceIdentityMiddleware(
    { productionDeviceIdentity: true },
    {
      createProductionDeviceIdentityMiddleware({ resolveDeviceIdentity }) {
        assert.equal(typeof resolveDeviceIdentity, 'function');
        return customDeviceMiddleware;
      },
      resolveDeviceIdentity: async () => ({ status: 'resolved' }),
    },
  );
  assert.equal(resolvedDevice, customDeviceMiddleware);

  const customAuditMiddleware = () => {};
  const resolvedAudit = resolveAuditAttributionMiddleware(
    { productionAuditAttribution: true },
    {
      createProductionAuditAttributionMiddleware() {
        return customAuditMiddleware;
      },
    },
  );
  assert.equal(resolvedAudit, customAuditMiddleware);
});
