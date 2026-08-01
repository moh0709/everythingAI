export function buildAuthorizationSnapshot({
  decisions = [],
  shadowEvaluations = [],
  evidenceArtifacts = [],
  telemetry = [],
  snapshotId = 'authorization-snapshot',
} = {}) {
  return Object.freeze({
    snapshotId,
    governanceDomain: 'authorization',
    governanceVersion: '5.7',
    decisions: Object.freeze(decisions),
    shadowEvaluations: Object.freeze(shadowEvaluations),
    evidenceArtifacts: Object.freeze(evidenceArtifacts),
    telemetry: Object.freeze(telemetry),
    immutable: true,
    shadowOnly: true,
    runtimeBlocking: false,
    lifecycleMutation: false,
    generatedAt: new Date().toISOString(),
  });
}

export function validateAuthorizationSnapshotConsistency(snapshot = {}) {
  const valid = snapshot.governanceDomain === 'authorization'
    && snapshot.governanceVersion === '5.7'
    && snapshot.immutable === true
    && snapshot.shadowOnly === true
    && snapshot.runtimeBlocking === false
    && snapshot.lifecycleMutation === false
    && Array.isArray(snapshot.decisions)
    && Array.isArray(snapshot.shadowEvaluations)
    && Array.isArray(snapshot.evidenceArtifacts)
    && Array.isArray(snapshot.telemetry);

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-4',
    validatedAt: new Date().toISOString(),
  });
}
