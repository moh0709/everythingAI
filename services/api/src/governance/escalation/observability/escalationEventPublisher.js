export function publishEscalationEvent({
  eventType,
  escalationId,
  correlationId = null,
  metadata = {},
  timestamp = new Date().toISOString()
} = {}) {
  return Object.freeze({
    eventType,
    escalationId,
    correlationId,
    metadata: Object.freeze({ ...metadata }),
    governanceVersion: '5.6',
    governanceDomain: 'escalation',
    taxonomyCategory: 'governance.escalation.advisory',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    orchestrationAuthority: false,
    executionBlockingAuthority: false,
    timestamp
  });
}
