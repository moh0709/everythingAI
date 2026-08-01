import crypto from 'node:crypto';

export function buildPolicyEvaluationInput({
  subjectId,
  eligibilityContext = {},
  correlationId = null,
  requestedAt = new Date().toISOString()
} = {}) {
  return Object.freeze({
    subjectId,
    eligibilityContext: Object.freeze({ ...eligibilityContext }),
    correlationId,
    requestedAt
  });
}

function normalizeRule(rule = {}) {
  return {
    ...rule,
    priority: Number.isFinite(rule.priority) ? rule.priority : 100
  };
}

function sortRules(rules = []) {
  return [...rules].map(normalizeRule).sort((first, second) => {
    const priorityComparison = first.priority - second.priority;
    if (priorityComparison !== 0) {
      return priorityComparison;
    }

    return String(first.policyId || '').localeCompare(String(second.policyId || ''));
  });
}

export function evaluateEligibilityPolicies({ rules = [], input = {} } = {}) {
  const context = input.eligibilityContext || {};
  const matchedRules = sortRules(rules).filter((rule) => (
    rule.eligibilitySignal && context[rule.eligibilitySignal] === rule.expectedValue
  ));

  const explanations = matchedRules.map((rule) => Object.freeze({
    policyId: rule.policyId,
    outcome: rule.outcome,
    rationale: rule.explanation,
    eligibilitySignal: rule.eligibilitySignal,
    observedValue: context[rule.eligibilitySignal]
  }));

  return Object.freeze({
    evaluationId: crypto.randomUUID(),
    subjectId: input.subjectId || null,
    correlationId: input.correlationId || null,
    governanceVersion: '5.3',
    mode: 'shadow',
    enforcementLevel: 'L0',
    eligibilityOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    eligibleOutcomes: matchedRules.map((rule) => rule.outcome),
    explanations,
    evaluatedAt: new Date().toISOString()
  });
}
