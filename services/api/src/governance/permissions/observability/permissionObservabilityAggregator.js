export function aggregatePermissionTelemetry(telemetry = []) {
  return Object.freeze({
    totalTelemetry: telemetry.length,
    telemetry
  });
}

export function aggregatePermissionAuditArtifacts(auditArtifacts = []) {
  return Object.freeze({
    totalAuditArtifacts: auditArtifacts.length,
    auditArtifacts
  });
}

export function aggregatePermissionSnapshots(snapshots = []) {
  return Object.freeze({
    totalSnapshots: snapshots.length,
    snapshots
  });
}

export function buildPermissionObservabilityView({
  telemetry = [],
  auditArtifacts = [],
  snapshots = []
} = {}) {
  return Object.freeze({
    telemetry: aggregatePermissionTelemetry(telemetry),
    auditArtifacts: aggregatePermissionAuditArtifacts(auditArtifacts),
    snapshots: aggregatePermissionSnapshots(snapshots),
    generatedAt: new Date().toISOString()
  });
}
