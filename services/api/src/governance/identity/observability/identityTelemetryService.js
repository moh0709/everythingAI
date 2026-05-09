function freezeTelemetryEvent(event = {}) {
  return Object.freeze({
    ...event,
    frozenAt: new Date().toISOString()
  });
}

function normalizeTelemetryOrdering(events = []) {
  return [...events].sort((a, b) => {
    const first = a.timestamp || '';
    const second = b.timestamp || '';

    return first.localeCompare(second);
  });
}

function buildTelemetryEnvelope(event = {}, governanceVersion = '5.1') {
  return freezeTelemetryEvent({
    governanceVersion,
    normalized: true,
    ...event
  });
}

function normalizeIdentityEvent(event = {}) {
  return buildTelemetryEnvelope(event);
}

module.exports = {
  freezeTelemetryEvent,
  normalizeTelemetryOrdering,
  buildTelemetryEnvelope,
  normalizeIdentityEvent
};
