export function publishEnforcementEvent({
  eventType,
  activationId,
  correlationId = null,
  metadata = {},
  timestamp = new Date().toISOString(),
} = {}) {
  return Object.freeze({
    eventType: eventType || 'enforcement.unknown',
    activationId: activationId || null,
    correlationId,
    metadata: Object.freeze({ ...metadata }),
    timestamp,
  });
}
