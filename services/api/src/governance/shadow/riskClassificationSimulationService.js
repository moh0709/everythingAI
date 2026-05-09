function freezeRiskClassification(classification = {}) {
  return Object.freeze({
    simulated: true,
    advisoryOnly: true,
    ...classification,
    classifiedAt: new Date().toISOString()
  });
}

function buildRiskTrace({ riskLevel, rationale } = {}) {
  return freezeRiskClassification({
    traceType: 'risk',
    riskLevel,
    rationale
  });
}

function classifyRisk({ riskScore = 0 } = {}) {
  let riskLevel = 'low';

  if (riskScore >= 80) {
    riskLevel = 'high';
  } else if (riskScore >= 40) {
    riskLevel = 'medium';
  }

  return freezeRiskClassification({
    riskScore,
    riskLevel,
    trace: buildRiskTrace({
      riskLevel,
      rationale: 'Deterministic advisory risk classification'
    })
  });
}

module.exports = {
  freezeRiskClassification,
  buildRiskTrace,
  classifyRisk
};
