export function aggregateRiskTelemetry(telemetry = []) {
  return Object.freeze({
    totalTelemetry: telemetry.length,
    telemetry
  });
}

export function aggregateRiskSnapshots(snapshots = []) {
  return Object.freeze({
    totalSnapshots: snapshots.length,
    snapshots
  });
}

export function buildRiskObservabilityView({
  telemetry = [],
  snapshots = []
} = {}) {
  return Object.freeze({
    telemetry: aggregateRiskTelemetry(telemetry),
    snapshots: aggregateRiskSnapshots(snapshots),
    generatedAt: new Date().toISOString()
  });
}

export function buildRiskGovernanceEventTaxonomyView(events = []) {
  const categories = events.reduce((accumulator, event) => {
    const category = event.taxonomyCategory || 'governance.risk.unknown';
    accumulator[category] = (accumulator[category] || 0) + 1;
    return accumulator;
  }, {});

  return Object.freeze({
    governanceDomain: 'risk',
    categories: Object.freeze(categories),
    totalEvents: events.length
  });
}
