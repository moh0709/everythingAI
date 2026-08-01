function comparableEvaluation(evaluation = {}) {
  return {
    mode: evaluation.mode,
    enforcementLevel: evaluation.enforcementLevel,
    eligibilityOnly: evaluation.eligibilityOnly,
    enforced: evaluation.enforced,
    runtimeBlocking: evaluation.runtimeBlocking,
    lifecycleMutation: evaluation.lifecycleMutation,
    eligibleOutcomes: evaluation.eligibleOutcomes || [],
    explanations: (evaluation.explanations || []).map((item) => ({
      policyId: item.policyId,
      outcome: item.outcome,
      rationale: item.rationale,
      eligibilitySignal: item.eligibilitySignal,
      observedValue: item.observedValue
    }))
  };
}

export function validatePolicyDeterminism({ firstResult = {}, secondResult = {} } = {}) {
  const valid = JSON.stringify(comparableEvaluation(firstResult)) === JSON.stringify(comparableEvaluation(secondResult));

  return Object.freeze({
    valid,
    severity: valid ? 'PV-0' : 'PV-4'
  });
}
