import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEnterpriseReleaseEvidence,
  runBoundedCapacityScenario,
} from '../src/enterprise/capacitySecurity.js';

const exactHead = '0123456789abcdef0123456789abcdef01234567';
const passingCapacity = [{ name: 'metadata-read', status: 'pass' }];
const passingSecurity = [{ name: 'cross-tenant-denial', status: 'pass' }];
const passingInherited = [{ name: 'enterprise-isolation', status: 'pass' }];

test('release evidence drops arbitrary environment fields instead of relying on heuristic redaction', () => {
  const report = createEnterpriseReleaseEvidence({
    commitSha: exactHead,
    rollbackBoundary: `revert ${exactHead}`,
    capacityResults: passingCapacity,
    securityResults: passingSecurity,
    inheritedValidation: passingInherited,
    environment: {
      ci: true,
      runtime: 'node',
      nodeVersion: 'v22.18.0',
      platform: 'linux',
      architecture: 'x64',
      session: 'opaque-secret-that-does-not-look-like-a-known-token',
      arbitrary: 'must-not-be-emitted',
      databaseHost: 'internal-db.example.test',
    },
  });

  assert.equal(report.status, 'pass');
  assert.deepEqual(report.environment, {
    ci: true,
    runtime: 'node',
    nodeVersion: 'v22.18.0',
    platform: 'linux',
    architecture: 'x64',
  });
  assert.doesNotMatch(JSON.stringify(report), /opaque-secret|must-not-be-emitted|internal-db/i);
});

test('release evidence rejects rollback text that is not exact-head revert evidence', () => {
  const report = createEnterpriseReleaseEvidence({
    commitSha: exactHead,
    rollbackBoundary: `revert ${exactHead}; token=opaque-secret`,
    capacityResults: passingCapacity,
    securityResults: passingSecurity,
    inheritedValidation: passingInherited,
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.rollbackBoundary, null);
  assert.doesNotMatch(JSON.stringify(report), /opaque-secret/i);
});

test('release evidence requires rollback SHA to match the reported exact head', () => {
  const otherHead = '89abcdef0123456789abcdef0123456789abcdef';
  const report = createEnterpriseReleaseEvidence({
    commitSha: exactHead,
    rollbackBoundary: `revert ${otherHead}`,
    capacityResults: passingCapacity,
    securityResults: passingSecurity,
    inheritedValidation: passingInherited,
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.code.commitSha, exactHead);
  assert.equal(report.rollbackBoundary, `revert ${otherHead}`);
});

test('capacity timeout stops scheduling additional operations when timed-out work ignores abort', async () => {
  let started = 0;
  const result = await runBoundedCapacityScenario({
    name: 'non-cooperative-stall',
    iterations: 12,
    concurrency: 2,
    operationTimeoutMs: 20,
    maxOperationTimeoutMs: 100,
    operation: async () => {
      started += 1;
      return new Promise(() => {});
    },
  });

  assert.equal(result.status, 'fail');
  assert.ok(started <= 2, `expected at most configured concurrency to start after timeout, got ${started}`);
  assert.equal(result.measured.attemptedIterations, started);
  assert.equal(result.measured.timeouts, started);
});
