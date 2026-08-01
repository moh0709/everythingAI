export function createEscalationRouteModel({
  routeId,
  targetRole,
  minimumSeverity = 'low',
  priority = 100,
  rationale,
  createdAt = new Date().toISOString()
} = {}) {
  if (!routeId) {
    throw new Error('escalation route requires routeId');
  }

  return Object.freeze({
    routeId,
    targetRole: targetRole || 'governance_reviewer',
    minimumSeverity,
    priority,
    rationale: rationale || 'Escalation route recorded for advisory governance visibility.',
    governanceVersion: '5.6',
    governanceDomain: 'escalation',
    mode: 'advisory',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    createdAt
  });
}
