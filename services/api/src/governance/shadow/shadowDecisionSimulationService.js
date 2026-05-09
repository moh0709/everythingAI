function freezeSimulationResult(result = {}) {
  return Object.freeze({
    simulated: true,
    advisoryOnly: true,
    enforced: false,
    runtimeInfluence: false,
    blockingCapability: false,
    governanceVersion: '5.2',
    ...result,
    simulatedAt: new Date().toISOString()
  });
}

function simulateAuthorizationDecision(context = {}) {
  return freezeSimulationResult({
    decision: context.decision || 'ALLOW',
    context
  });
}

function simulateEscalationDecision(context = {}) {
  return freezeSimulationResult({
    decision: 'ESCALATE',
    context
  });
}

function simulateRiskDecision(context = {}) {
  return freezeSimulationResult({
    decision: context.riskLevel === 'high' ? 'ESCALATE' : 'ALLOW',
    context
  });
}

module.exports = {
  freezeSimulationResult,
  simulateAuthorizationDecision,
  simulateEscalationDecision,
  simulateRiskDecision
};
