function freezeEscalationSimulation(simulation = {}) {
  return Object.freeze({
    simulated: true,
    advisoryOnly: true,
    enforced: false,
    ...simulation,
    simulatedAt: new Date().toISOString()
  });
}

function buildEscalationTrace({ escalationLevel, rationale } = {}) {
  return freezeEscalationSimulation({
    traceType: 'escalation',
    escalationLevel,
    rationale
  });
}

function simulateEscalationFlow({ escalationLevel = 'L1' } = {}) {
  return freezeEscalationSimulation({
    escalationLevel,
    trace: buildEscalationTrace({
      escalationLevel,
      rationale: 'Deterministic advisory escalation simulation'
    })
  });
}

module.exports = {
  freezeEscalationSimulation,
  buildEscalationTrace,
  simulateEscalationFlow
};
