import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveEnterpriseRuntimeConfig,
  createEnterpriseHealthReporter,
} from '../src/enterprise/runtimeHealth.js';

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
  const config = resolveEnterpriseRuntimeConfig({
    EVERYTHINGAI_ENTERPRISE_MODE: 'true',
    DATABASE_URL: 'postgres://user:secret@db.example.test/everythingai',
    OIDC_ISSUER: 'https://id.example.test',
    OIDC_CLIENT_ID: 'everythingai',
    S3_ENDPOINT: 'https://object.example.test',
    S3_BUCKET: 'everythingai',
    S3_ACCESS_KEY_ID: 'access',
    S3_SECRET_ACCESS_KEY: 'super-secret',
  });

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

test('liveness is dependency-independent and secret-free', async () => {
  const config = resolveEnterpriseRuntimeConfig({
    EVERYTHINGAI_ENTERPRISE_MODE: 'true',
    DATABASE_URL: 'postgres://user:secret@db.example.test/everythingai',
    OIDC_ISSUER: 'https://id.example.test',
    OIDC_CLIENT_ID: 'everythingai',
    S3_ENDPOINT: 'https://object.example.test',
    S3_BUCKET: 'everythingai',
    S3_ACCESS_KEY_ID: 'access',
    S3_SECRET_ACCESS_KEY: 'super-secret',
  });
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
