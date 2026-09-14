import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveActionAuditContext } from '../src/middleware/auditContextBridge.js';

function createRequest() {
  return {
    requestContext: {
      actor: {
        type: 'user',
        id: 'spoofed-user',
        email: 'spoofed@example.com',
      },
      tenant: { id: 'spoofed-tenant' },
      workspace: { id: 'spoofed-workspace' },
      request: {
        id: 'header-request-id',
        source: 'header-source',
      },
    },
    auditAttribution: {
      actorType: 'user',
      actorId: 'trusted-user-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      requestId: 'trusted-request-id',
      requestSource: 'api',
      deviceId: 'device-1',
    },
  };
}

test('production action audit context uses trusted attribution and ignores spoofable actor headers', () => {
  const context = resolveActionAuditContext(createRequest(), {
    productionAuditAttribution: true,
  });

  assert.deepEqual(context, {
    actor: {
      type: 'user',
      id: 'trusted-user-1',
      email: null,
    },
    tenant: { id: 'tenant-1' },
    workspace: { id: 'workspace-1' },
    request: {
      id: 'trusted-request-id',
      source: 'api',
    },
    device: { id: 'device-1' },
  });

  assert.notEqual(context.actor.id, 'spoofed-user');
  assert.notEqual(context.tenant.id, 'spoofed-tenant');
  assert.notEqual(context.workspace.id, 'spoofed-workspace');
});

test('production action audit context fails closed when trusted attribution is absent', () => {
  const req = createRequest();
  delete req.auditAttribution;

  assert.throws(
    () => resolveActionAuditContext(req, { productionAuditAttribution: true }),
    /Trusted production audit attribution is required/,
  );
});

test('local action audit context preserves existing request context exactly', () => {
  const req = createRequest();
  const context = resolveActionAuditContext(req, {
    productionAuditAttribution: false,
  });

  assert.equal(context, req.requestContext);
});

test('production action audit context permits an absent device without inventing device identity', () => {
  const req = createRequest();
  req.auditAttribution = {
    ...req.auditAttribution,
    deviceId: null,
  };

  const context = resolveActionAuditContext(req, {
    productionAuditAttribution: true,
  });

  assert.deepEqual(context.device, { id: null });
});
