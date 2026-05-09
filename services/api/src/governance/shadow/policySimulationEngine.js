function freezePolicyEvaluation(evaluation = {}) {
  return Object.freeze({
    simulated: true,
    advisoryOnly: true,
    enforced: false,
    runtimeInfluence: false,
    ...evaluation,
    evaluatedAt: new Date().toISOString()
  });
}

function generatePolicyTrace({ policyName, outcome, rationale } = {}) {
  return freezePolicyEvaluation({
    traceType: 'policy',
    policyName,
    outcome,
    rationale
  });
}

function simulatePolicyOutcome({ policyName = 'default-policy', riskLevel = 'low' } = {}) {
  const outcome = riskLevel === 'high' ? 'ESCALATE' : 'ALLOW';

  return freezePolicyEvaluation({
    policyName,
    policyOutcome: outcome
  });
}

function evaluatePolicies(context = {}) {
  const simulation = simulatePolicyOutcome(context);

  return freezePolicyEvaluation({
    simulation,
    trace: generatePolicyTrace({
      policyName: simulation.policyName,
      outcome: simulation.policyOutcome,
      rationale: 'Advisory policy simulation'
    })
  });
}

module.exports = {
  freezePolicyEvaluation,
  generatePolicyTrace,
  simulatePolicyOutcome,
  evaluatePolicies
};
