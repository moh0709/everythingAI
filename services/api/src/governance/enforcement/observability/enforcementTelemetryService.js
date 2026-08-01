export function normalizeEnforcementEvent(event = {}) {
  return Object.freeze({
    eventType: event.eventType || 'enforcement.unknown',
    activationId: event.activationId || null,
    correlationId: event.correlationId || null,
    metadata: Object.freeze({ ...(event.metadata || {}) }),
    governanceVersion: '5.8',
    governanceDomain: 'enforcement',
    taxonomyCategory: 'governance.enforcement.activation',
    phasedActivationOnly: true,
    observableEnforcement: true,
    recoverableEnforcement: true,
    hiddenEscalation: false,
    timestamp: event.timestamp || new Date().toISOString(),
  });
}
