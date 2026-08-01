function sortSignals(signals = []) {
  return [...signals].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return String(left.signalId).localeCompare(String(right.signalId));
  });
}

export function buildExplainableAuthorizationChain({ decision, signals = [] } = {}) {
  const orderedSignals = sortSignals(signals);

  return Object.freeze({
    chainId: `authz-chain-${decision?.correlationId || decision?.decisionId || 'uncorrelated'}`,
    decisionId: decision?.decisionId || null,
    correlationId: decision?.correlationId || null,
    governanceDomain: 'authorization',
    governanceVersion: '5.7',
    immutable: true,
    shadowOnly: true,
    explanations: Object.freeze(orderedSignals.map((signal, index) => Object.freeze({
      order: index + 1,
      signalId: signal.signalId,
      sourceDomain: signal.sourceDomain,
      outcome: signal.outcome,
      rationale: signal.rationale,
    }))),
    runtimeBlocking: false,
    lifecycleMutation: false,
    runtimeExecutionAuthority: false,
    generatedAt: new Date().toISOString(),
  });
}
