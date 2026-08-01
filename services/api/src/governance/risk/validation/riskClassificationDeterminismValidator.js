function comparableClassification(classification = {}) {
  return {
    mode: classification.mode,
    enforcementLevel: classification.enforcementLevel,
    advisoryOnly: classification.advisoryOnly,
    enforced: classification.enforced,
    runtimeBlocking: classification.runtimeBlocking,
    lifecycleMutation: classification.lifecycleMutation,
    riskScore: classification.riskScore,
    riskLevel: classification.riskLevel,
    riskFactors: classification.riskFactors || [],
    explanations: classification.explanations || []
  };
}

export function validateRiskClassificationDeterminism({ firstResult = {}, secondResult = {} } = {}) {
  const valid = JSON.stringify(comparableClassification(firstResult))
    === JSON.stringify(comparableClassification(secondResult));

  return Object.freeze({
    valid,
    severity: valid ? 'RV-0' : 'RV-4'
  });
}
