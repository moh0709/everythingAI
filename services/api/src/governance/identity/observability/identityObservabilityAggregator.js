function aggregateTelemetry(telemetry = []) {
  return Object.freeze({
    totalTelemetry: telemetry.length,
    telemetry
  });
}

function aggregateAuditArtifacts(auditArtifacts = []) {
  return Object.freeze({
    totalAuditArtifacts: auditArtifacts.length,
    auditArtifacts
  });
}

function aggregateCorrelationChains(correlationChains = []) {
  return Object.freeze({
    totalCorrelationChains: correlationChains.length,
    correlationChains
  });
}

function buildGovernanceObservabilityView({
  telemetry = [],
  auditArtifacts = [],
  correlationChains = []
} = {}) {
  return Object.freeze({
    telemetry: aggregateTelemetry(telemetry),
    auditArtifacts: aggregateAuditArtifacts(auditArtifacts),
    correlationChains: aggregateCorrelationChains(correlationChains),
    generatedAt: new Date().toISOString()
  });
}

module.exports = {
  aggregateTelemetry,
  aggregateAuditArtifacts,
  aggregateCorrelationChains,
  buildGovernanceObservabilityView
};
