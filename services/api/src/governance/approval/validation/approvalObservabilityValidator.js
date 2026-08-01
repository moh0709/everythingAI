export function validateApprovalObservability({
  telemetry = [],
  snapshots = [],
  auditArtifacts = []
} = {}) {
  const valid = Array.isArray(telemetry)
    && Array.isArray(snapshots)
    && Array.isArray(auditArtifacts)
    && telemetry.every((event) => event.governanceDomain === 'approval')
    && snapshots.every((snapshot) => snapshot.governanceDomain === 'approval')
    && auditArtifacts.every((artifact) => artifact.governanceDomain === 'approval' && artifact.immutable === true);

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-4',
    telemetryCount: telemetry.length,
    snapshotCount: snapshots.length,
    auditArtifactCount: auditArtifacts.length
  });
}
