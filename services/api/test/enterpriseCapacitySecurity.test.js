import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runBoundedCapacityScenario,
  createEnterpriseReleaseEvidence,
  redactEnterpriseEvidence,
} from '../src/enterprise/capacitySecurity.js';

test('bounded capacity scenario records measured regression evidence without production claims', async () => {
  let inFlight = 0;
  let peak = 0;
  const result = await runBoundedCapacityScenario({
    name: 'metadata-read',
    iterations: 12,
    concurrency: 3,
    maxIterations: 50,
    maxConcurrency: 8,
    operation: async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return { ok: true };
    },
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.measured.iterations, 12);
  assert.ok(result.measured.peakConcurrency <= 3);
  assert.equal(peak, result.measured.peakConcurrency);
  assert.equal(result.claims.productionValidated, false);
  assert.equal(result.claims.sla, null);
});

test('capacity scenario rejects unbounded or invalid workload configuration', async () => {
  await assert.rejects(
    () => runBoundedCapacityScenario({
      name: 'too-large', iterations: 51, concurrency: 1, maxIterations: 50, maxConcurrency: 8, operation: async () => true,
    }),
    /bounded capacity configuration denied/i,
  );
  await assert.rejects(
    () => runBoundedCapacityScenario({
      name: 'too-wide', iterations: 10, concurrency: 9, maxIterations: 50, maxConcurrency: 8, operation: async () => true,
    }),
    /bounded capacity configuration denied/i,
  );
});

test('release evidence is exact-head attributable, secret-free and truthful about missing evidence', () => {
  const report = createEnterpriseReleaseEvidence({
    commitSha: 'abc123def456',
    rollbackBoundary: 'revert abc123def456',
    capacityResults: [{ name: 'metadata-read', status: 'pass', measured: { iterations: 10 } }],
    securityResults: [{ name: 'cross-tenant-denial', status: 'pass' }],
    environment: {
      DATABASE_URL: 'postgres://user:secret@db.example.test/everythingai',
      S3_SECRET_ACCESS_KEY: 'super-secret',
      harmless: 'visible',
    },
  });

  assert.equal(report.status, 'pass');
  assert.equal(report.code.commitSha, 'abc123def456');
  assert.equal(report.rollbackBoundary, 'revert abc123def456');
  assert.equal(report.claims.productionCapacityValidated, false);
  assert.equal(report.claims.penetrationTestCertified, false);
  assert.doesNotMatch(JSON.stringify(report), /super-secret|postgres:\/\/user:secret|S3_SECRET_ACCESS_KEY/i);

  const blocked = createEnterpriseReleaseEvidence({ commitSha: 'abc123def456' });
  assert.equal(blocked.status, 'blocked');
});

test('evidence redaction removes credential-bearing fields and URI credentials recursively', () => {
  const sanitized = redactEnterpriseEvidence({
    token: 'secret-token',
    nested: {
      password: 'secret-password',
      url: 'https://user:secret@example.test/path',
      message: 'failure connecting to postgres://user:secret@db.example.test/everythingai',
    },
  });

  const serialized = JSON.stringify(sanitized);
  assert.doesNotMatch(serialized, /secret-token|secret-password|user:secret|postgres:\/\/user:secret/i);
});