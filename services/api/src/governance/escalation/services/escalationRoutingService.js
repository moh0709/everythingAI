import crypto from 'node:crypto';

const severityRank = Object.freeze({
  low: 10,
  moderate: 20,
  high: 30,
  critical: 40
});

export function buildEscalationRoutingInput({
  subjectId,
  operationType,
  correlationId = null,
  signals = [],
  routes = [],
  evaluatedAt = new Date().toISOString()
} = {}) {
  return Object.freeze({
    subjectId: subjectId || null,
    operationType: operationType || null,
    correlationId,
    signals: Object.freeze([...signals]),
    routes: Object.freeze([...routes]),
    evaluatedAt
  });
}

function highestSeverity(signals = []) {
  return [...signals].sort((first, second) => {
    const severityDelta = (severityRank[second.severity] || 0) - (severityRank[first.severity] || 0);
    if (severityDelta !== 0) return severityDelta;
    const weightDelta = (second.weight || 0) - (first.weight || 0);
    if (weightDelta !== 0) return weightDelta;
    return String(first.signalId || '').localeCompare(String(second.signalId || ''));
  })[0]?.severity || 'low';
}

function eligibleRoutes(routes = [], severity = 'low') {
  const rank = severityRank[severity] || 0;
  return [...routes]
    .filter((route) => rank >= (severityRank[route.minimumSeverity] || 0))
    .sort((first, second) => {
      const priorityDelta = (first.priority || 0) - (second.priority || 0);
      if (priorityDelta !== 0) return priorityDelta;
      return String(first.routeId || '').localeCompare(String(second.routeId || ''));
    });
}

export function routeEscalationAdvisory({ input = {} } = {}) {
  const severity = highestSeverity(input.signals || []);
  const routes = eligibleRoutes(input.routes || [], severity);

  return Object.freeze({
    escalationId: crypto.randomUUID(),
    subjectId: input.subjectId || null,
    operationType: input.operationType || null,
    correlationId: input.correlationId || null,
    governanceVersion: '5.6',
    governanceDomain: 'escalation',
    mode: 'advisory',
    enforcementLevel: 'L0',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    orchestrationAuthority: false,
    executionBlockingAuthority: false,
    highestSeverity: severity,
    routeIds: Object.freeze(routes.map((route) => route.routeId)),
    escalationChain: Object.freeze(routes.map((route, index) => Object.freeze({
      order: index + 1,
      routeId: route.routeId,
      targetRole: route.targetRole,
      minimumSeverity: route.minimumSeverity,
      rationale: route.rationale
    }))),
    explanations: Object.freeze(routes.map((route) => Object.freeze({
      routeId: route.routeId,
      targetRole: route.targetRole,
      rationale: route.rationale,
      matchedSeverity: severity
    }))),
    evaluatedAt: input.evaluatedAt || new Date().toISOString()
  });
}
