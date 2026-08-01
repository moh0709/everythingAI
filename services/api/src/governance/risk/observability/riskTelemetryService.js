export function freezeRiskTelemetryEvent(event = {}) {
  return Object.freeze({
    ...event,
    frozenAt: new Date().toISOString()
  });
}

export function normalizeRiskTelemetryOrdering(events = []) {
  return [...events].sort((first, second) => (
    (first.timestamp || '').localeCompare(second.timestamp || '')
  ));
}

export function buildRiskTelemetryEnvelope(event = {}, governanceVersion = '5.4') {
  return freezeRiskTelemetryEvent({
    governanceVersion,
    governanceDomain: 'risk',
    taxonomyCategory: 'governance.risk.advisory',
    normalized: true,
    ...event
  });
}

export function normalizeRiskEvent(event = {}) {
  return buildRiskTelemetryEnvelope(event);
}
