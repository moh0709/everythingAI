import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductionMembershipAuthorizationMiddleware,
  resolveMembershipAuthorizationMiddleware,
} from '../src/middleware/membershipAuthorization.js';

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
    authenticatedPrincipal: {
      id: 'user-1',
      type: 'user',
      authenticated: true,
    },
    requestContext: { requestId: 'req-1' },
    workspaceContext: {
      resolvedTenant: { id: 'tenant-1' },
      resolvedWorkspace: { id: 'workspace-1' },
      resolution: { status: 'resolved' },
    },
  };
}

test('production membership authorization accepts an allowed membership and attaches bounded authorization context', async () => {
  const middleware = createProductionMembershipAuthorizationMiddleware({
    async resolveMembership(scope, context) {
      assert.deepEqual(scope, {
        principal: { id: 'user-1', type: 'user' },
        tenant: { id: 'tenant-1' },
        workspace: { id: 'workspace-1' },
      });
      assert.equal(context.requestContext.requestId, 'req-1');
      return {
        status: 'allowed',
        membership: { id: 'membership-1', role: 'member' },
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
  assert.equal(req.authorizationContext.status, 'authorized');
  assert.equal(req.authorizationContext.principalId, 'user-1');
  assert.equal(req.authorizationContext.tenantId, 'tenant-1');
  assert.equal(req.authorizationContext.workspaceId, 'workspace-1');
  assert.equal(req.authorizationContext.membership.role, 'member');
});

test('production membership authorization requires an authenticated principal', async () => {
  const middleware = createProductionMembershipAuthorizationMiddleware({
    resolveMembership: async () => ({ status: 'allowed' }),
  });
  const req = createAuthorizedRequest();
  delete req.authenticatedPrincipal;
  const res = createResponseRecorder();

  await middleware(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Unauthorized');
});

test('production membership authorization fails closed for unresolved production scope', async () => {
  const middleware = createProductionMembershipAuthorizationMiddleware({
    resolveMembership: async () => assert.fail('membership lookup should not run'),
  });
  const req = createAuthorizedRequest();
  req.workspaceContext.resolution.status = 'unresolved';
  req.workspaceContext.resolvedWorkspace = null;
  const res = createResponseRecorder();

  await middleware(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Forbidden');
});

test('production membership authorization denies missing, denied, and ambiguous memberships without leaking scope details', async () => {
  const outcomes = [
    { status: 'missing' },
    { status: 'denied' },
    { status: 'ambiguous' },
    { allowed: false },
  ];

  for (const outcome of outcomes) {
    const middleware = createProductionMembershipAuthorizationMiddleware({
      resolveMembership: async () => outcome,
    });
    const req = createAuthorizedRequest();
    const res = createResponseRecorder();

    await middleware(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
    assert.equal(JSON.stringify(res.body).includes('tenant-1'), false);
    assert.equal(JSON.stringify(res.body).includes('workspace-1'), false);
  }
});

test('production membership authorization reports unavailable dependency and resolver failures without leaking diagnostics', async () => {
  const unavailable = createProductionMembershipAuthorizationMiddleware();
  const unavailableResponse = createResponseRecorder();

  await unavailable(createAuthorizedRequest(), unavailableResponse, () => assert.fail('next should not be called'));
  assert.equal(unavailableResponse.statusCode, 503);
  assert.equal(unavailableResponse.body.error, 'AuthorizationUnavailable');

  const failing = createProductionMembershipAuthorizationMiddleware({
    async resolveMembership() {
      throw new Error('private persistence diagnostic');
    },
  });
  const failingResponse = createResponseRecorder();

  await failing(createAuthorizedRequest(), failingResponse, () => assert.fail('next should not be called'));
  assert.equal(failingResponse.statusCode, 503);
  assert.equal(failingResponse.body.error, 'AuthorizationUnavailable');
  assert.equal(JSON.stringify(failingResponse.body).includes('private persistence diagnostic'), false);
});

test('membership authorization resolver preserves local mode unless production enforcement is explicitly enabled', () => {
  let localNextCalls = 0;
  const localMiddleware = resolveMembershipAuthorizationMiddleware();
  localMiddleware({}, {}, () => {
    localNextCalls += 1;
  });
  assert.equal(localNextCalls, 1);

  const customMiddleware = () => {};
  const resolved = resolveMembershipAuthorizationMiddleware(
    { productionMembershipAuthorization: true },
    {
      createProductionMembershipAuthorizationMiddleware({ resolveMembership }) {
        assert.equal(typeof resolveMembership, 'function');
        return customMiddleware;
      },
      resolveMembership: async () => ({ status: 'allowed' }),
    },
  );

  assert.equal(resolved, customMiddleware);
});
