function comparableEscalationResult(result = {}) {
  return JSON.stringify({
    subjectId: result.subjectId,
    operationType: result.operationType,
    correlationId: result.correlationId,
    highestSeverity: result.highestSeverity,
    routeIds: result.routeIds,
    escalationChain: result.escalationChain,
    explanations: result.explanations,
    mode: result.mode,
    enforced: result.enforced,
    runtimeBlocking: result.runtimeBlocking,
    lifecycleMutation: result.lifecycleMutation,
    orchestrationAuthority: result.orchestrationAuthority,
    executionBlockingAuthority: result.executionBlockingAuthority
  });
}

export function validateEscalationDeterminism({ firstResult = {}, secondResult = {} } = {}) {
  const valid = comparableEscalationResult(firstResult) === comparableEscalationResult(secondResult);

  return Object.freeze({
    valid,
    severity: valid ? 'EV-0' : 'EV-4'
  });
}
