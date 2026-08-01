import crypto from 'node:crypto';

export function freezeApprovalSnapshot(snapshot = {}) {
  return Object.freeze({
    ...snapshot,
    frozenAt: new Date().toISOString()
  });
}

export function buildApprovalSnapshot({
  lifecycleEvaluations = [],
  approvalChains = [],
  auditArtifacts = [],
  telemetry = [],
  governanceVersion = '5.5'
} = {}) {
  return freezeApprovalSnapshot({
    snapshotId: crypto.randomUUID(),
    governanceVersion,
    governanceDomain: 'approval',
    lifecycleEvaluations,
    approvalChains,
    auditArtifacts,
    telemetry,
    snapshotTimestamp: new Date().toISOString()
  });
}

export function validateApprovalSnapshotConsistency(snapshot = {}) {
  const valid = Boolean(snapshot.snapshotId)
    && Array.isArray(snapshot.lifecycleEvaluations)
    && Array.isArray(snapshot.approvalChains)
    && Array.isArray(snapshot.auditArtifacts)
    && Array.isArray(snapshot.telemetry);

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-4',
    validatedAt: new Date().toISOString()
  });
}
