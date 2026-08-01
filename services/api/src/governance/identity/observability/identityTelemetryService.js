export function freezeTelemetryEvent(event = {}) {
  return Object.freeze({
    ...event,
    frozenAt: new Date().toISOString()
  });
}

export function normalizeTelemetryOrdering(events = []) {
  return [...events].sort((a, b) => {
    const first = a.timestamp || '';
    const second = b.timestamp || '';

    return first.localeCompare(second);
  });
}

export function buildTelemetryEnvelope(event = {}, governanceVersion = '5.1') {
  return freezeTelemetryEvent({
    governanceVersion,
    normalized: true,
    ...event
  });
}

export function normalizeIdentityEvent(event = {}) {
  return buildTelemetryEnvelope(event);
}
