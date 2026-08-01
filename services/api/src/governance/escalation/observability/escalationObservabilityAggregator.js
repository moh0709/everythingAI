export function aggregateEscalationTelemetry(telemetry = []) {
  return Object.freeze({
    totalTelemetry: telemetry.length,
    telemetry
  });
}

export function aggregateEscalationSnapshots(snapshots = []) {
  return Object.freeze({
    totalSnapshots: snapshots.length,
    snapshots
  });
}

export function aggregateEscalationAuditArtifacts(auditArtifacts = []) {
  return Object.freeze({
    totalAuditArtifacts: auditArtifacts.length,
    auditArtifacts
  });
}

export function buildEscalationObservabilityView({
  telemetry = [],
  snapshots = [],
  auditArtifacts = []
} = {}) {
  return Object.freeze({
    telemetry: aggregateEscalationTelemetry(telemetry),
    snapshots: aggregateEscalationSnapshots(snapshots),
    auditArtifacts: aggregateEscalationAuditArtifacts(auditArtifacts),
    generatedAt: new Date().toISOString()
  });
}
