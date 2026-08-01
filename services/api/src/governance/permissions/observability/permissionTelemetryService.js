export function freezePermissionTelemetryEvent(event = {}) {
  return Object.freeze({
    ...event,
    frozenAt: new Date().toISOString()
  });
}

export function normalizePermissionTelemetryOrdering(events = []) {
  return [...events].sort((first, second) => (
    (first.timestamp || '').localeCompare(second.timestamp || '')
  ));
}

export function buildPermissionTelemetryEnvelope(event = {}, governanceVersion = '5.2') {
  return freezePermissionTelemetryEvent({
    governanceVersion,
    normalized: true,
    ...event
  });
}

export function normalizePermissionEvent(event = {}) {
  return buildPermissionTelemetryEnvelope(event);
}
