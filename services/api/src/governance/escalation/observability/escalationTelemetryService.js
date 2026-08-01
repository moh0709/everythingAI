export function freezeEscalationTelemetryEvent(event = {}) {
  return Object.freeze({
    ...event,
    frozenAt: new Date().toISOString()
  });
}

export function buildEscalationTelemetryEnvelope(event = {}, governanceVersion = '5.6') {
  return freezeEscalationTelemetryEvent({
    governanceVersion,
    governanceDomain: 'escalation',
    taxonomyCategory: 'governance.escalation.advisory',
    normalized: true,
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    orchestrationAuthority: false,
    executionBlockingAuthority: false,
    ...event
  });
}

export function normalizeEscalationEvent(event = {}) {
  return buildEscalationTelemetryEnvelope(event);
}
