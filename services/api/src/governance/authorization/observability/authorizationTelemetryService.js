export function normalizeAuthorizationEvent(event = {}) {
  return Object.freeze({
    eventType: event.eventType || 'authorization.unknown',
    decisionId: event.decisionId || null,
    correlationId: event.correlationId || null,
    metadata: Object.freeze({ ...(event.metadata || {}) }),
    governanceVersion: '5.7',
    governanceDomain: 'authorization',
    taxonomyCategory: 'governance.authorization.shadow',
    centralizedAuthorizationOnly: true,
    shadowOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    runtimeExecutionAuthority: false,
    timestamp: event.timestamp || new Date().toISOString(),
  });
}
