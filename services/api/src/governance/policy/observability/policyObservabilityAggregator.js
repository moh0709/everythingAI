export function aggregatePolicyTelemetry(telemetry = []) {
  return Object.freeze({
    totalTelemetry: telemetry.length,
    telemetry
  });
}

export function aggregatePolicySnapshots(snapshots = []) {
  return Object.freeze({
    totalSnapshots: snapshots.length,
    snapshots
  });
}

export function buildPolicyObservabilityView({
  telemetry = [],
  snapshots = []
} = {}) {
  return Object.freeze({
    telemetry: aggregatePolicyTelemetry(telemetry),
    snapshots: aggregatePolicySnapshots(snapshots),
    generatedAt: new Date().toISOString()
  });
}

export function buildGovernanceEventTaxonomyView(events = []) {
  const categories = events.reduce((accumulator, event) => {
    const category = event.taxonomyCategory || 'governance.policy.unknown';
    accumulator[category] = (accumulator[category] || 0) + 1;
    return accumulator;
  }, {});

  return Object.freeze({
    governanceDomain: 'policy',
    categories: Object.freeze(categories),
    totalEvents: events.length
  });
}
