import crypto from 'node:crypto';

export function freezeRiskSnapshot(snapshot = {}) {
  return Object.freeze({
    ...snapshot,
    frozenAt: new Date().toISOString()
  });
}

export function buildRiskSnapshot({
  classifications = [],
  recommendations = [],
  telemetry = [],
  governanceVersion = '5.4'
} = {}) {
  return freezeRiskSnapshot({
    snapshotId: crypto.randomUUID(),
    governanceVersion,
    governanceDomain: 'risk',
    classifications,
    recommendations,
    telemetry,
    snapshotTimestamp: new Date().toISOString()
  });
}

export function validateRiskSnapshotConsistency(snapshot = {}) {
  const valid = Boolean(snapshot.snapshotId)
    && Array.isArray(snapshot.classifications)
    && Array.isArray(snapshot.recommendations)
    && Array.isArray(snapshot.telemetry);

  return Object.freeze({
    valid,
    severity: valid ? 'RV-0' : 'RV-4',
    validatedAt: new Date().toISOString()
  });
}
