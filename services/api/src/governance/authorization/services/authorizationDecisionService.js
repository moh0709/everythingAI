function sortSignals(signals = []) {
  return [...signals].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return String(left.signalId).localeCompare(String(right.signalId));
  });
}

function deriveShadowDecision(signals = []) {
  const outcomes = signals.map((signal) => String(signal.outcome || '').toLowerCase());
  if (outcomes.some((outcome) => outcome.includes('review') || outcome.includes('escalate'))) {
    return 'shadow_review';
  }
  return 'shadow_authorized';
}

export function buildAuthorizationDecisionInput({
  subjectId,
  operationType,
  signals = [],
  correlationId = null,
} = {}) {
  return Object.freeze({
    subjectId,
    operationType,
    signals: Object.freeze(sortSignals(signals)),
    correlationId,
    mode: 'shadow',
    centralizedAuthorizationOnly: true,
  });
}

export function synthesizeAuthorizationDecision({ input } = {}) {
  if (!input) {
    throw new Error('authorization decision synthesis requires input');
  }

  const signals = sortSignals(input.signals || []);

  return Object.freeze({
    decisionId: `authz-${input.correlationId || input.subjectId || 'uncorrelated'}`,
    subjectId: input.subjectId || null,
    operationType: input.operationType || null,
    correlationId: input.correlationId || null,
    mode: 'shadow',
    governanceDomain: 'authorization',
    governanceVersion: '5.7',
    centralizedAuthority: true,
    centralizedAuthorizationOnly: true,
    shadowDecision: deriveShadowDecision(signals),
    signalIds: Object.freeze(signals.map((signal) => signal.signalId)),
    signals: Object.freeze(signals),
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    runtimeExecutionAuthority: false,
    runtimeSafeguardSupremacy: true,
    synthesizedAt: new Date().toISOString(),
  });
}
