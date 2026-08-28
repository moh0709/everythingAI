import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runBoundedCapacityScenario,
  runEnterpriseSecurityRegressionMatrix,
  createEnterpriseReleaseEvidence,
  redactEnterpriseEvidence,
} from '../src/enterprise/capacitySecurity.js';
import { createS3CompatibleObjectStorageAdapter } from '../src/storage/objectStorage.js';
import {
  createEnterpriseBackupManifest,
  validateEnterpriseRestoreCandidate,
} from '../src/enterprise/backupRestore.js';

const exactHead = '0123456789abcdef0123456789abcdef01234567';
const allowedScope = { tenantId: 'tenant-a', workspaceId: 'workspace-a' };

function createCountingS3Harness() {
  let adapterCalls = 0;
  const client = {
    async putObject() { adapterCalls += 1; return {}; },
    async getObject() { adapterCalls += 1; return { body: Buffer.from('ok') }; },
    async headObject() { adapterCalls += 1; return { contentLength: 2 }; },
    async deleteObject() { adapterCalls += 1; return {}; },
  };
  const adapter = createS3CompatibleObjectStorageAdapter({
    bucket: 'enterprise-regression',
    client,
    scopeGuard: async (scope) => (
      scope.tenantId === allowedScope.tenantId
      && scope.workspaceId === allowedScope.workspaceId
    ),
  });
  return { adapter, calls: () => adapterCalls };
}

function createRestoreManifest() {
  return createEnterpriseBackupManifest({
    scope: allowedScope,
    schemaVersion: 'schema-v1',
    createdAt: '2026-08-28T00:00:00.000Z',
    postgres: { backupId: 'pg-backup-1' },
    objects: [{
      objectId: 'object-1',
      storageKey: 'tenants/tenant-a/workspaces/workspace-a/objects/object-1',
      size: 2,
    }],
  });
}

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

test('capacity scenario time-bounds stalled operations and records timeout failure', async () => {
  const startedAt = Date.now();
  const result = await runBoundedCapacityScenario({
    name: 'stalled-operation',
    iterations: 1,
    concurrency: 1,
    operationTimeoutMs: 25,
    maxOperationTimeoutMs: 100,
    operation: async () => new Promise(() => {}),
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.measured.failures, 1);
  assert.equal(result.measured.timeouts, 1);
  assert.equal(result.bounds.operationTimeoutMs, 25);
  assert.ok(Date.now() - startedAt < 500);

  await assert.rejects(
    () => runBoundedCapacityScenario({
      name: 'timeout-too-large',
      iterations: 1,
      concurrency: 1,
      operationTimeoutMs: 101,
      maxOperationTimeoutMs: 100,
      operation: async () => true,
    }),
    /bounded capacity configuration denied/i,
  );
});

test('security regression matrix exercises real fail-closed storage and restore boundaries', async () => {
  const report = await runEnterpriseSecurityRegressionMatrix({
    cases: [
      {
        name: 'cross-tenant-storage-denial',
        exercise: async () => {
          const harness = createCountingS3Harness();
          let denied = false;
          try {
            await harness.adapter.getObject({
              scope: { tenantId: 'tenant-b', workspaceId: 'workspace-a' },
              objectId: 'object-1',
            });
          } catch {
            denied = true;
          }
          return { denied, adapterCalls: harness.calls() };
        },
      },
      {
        name: 'cross-workspace-storage-denial',
        exercise: async () => {
          const harness = createCountingS3Harness();
          let denied = false;
          try {
            await harness.adapter.getObject({
              scope: { tenantId: 'tenant-a', workspaceId: 'workspace-b' },
              objectId: 'object-1',
            });
          } catch {
            denied = true;
          }
          return { denied, adapterCalls: harness.calls() };
        },
      },
      {
        name: 'unsafe-object-identifier-denial',
        exercise: async () => {
          const harness = createCountingS3Harness();
          let denied = false;
          try {
            await harness.adapter.getObject({ scope: allowedScope, objectId: '../escape' });
          } catch {
            denied = true;
          }
          return { denied, adapterCalls: harness.calls() };
        },
      },
      {
        name: 'tampered-restore-manifest-denial',
        exercise: async () => {
          let adapterCalls = 0;
          const manifest = createRestoreManifest();
          const tampered = { ...manifest, schemaVersion: 'schema-v2' };
          const result = await validateEnterpriseRestoreCandidate({
            manifest: tampered,
            trustedManifestSha256: manifest.manifestSha256,
            expectedScope: allowedScope,
            scopeGuard: async () => true,
            supportedSchemaVersions: ['schema-v1'],
            target: { id: 'restore-target-1', isolated: true, disposable: true },
            targetGuard: async () => true,
            adapters: {
              postgres: async () => { adapterCalls += 1; return { ok: true }; },
              object: async () => { adapterCalls += 1; return { ok: true }; },
            },
          });
          return { denied: result.status === 'blocked', adapterCalls };
        },
      },
      {
        name: 'unsupported-restore-schema-denial',
        exercise: async () => {
          let adapterCalls = 0;
          const manifest = createRestoreManifest();
          const result = await validateEnterpriseRestoreCandidate({
            manifest,
            trustedManifestSha256: manifest.manifestSha256,
            expectedScope: allowedScope,
            scopeGuard: async () => true,
            supportedSchemaVersions: [],
            target: { id: 'restore-target-1', isolated: true, disposable: true },
            targetGuard: async () => true,
            adapters: {
              postgres: async () => { adapterCalls += 1; return { ok: true }; },
              object: async () => { adapterCalls += 1; return { ok: true }; },
            },
          });
          return { denied: result.status === 'blocked', adapterCalls };
        },
      },
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
  assert.equal(report.environment.DATABASE_URL, '[REDACTED]');
  assert.equal(report.environment.S3_SECRET_ACCESS_KEY, '[REDACTED]');
  assert.equal(report.environment.harmless, undefined);
  assert.doesNotMatch(JSON.stringify(report), /super-secret|postgres:\/\/user:secret|harmless|visible/i);

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

test('evidence redaction removes credential-bearing fields and embedded string secrets recursively', () => {
  const sanitized = redactEnterpriseEvidence({
    token: 'secret-token',
    nested: {
      password: 'secret-password',
      url: 'https://user:secret@example.test/path?token=query-secret&mode=test',
      message: 'failure connecting to postgres://user:secret@db.example.test/everythingai Authorization=Bearer-value',
      authMessage: 'request failed with Bearer bearer-secret-value',
      details: 'api_key=assignment-secret',
    },
  });

  const serialized = JSON.stringify(sanitized);
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.nested.password, '[REDACTED]');
  assert.doesNotMatch(
    serialized,
    /secret-token|secret-password|user:secret|postgres:\/\/user:secret|query-secret|bearer-secret-value|assignment-secret|Bearer-value/i,
  );
  assert.match(sanitized.nested.url, /token=\[REDACTED\]/);
  assert.match(sanitized.nested.authMessage, /Bearer \[REDACTED\]/i);
  assert.match(sanitized.nested.details, /api_key=\[REDACTED\]/i);
});