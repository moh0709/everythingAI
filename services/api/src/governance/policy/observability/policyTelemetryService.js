export function freezePolicyTelemetryEvent(event = {}) {
  return Object.freeze({
    ...event,
    frozenAt: new Date().toISOString()
  });
}

export function normalizePolicyTelemetryOrdering(events = []) {
  return [...events].sort((first, second) => (
    (first.timestamp || '').localeCompare(second.timestamp || '')
  ));
}

export function buildPolicyTelemetryEnvelope(event = {}, governanceVersion = '5.3') {
  return freezePolicyTelemetryEvent({
    governanceVersion,
    governanceDomain: 'policy',
    taxonomyCategory: 'governance.policy.shadow',
    normalized: true,
    ...event
  });
}

export function normalizePolicyEvent(event = {}) {
  return buildPolicyTelemetryEnvelope(event);
}
