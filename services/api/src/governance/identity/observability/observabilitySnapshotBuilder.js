import crypto from 'node:crypto';

export function freezeSnapshot(snapshot = {}) {
  return Object.freeze({
    ...snapshot,
    frozenAt: new Date().toISOString()
  });
}

export function buildSnapshot({
  operators = [],
  roles = [],
  assignments = [],
  telemetry = [],
  auditArtifacts = [],
  correlationChains = [],
  governanceVersion = '5.1'
} = {}) {
  return freezeSnapshot({
    snapshotId: crypto.randomUUID(),
    governanceVersion,
    operators,
    roles,
    assignments,
    telemetry,
    auditArtifacts,
    correlationChains,
    snapshotTimestamp: new Date().toISOString()
  });
}

export function reconstructSnapshot(snapshot = {}) {
  return freezeSnapshot({
    ...snapshot,
    reconstructed: true,
    reconstructedAt: new Date().toISOString()
  });
}

export function validateSnapshotConsistency(snapshot = {}) {
  const valid = Boolean(snapshot.snapshotId);

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
