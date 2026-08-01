export function aggregateAuthorizationTelemetry(telemetry = []) {
  return Object.freeze({
    totalTelemetry: telemetry.length,
    telemetry,
  });
}

export function aggregateAuthorizationSnapshots(snapshots = []) {
  return Object.freeze({
    totalSnapshots: snapshots.length,
    snapshots,
  });
}

export function aggregateAuthorizationEvidenceArtifacts(evidenceArtifacts = []) {
  return Object.freeze({
    totalEvidenceArtifacts: evidenceArtifacts.length,
    evidenceArtifacts,
  });
}

export function buildAuthorizationObservabilityView({
  telemetry = [],
  snapshots = [],
  evidenceArtifacts = [],
} = {}) {
  return Object.freeze({
    telemetry: aggregateAuthorizationTelemetry(telemetry),
    snapshots: aggregateAuthorizationSnapshots(snapshots),
    evidenceArtifacts: aggregateAuthorizationEvidenceArtifacts(evidenceArtifacts),
    generatedAt: new Date().toISOString(),
  });
}
