export function aggregateApprovalTelemetry(telemetry = []) {
  return Object.freeze({
    totalTelemetry: telemetry.length,
    telemetry
  });
}

export function aggregateApprovalSnapshots(snapshots = []) {
  return Object.freeze({
    totalSnapshots: snapshots.length,
    snapshots
  });
}

export function aggregateApprovalAuditArtifacts(auditArtifacts = []) {
  return Object.freeze({
    totalAuditArtifacts: auditArtifacts.length,
    auditArtifacts
  });
}

export function buildApprovalObservabilityView({
  telemetry = [],
  snapshots = [],
  auditArtifacts = []
} = {}) {
  return Object.freeze({
    telemetry: aggregateApprovalTelemetry(telemetry),
    snapshots: aggregateApprovalSnapshots(snapshots),
    auditArtifacts: aggregateApprovalAuditArtifacts(auditArtifacts),
    generatedAt: new Date().toISOString()
  });
}
