export function freezeApprovalTelemetryEvent(event = {}) {
  return Object.freeze({
    ...event,
    frozenAt: new Date().toISOString()
  });
}

export function buildApprovalTelemetryEnvelope(event = {}, governanceVersion = '5.5') {
  return freezeApprovalTelemetryEvent({
    governanceVersion,
    governanceDomain: 'approval',
    taxonomyCategory: 'governance.approval.advisory',
    normalized: true,
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    ...event
  });
}

export function normalizeApprovalEvent(event = {}) {
  return buildApprovalTelemetryEnvelope(event);
}
