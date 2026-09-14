import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionAuthenticationMiddleware, resolveAuthenticationMiddleware } from '../src/middleware/auth.js';
import { createProductionMembershipAuthorizationMiddleware, resolveMembershipAuthorizationMiddleware } from '../src/middleware/membershipAuthorization.js';
import { createProductionPermissionAuthorizationMiddleware, resolvePermissionAuthorizationMiddleware } from '../src/middleware/permissionAuthorization.js';
import { createProductionResourceScopeAuthorizationMiddleware, resolveResourceScopeAuthorizationMiddleware } from '../src/middleware/resourceScopeAuthorization.js';
import { createProductionDeviceIdentityMiddleware, createProductionAuditAttributionMiddleware, resolveDeviceIdentityMiddleware, resolveAuditAttributionMiddleware } from '../src/middleware/deviceAuditAttribution.js';
import { resolveActionAuditContext } from '../src/middleware/auditContextBridge.js';

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

async function runMiddleware(middleware, req, res) {
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  return nextCalled;
}

function baseRequest(overrides = {}) {
  return {
    headers: {
      authorization: 'Bearer valid-token',
      'x-device-id': 'device-1',
      'x-actor-id': 'spoofed-user',
      'x-actor-type': 'system',
      'x-tenant-id': 'tenant-foreign',
      'x-workspace-id': 'workspace-foreign',
      ...overrides.headers,
    },
    params: { fileId: 'file-1', ...overrides.params },
    requestContext: {
      requestId: 'req-1',
      requestSource: 'api',
      ...overrides.requestContext,
    },
    workspaceContext: {
      resolvedTenant: { id: 'tenant-1' },
      resolvedWorkspace: { id: 'workspace-1', tenantId: 'tenant-1' },
      resolution: { status: 'resolved' },
      ...overrides.workspaceContext,
    },
  };
}

function createIntegratedChain({
  membershipOutcome = { status: 'allowed', membership: { id: 'membership-1', role: 'editor' } },
  permissionOutcome = { status: 'resolved', roles: ['editor'], permissions: ['documents.read'] },
  resourceOutcome = { status: 'resolved', resourceScope: { tenantId: 'tenant-1', workspaceId: 'workspace-1' } },
  deviceOutcome = { status: 'resolved', device: { id: 'device-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', type: 'desktop-agent' } },
} = {}) {
  return [
    createProductionAuthenticationMiddleware({
      verifyBearerToken: async (token) => token === 'valid-token'
        ? { status: 'valid', principal: { id: 'user-1', type: 'user' } }
        : { status: 'invalid' },
    }),
    createProductionMembershipAuthorizationMiddleware({ resolveMembership: async () => membershipOutcome }),
    createProductionPermissionAuthorizationMiddleware({ resolvePermissions: async () => permissionOutcome }),
    createProductionResourceScopeAuthorizationMiddleware({
      requiredPermissions: ['documents.read'],
      resolveResourceScope: async () => resourceOutcome,
    }),
    createProductionDeviceIdentityMiddleware({ resolveDeviceIdentity: async () => deviceOutcome }),
    createProductionAuditAttributionMiddleware(),
  ];
}

async function runIntegratedChain(req, chain = createIntegratedChain()) {
  const res = createResponseRecorder();
  for (const middleware of chain) {
    const nextCalled = await runMiddleware(middleware, req, res);
    if (!nextCalled) return { req, res, completed: false };
  }
  return { req, res, completed: true };
}

test('integrated production identity chain allows exact same-tenant same-workspace scope and produces trusted audit context', async () => {
  const req = baseRequest();
  const result = await runIntegratedChain(req);

  assert.equal(result.completed, true);
  assert.equal(req.authenticatedPrincipal.id, 'user-1');
  assert.equal(req.authorizationContext.tenantId, 'tenant-1');
  assert.equal(req.authorizationContext.workspaceId, 'workspace-1');
  assert.deepEqual(req.authorizationContext.permissions, ['documents.read']);
  assert.equal(req.resourceAuthorizationContext.status, 'authorized');
  assert.equal(req.deviceIdentityContext.deviceId, 'device-1');
  assert.equal(req.auditAttribution.actorId, 'user-1');
  assert.equal(req.auditAttribution.tenantId, 'tenant-1');
  assert.equal(req.auditAttribution.workspaceId, 'workspace-1');

  const auditContext = resolveActionAuditContext(req, { productionAuditAttribution: true });
  assert.equal(auditContext.actor.id, 'user-1');
  assert.equal(auditContext.actor.type, 'user');
  assert.equal(auditContext.tenant.id, 'tenant-1');
  assert.equal(auditContext.workspace.id, 'workspace-1');
  assert.equal(auditContext.device.id, 'device-1');
  assert.equal(JSON.stringify(auditContext).includes('spoofed-user'), false);
  assert.equal(JSON.stringify(auditContext).includes('tenant-foreign'), false);
});

test('integrated chain denies same-tenant different-workspace resources generically', async () => {
  const result = await runIntegratedChain(baseRequest(), createIntegratedChain({
    resourceOutcome: { status: 'resolved', resourceScope: { tenantId: 'tenant-1', workspaceId: 'workspace-2' } },
  }));

  assert.equal(result.completed, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.res.body.error, 'Forbidden');
  assert.equal(JSON.stringify(result.res.body).includes('workspace-2'), false);
});

test('integrated chain denies cross-tenant resources generically', async () => {
  const result = await runIntegratedChain(baseRequest(), createIntegratedChain({
    resourceOutcome: { status: 'resolved', resourceScope: { tenantId: 'tenant-2', workspaceId: 'workspace-9' } },
  }));

  assert.equal(result.completed, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.res.body.error, 'Forbidden');
  assert.equal(JSON.stringify(result.res.body).includes('tenant-2'), false);
});

test('integrated chain fails closed for ambiguous membership and permissions', async () => {
  const membershipDenied = await runIntegratedChain(baseRequest(), createIntegratedChain({
    membershipOutcome: { status: 'ambiguous' },
  }));
  assert.equal(membershipDenied.completed, false);
  assert.equal(membershipDenied.res.statusCode, 403);

  const permissionDenied = await runIntegratedChain(baseRequest(), createIntegratedChain({
    permissionOutcome: { status: 'resolved', ambiguous: true, permissions: ['documents.read'] },
  }));
  assert.equal(permissionDenied.completed, false);
  assert.equal(permissionDenied.res.statusCode, 403);
});

test('integrated chain fails closed when required permission is missing', async () => {
  const result = await runIntegratedChain(baseRequest(), createIntegratedChain({
    permissionOutcome: { status: 'resolved', roles: ['viewer'], permissions: ['documents.preview'] },
  }));

  assert.equal(result.completed, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.res.body.error, 'Forbidden');
});

test('integrated chain fails closed for foreign device scope', async () => {
  const result = await runIntegratedChain(baseRequest(), createIntegratedChain({
    deviceOutcome: { status: 'resolved', device: { id: 'device-1', tenantId: 'tenant-1', workspaceId: 'workspace-2' } },
  }));

  assert.equal(result.completed, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(JSON.stringify(result.res.body).includes('workspace-2'), false);
});

test('trusted audit bridge fails closed when production attribution is missing', () => {
  assert.throws(
    () => resolveActionAuditContext({ requestContext: { actor: { id: 'spoofed' } } }, { productionAuditAttribution: true }),
    /Trusted production audit attribution is required/,
  );
});

test('local MVP resolvers remain passthrough when production boundaries are disabled', async () => {
  const localReq = { headers: { authorization: `Bearer ${process.env.API_TOKEN || 'replace-with-your-local-development-token'}` } };
  const res = createResponseRecorder();
  const localChain = [
    resolveAuthenticationMiddleware(),
    resolveMembershipAuthorizationMiddleware(),
    resolvePermissionAuthorizationMiddleware(),
    resolveResourceScopeAuthorizationMiddleware(),
    resolveDeviceIdentityMiddleware(),
    resolveAuditAttributionMiddleware(),
  ];

  for (const middleware of localChain) {
    const nextCalled = await runMiddleware(middleware, localReq, res);
    assert.equal(nextCalled, true);
  }

  const localContext = { actor: { id: 'local-user' } };
  assert.equal(resolveActionAuditContext({ requestContext: localContext }, { productionAuditAttribution: false }), localContext);
});
