import crypto from 'node:crypto';

export function freezePolicySnapshot(snapshot = {}) {
  return Object.freeze({
    ...snapshot,
    frozenAt: new Date().toISOString()
  });
}

export function buildPolicySnapshot({
  evaluations = [],
  shadowExecutions = [],
  telemetry = [],
  governanceVersion = '5.3'
} = {}) {
  return freezePolicySnapshot({
    snapshotId: crypto.randomUUID(),
    governanceVersion,
    governanceDomain: 'policy',
    evaluations,
    shadowExecutions,
    telemetry,
    snapshotTimestamp: new Date().toISOString()
  });
}

export function validatePolicySnapshotConsistency(snapshot = {}) {
  const valid = Boolean(snapshot.snapshotId)
    && Array.isArray(snapshot.evaluations)
    && Array.isArray(snapshot.shadowExecutions)
    && Array.isArray(snapshot.telemetry);

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
