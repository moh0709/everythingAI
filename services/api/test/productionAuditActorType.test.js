import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionAuditAttributionMiddleware } from '../src/middleware/deviceAuditAttribution.js';

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

function createRequest(principalType) {
  return {
    authorizationContext: {
      status: 'authorized',
      principalId: 'principal-1',
      principalType,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    },
    requestContext: {
      request: { id: 'req-1', source: 'api' },
    },
    deviceIdentityContext: { status: 'not-present', deviceId: null },
  };
}

test('production audit attribution accepts actor types supported by audit_events schema', () => {
  for (const actorType of ['user', 'service_principal', 'system']) {
    const middleware = createProductionAuditAttributionMiddleware();
    const req = createRequest(actorType);
    const res = createResponseRecorder();
    let nextCalls = 0;

    middleware(req, res, () => {
      nextCalls += 1;
    });

    assert.equal(nextCalls, 1);
    assert.equal(req.auditAttribution.actorType, actorType);
  }
});

test('production audit attribution fails closed for actor types unsupported by audit_events schema', () => {
  const middleware = createProductionAuditAttributionMiddleware();
  const req = createRequest('device');
  const res = createResponseRecorder();

  middleware(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Forbidden');
  assert.equal(req.auditAttribution, undefined);
});
