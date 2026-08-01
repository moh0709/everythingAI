import crypto from 'node:crypto';

export function freezeEscalationSnapshot(snapshot = {}) {
  return Object.freeze({
    ...snapshot,
    frozenAt: new Date().toISOString()
  });
}

export function buildEscalationSnapshot({
  routingDecisions = [],
  escalationChains = [],
  auditArtifacts = [],
  telemetry = [],
  governanceVersion = '5.6'
} = {}) {
  return freezeEscalationSnapshot({
    snapshotId: crypto.randomUUID(),
    governanceVersion,
    governanceDomain: 'escalation',
    routingDecisions,
    escalationChains,
    auditArtifacts,
    telemetry,
    snapshotTimestamp: new Date().toISOString()
  });
}

export function validateEscalationSnapshotConsistency(snapshot = {}) {
  const valid = Boolean(snapshot.snapshotId)
    && Array.isArray(snapshot.routingDecisions)
    && Array.isArray(snapshot.escalationChains)
    && Array.isArray(snapshot.auditArtifacts)
    && Array.isArray(snapshot.telemetry);

  return Object.freeze({
    valid,
    severity: valid ? 'EV-0' : 'EV-4',
    validatedAt: new Date().toISOString()
  });
}
