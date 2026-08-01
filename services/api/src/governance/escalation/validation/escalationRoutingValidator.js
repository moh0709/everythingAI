export function validateEscalationRouting(routing = {}) {
  const valid = routing.governanceDomain === 'escalation'
    && routing.mode === 'advisory'
    && routing.enforced === false
    && routing.runtimeBlocking === false
    && routing.lifecycleMutation === false
    && routing.orchestrationAuthority === false
    && routing.executionBlockingAuthority === false
    && Array.isArray(routing.routeIds)
    && Array.isArray(routing.escalationChain)
    && Array.isArray(routing.explanations);

  return Object.freeze({
    valid,
    severity: valid ? 'EV-0' : 'EV-4'
  });
}
