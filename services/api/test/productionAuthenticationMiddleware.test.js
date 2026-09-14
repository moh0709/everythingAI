import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProductionAuthenticationMiddleware,
  requireApiToken,
  resolveAuthenticationMiddleware,
} from '../src/middleware/auth.js';

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

test('production authentication accepts a verified principal and attaches normalized identity', async () => {
  const middleware = createProductionAuthenticationMiddleware({
    async verifyBearerToken(token, context) {
      assert.equal(token, 'verified-token');
      assert.deepEqual(context.requestContext, { requestId: 'req-1' });
      assert.deepEqual(context.workspaceContext, { resolution: { status: 'resolved' } });
      return {
        status: 'authenticated',
        principal: {
          id: ' user-1 ',
          type: 'user',
          email: 'user@example.test',
        },
      };
    },
  });

  const req = {
    headers: { authorization: 'Bearer verified-token' },
    requestContext: { requestId: 'req-1' },
    workspaceContext: { resolution: { status: 'resolved' } },
  };
  const res = createResponseRecorder();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(req.authenticatedPrincipal.id, 'user-1');
  assert.equal(req.authenticatedPrincipal.type, 'user');
  assert.equal(req.authenticatedPrincipal.authenticated, true);
});

test('production authentication fails closed when verifier is unavailable', async () => {
  const middleware = createProductionAuthenticationMiddleware();
  const req = { headers: { authorization: 'Bearer token' } };
  const res = createResponseRecorder();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'AuthenticationUnavailable');
});

test('production authentication rejects missing, invalid, anonymous, and malformed principals', async () => {
  const cases = [
    {
      request: { headers: {} },
      verifier: async () => ({ status: 'authenticated', principal: { id: 'user-1', type: 'user' } }),
    },
    {
      request: { headers: { authorization: 'Bearer invalid-token' } },
      verifier: async () => ({ status: 'invalid', principal: null }),
    },
    {
      request: { headers: { authorization: 'Bearer anonymous-token' } },
      verifier: async () => ({ principal: { id: 'anonymous-1', type: 'anonymous' } }),
    },
    {
      request: { headers: { authorization: 'Bearer malformed-token' } },
      verifier: async () => ({ principal: { id: '   ', type: 'user' } }),
    },
  ];

  for (const entry of cases) {
    const middleware = createProductionAuthenticationMiddleware({ verifyBearerToken: entry.verifier });
    const res = createResponseRecorder();
    let nextCalls = 0;

    await middleware(entry.request, res, () => {
      nextCalls += 1;
    });

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'Unauthorized');
  }
});

test('production authentication treats verifier failures as service unavailability without leaking details', async () => {
  const middleware = createProductionAuthenticationMiddleware({
    async verifyBearerToken() {
      throw new Error('private provider diagnostic');
    },
  });
  const req = { headers: { authorization: 'Bearer token' } };
  const res = createResponseRecorder();

  await middleware(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'AuthenticationUnavailable');
  assert.equal(JSON.stringify(res.body).includes('private provider diagnostic'), false);
});

test('authentication resolver preserves local API-token mode unless production authentication is explicitly enabled', () => {
  assert.equal(resolveAuthenticationMiddleware(), requireApiToken);

  const customMiddleware = () => {};
  const resolved = resolveAuthenticationMiddleware(
    { productionAuthentication: true },
    {
      createProductionAuthenticationMiddleware({ verifyBearerToken }) {
        assert.equal(typeof verifyBearerToken, 'function');
        return customMiddleware;
      },
      verifyBearerToken: async () => ({ principal: { id: 'user-1', type: 'user' } }),
    },
  );

  assert.equal(resolved, customMiddleware);
});
