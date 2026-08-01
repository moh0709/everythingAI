export function publishAuthorizationEvent({
  eventType,
  decisionId,
  correlationId = null,
  metadata = {},
  timestamp = new Date().toISOString(),
} = {}) {
  return Object.freeze({
    eventType,
    decisionId,
    correlationId,
    metadata: Object.freeze({ ...metadata }),
    governanceVersion: '5.7',
    governanceDomain: 'authorization',
    taxonomyCategory: 'governance.authorization.shadow',
    centralizedAuthorizationOnly: true,
    shadowOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    runtimeExecutionAuthority: false,
    timestamp,
  });
}
