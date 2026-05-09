function validateSimulationIsolation(result = {}) {
  const valid = result.runtimeInfluence === false
    && result.blockingCapability === false;

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}

function validateSimulationDeterminism(result = {}) {
  const valid = result.simulated === true
    && result.advisoryOnly === true;

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}

function validateExplainabilityIntegrity(explanation = {}) {
  const valid = Boolean(explanation.type);

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}

function validateAdvisoryOnlyBehavior(result = {}) {
  const valid = result.enforced === false;

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}

module.exports = {
  validateSimulationIsolation,
  validateSimulationDeterminism,
  validateExplainabilityIntegrity,
  validateAdvisoryOnlyBehavior
};
