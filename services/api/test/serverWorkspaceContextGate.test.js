import test from 'node:test';
import assert from 'node:assert/strict';
import { attachWorkspaceContext } from '../src/middleware/workspaceContext.js';
import { createApiApp, resolveWorkspaceContextMiddleware } from '../src/server.js';

test('default api app creation does not invoke production workspace middleware wiring', () => {
  let productionFactoryCalls = 0;
  const createProductionWorkspaceContextMiddleware = () => {
    productionFactoryCalls += 1;
    return () => {
      throw new Error('production middleware should not run in default startup');
    };
  };

  const app = createApiApp({}, { createProductionWorkspaceContextMiddleware });

  assert.ok(app);
  assert.equal(productionFactoryCalls, 0);
  assert.strictEqual(
    resolveWorkspaceContextMiddleware({}, { createProductionWorkspaceContextMiddleware }),
    attachWorkspaceContext,
  );
  assert.equal(productionFactoryCalls, 0);
});

test('explicit production workspace resolution is passed through the server wiring gate', () => {
  const capturedOptions = [];
  const sentinelMiddleware = () => {};
  const productionWorkspaceResolution = {
    productionMode: true,
    identityRepository: { kind: 'repository' },
    postgresClient: {
      query() {
        return { rows: [] };
      },
    },
    pool: {
      query() {
        return { rows: [] };
      },
    },
    postgresQuery() {
      return { rows: [] };
    },
  };

  const app = createApiApp(
    { productionWorkspaceResolution },
    {
      createProductionWorkspaceContextMiddleware(options) {
        capturedOptions.push(options);
        return sentinelMiddleware;
      },
    },
  );

  const resolvedMiddleware = resolveWorkspaceContextMiddleware(
    { productionWorkspaceResolution },
    {
      createProductionWorkspaceContextMiddleware(options) {
        capturedOptions.push(options);
        return sentinelMiddleware;
      },
    },
  );

  assert.ok(app);
  assert.equal(capturedOptions.length, 2);
  assert.deepEqual(capturedOptions[0], productionWorkspaceResolution);
  assert.deepEqual(capturedOptions[1], productionWorkspaceResolution);
  assert.strictEqual(resolvedMiddleware, sentinelMiddleware);
});
