function freezeExplanationTrace(trace = {}) {
  return Object.freeze({
    ...trace,
    immutable: true,
    generatedAt: new Date().toISOString()
  });
}

function buildDecisionExplanation({ decision, reason = 'No reason provided' } = {}) {
  return freezeExplanationTrace({
    type: 'decision',
    decision,
    reason
  });
}

function buildPolicyTrace({ policy = 'unknown', outcome = 'ALLOW' } = {}) {
  return freezeExplanationTrace({
    type: 'policy',
    policy,
    outcome
  });
}

function buildRiskExplanation({ riskLevel = 'low', rationale = 'No rationale provided' } = {}) {
  return freezeExplanationTrace({
    type: 'risk',
    riskLevel,
    rationale
  });
}

module.exports = {
  freezeExplanationTrace,
  buildDecisionExplanation,
  buildPolicyTrace,
  buildRiskExplanation
};
