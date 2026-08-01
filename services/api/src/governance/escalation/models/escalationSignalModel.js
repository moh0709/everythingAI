export function createEscalationSignalModel({
  signalId,
  sourceDomain,
  severity,
  weight = 0,
  rationale,
  observedAt = new Date().toISOString()
} = {}) {
  if (!signalId) {
    throw new Error('escalation signal requires signalId');
  }

  return Object.freeze({
    signalId,
    sourceDomain: sourceDomain || 'governance',
    severity: severity || 'low',
    weight,
    rationale: rationale || 'Escalation signal recorded for advisory governance review.',
    governanceVersion: '5.6',
    governanceDomain: 'escalation',
    mode: 'advisory',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    observedAt
  });
}
