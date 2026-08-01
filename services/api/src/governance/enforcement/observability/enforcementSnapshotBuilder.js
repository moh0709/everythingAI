export function buildEnforcementSnapshot({
  activations = [],
  blockingDecisions = [],
  rollbacks = [],
  evidenceArtifacts = [],
  telemetry = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  return Object.freeze({
    governanceDomain: 'enforcement',
    governanceVersion: '5.8',
    activations: Object.freeze([...activations]),
    blockingDecisions: Object.freeze([...blockingDecisions]),
    rollbacks: Object.freeze([...rollbacks]),
    evidenceArtifacts: Object.freeze([...evidenceArtifacts]),
    telemetry: Object.freeze([...telemetry]),
    totalActivations: activations.length,
    totalBlockingDecisions: blockingDecisions.length,
    totalRollbacks: rollbacks.length,
    totalEvidenceArtifacts: evidenceArtifacts.length,
    totalTelemetry: telemetry.length,
    generatedAt,
  });
}

export function validateEnforcementSnapshotConsistency(snapshot = {}) {
  const valid = snapshot.governanceDomain === 'enforcement'
    && snapshot.governanceVersion === '5.8'
    && snapshot.totalEvidenceArtifacts === (snapshot.evidenceArtifacts || []).length
    && snapshot.totalTelemetry === (snapshot.telemetry || []).length;

  return Object.freeze({
    valid,
    severity: valid ? 'ENF-0' : 'ENF-3',
    validatedAt: new Date().toISOString(),
  });
}
