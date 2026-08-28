import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runBoundedCapacityScenario,
  runEnterpriseSecurityRegressionMatrix,
  createEnterpriseReleaseEvidence,
  redactEnterpriseEvidence,
} from '../src/enterprise/capacitySecurity.js';

const exactHead = '0123456789abcdef0123456789abcdef01234567';

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

test('security regression matrix requires fail-closed denial before adapter access', async () => {
  const report = await runEnterpriseSecurityRegressionMatrix({
    cases: [
      { name: 'cross-tenant-denial', exercise: async () => ({ denied: true, adapterCalls: 0 }) },
      { name: 'cross-workspace-denial', exercise: async () => ({ denied: true, adapterCalls: 0 }) },
      { name: 'untrusted-scope-guard-denial', exercise: async () => ({ denied: true, adapterCalls: 0 }) },
      { name: 'tampered-manifest-denial', exercise: async () => ({ denied: true, adapterCalls: 0 }) },
      { name: 'unsupported-schema-denial', exercise: async () => ({ denied: true, adapterCalls: 0 }) },
    ],
  });

  assert.equal(report.status, 'pass');
  assert.equal(report.results.length, 5);
  assert.ok(report.results.every((entry) => entry.status === 'pass' && entry.adapterCalls === 0));

  const unsafe = await runEnterpriseSecurityRegressionMatrix({
    cases: [{ name: 'late-denial', exercise: async () => ({ denied: true, adapterCalls: 1 }) }],
  });
  assert.equal(unsafe.status, 'fail');
});

test('release evidence is exact-head attributable, secret-free and truthful about missing evidence', () => {
  const report = createEnterpriseReleaseEvidence({
    commitSha: exactHead,
    rollbackBoundary: `revert ${exactHead}`,
    capacityResults: [{ name: 'metadata-read', status: 'pass', measured: { iterations: 10 } }],
    securityResults: [{ name: 'cross-tenant-denial', status: 'pass' }],
    inheritedValidation: [{ name: 'enterprise-isolation', status: 'pass' }],
    environment: {
      DATABASE_URL: 'postgres://user:secret@db.example.test/everythingai',
      S3_SECRET_ACCESS_KEY: 'super-secret',
      harmless: 'visible',
    },
  });

  assert.equal(report.status, 'pass');
  assert.equal(report.code.commitSha, exactHead);
  assert.equal(report.rollbackBoundary, `revert ${exactHead}`);
  assert.equal(report.claims.productionCapacityValidated, false);
  assert.equal(report.claims.penetrationTestCertified, false);
  assert.doesNotMatch(JSON.stringify(report), /super-secret|postgres:\/\/user:secret|S3_SECRET_ACCESS_KEY/i);

  assert.equal(createEnterpriseReleaseEvidence({ commitSha: exactHead }).status, 'blocked');
  assert.equal(createEnterpriseReleaseEvidence({
    commitSha: 'not-an-exact-head',
    rollbackBoundary: 'revert something',
    capacityResults: [{ status: 'pass' }],
    securityResults: [{ status: 'pass' }],
    inheritedValidation: [{ status: 'pass' }],
  }).status, 'blocked');
});

test('release evidence fails when any measured or inherited validation fails', () => {
  const report = createEnterpriseReleaseEvidence({
    commitSha: exactHead,
    rollbackBoundary: `revert ${exactHead}`,
    capacityResults: [{ name: 'metadata-read', status: 'pass' }],
    securityResults: [{ name: 'cross-tenant-denial', status: 'pass' }],
    inheritedValidation: [{ name: 'enterprise-isolation', status: 'fail' }],
  });
  assert.equal(report.status, 'fail');
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
