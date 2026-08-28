import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveEnterpriseRuntimeConfig,
  createEnterpriseHealthReporter,
} from '../src/enterprise/runtimeHealth.js';
import { createApiApp } from '../src/server.js';

const enterpriseEnv = {
  EVERYTHINGAI_ENTERPRISE_MODE: 'true',
  DATABASE_URL: 'postgres://user:secret@db.example.test/everythingai',
  OIDC_ISSUER: 'https://id.example.test',
  OIDC_CLIENT_ID: 'everythingai',
  S3_ENDPOINT: 'https://object.example.test',
  S3_BUCKET: 'everythingai',
  S3_ACCESS_KEY_ID: 'access',
  S3_SECRET_ACCESS_KEY: 'super-secret',
};

async function withHttpServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  try {
    const address = server.address();
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('local-first mode ignores stray enterprise variables and remains ready without production probes', async () => {
  let probes = 0;
  const config = resolveEnterpriseRuntimeConfig({
    EVERYTHINGAI_ENTERPRISE_MODE: 'false',
    DATABASE_URL: 'postgres://should-not-be-used',
    S3_ENDPOINT: 'https://object.example.test',
  });

  assert.equal(config.mode, 'local');
  assert.equal(config.enterpriseEnabled, false);

  const reporter = createEnterpriseHealthReporter({
    config,
    checks: {
      postgres: async () => { probes += 1; return true; },
      identity: async () => { probes += 1; return true; },
      objectStorage: async () => { probes += 1; return true; },
    },
  });

  const readiness = await reporter.readiness();
  assert.equal(readiness.status, 'ready');
  assert.equal(readiness.mode, 'local');
  assert.equal(probes, 0);
});

test('enterprise mode fails closed when required configuration is incomplete', () => {
  assert.throws(
    () => resolveEnterpriseRuntimeConfig({ EVERYTHINGAI_ENTERPRISE_MODE: 'true' }),
    /enterprise configuration incomplete/i,
  );
});

test('enterprise readiness is fail-closed and only reports validated dependency categories', async () => {
  const config = resolveEnterpriseRuntimeConfig(enterpriseEnv);

  const reporter = createEnterpriseHealthReporter({
    config,
    checks: {
      postgres: async () => true,
      identity: async () => false,
      objectStorage: async () => true,
    },
  });

  const readiness = await reporter.readiness();
  assert.equal(readiness.status, 'not_ready');
  assert.deepEqual(readiness.dependencies, {
    postgres: 'ready',
    identity: 'not_ready',
    objectStorage: 'ready',
  });

  const serialized = JSON.stringify(readiness);
  assert.doesNotMatch(serialized, /super-secret|postgres:\/\/|access@|S3_SECRET|DATABASE_URL/i);
});

test('liveness is dependency-independent and secret-free', () => {
  const config = resolveEnterpriseRuntimeConfig(enterpriseEnv);
  const reporter = createEnterpriseHealthReporter({
    config,
    checks: {
      postgres: async () => { throw new Error('secret dependency failure'); },
      identity: async () => { throw new Error('secret dependency failure'); },
      objectStorage: async () => { throw new Error('secret dependency failure'); },
    },
  });

  assert.deepEqual(reporter.liveness(), {
    status: 'alive',
    service: 'everythingai-api',
    mode: 'enterprise',
  });
});

test('HTTP health endpoints preserve legacy health and local readiness without enterprise probes', async () => {
  let probes = 0;
  const app = createApiApp(
    { runtimeEnv: { EVERYTHINGAI_ENTERPRISE_MODE: 'false', DATABASE_URL: 'postgres://stray' } },
    { enterpriseHealthChecks: {
      postgres: async () => { probes += 1; return true; },
      identity: async () => { probes += 1; return true; },
      objectStorage: async () => { probes += 1; return true; },
    } },
  );

  await withHttpServer(app, async (baseUrl) => {
    const legacy = await fetch(`${baseUrl}/health`);
    assert.equal(legacy.status, 200);
    const legacyBody = await legacy.json();
    assert.equal(legacyBody.status, 'ok');
    assert.equal(legacyBody.service, 'everythingai-api');

    const readiness = await fetch(`${baseUrl}/health/ready`);
    assert.equal(readiness.status, 200);
    assert.deepEqual(await readiness.json(), {
      status: 'ready',
      service: 'everythingai-api',
      mode: 'local',
      dependencies: {},
    });
    assert.equal(probes, 0);
  });
});

test('HTTP enterprise readiness returns 503 on a failed dependency while liveness stays 200', async () => {
  const app = createApiApp(
    { runtimeEnv: enterpriseEnv },
    { enterpriseHealthChecks: {
      postgres: async () => true,
      identity: async () => { throw new Error('provider unavailable with super-secret'); },
      objectStorage: async () => true,
    } },
  );

  await withHttpServer(app, async (baseUrl) => {
    const live = await fetch(`${baseUrl}/health/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), {
      status: 'alive',
      service: 'everythingai-api',
      mode: 'enterprise',
    });

    const ready = await fetch(`${baseUrl}/health/ready`);
    assert.equal(ready.status, 503);
    const body = await ready.json();
    assert.deepEqual(body, {
      status: 'not_ready',
      service: 'everythingai-api',
      mode: 'enterprise',
      dependencies: {
        postgres: 'ready',
        identity: 'not_ready',
        objectStorage: 'ready',
      },
    });
    assert.doesNotMatch(JSON.stringify(body), /super-secret|postgres:\/\/|access@|DATABASE_URL|S3_SECRET/i);
  });
});

test('HTTP enterprise readiness does not claim unvalidated dependencies ready', async () => {
  const app = createApiApp({ runtimeEnv: enterpriseEnv });

  await withHttpServer(app, async (baseUrl) => {
    const ready = await fetch(`${baseUrl}/health/ready`);
    assert.equal(ready.status, 503);
    assert.deepEqual((await ready.json()).dependencies, {
      postgres: 'not_ready',
      identity: 'not_ready',
      objectStorage: 'not_ready',
    });
  });
});
