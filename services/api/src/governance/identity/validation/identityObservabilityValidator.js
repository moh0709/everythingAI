export function validateIdentityObservability({
  telemetry = [],
  auditArtifacts = [],
  snapshots = []
} = {}) {
  const valid = Array.isArray(telemetry)
    && Array.isArray(auditArtifacts)
    && Array.isArray(snapshots);

  return Object.freeze({
    valid,
    telemetryCount: telemetry.length,
    auditArtifactCount: auditArtifacts.length,
    snapshotCount: snapshots.length,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
