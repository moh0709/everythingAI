const {
  validatePersistenceIsolation
} = require('./identity/validation/persistenceIsolationValidator');
const {
  validateSerializationDeterminism
} = require('./identity/validation/serializationDeterminismValidator');

function freezeValidationResults(results = {}) {
  return Object.freeze({
    ...results,
    frozenAt: new Date().toISOString()
  });
}

function aggregateValidationResults(results = []) {
  return freezeValidationResults({
    totalValidators: results.length,
    passedValidators: results.filter((result) => result.valid).length,
    results
  });
}

function runAllGovernanceValidators(input = {}) {
  const results = [
    validatePersistenceIsolation(input),
    validateSerializationDeterminism(input)
  ];

  return aggregateValidationResults(results);
}

function buildCertificationSummary(results = {}) {
  return freezeValidationResults({
    certificationStatus: results.passedValidators === results.totalValidators
      ? 'PASS'
      : 'FAIL',
    generatedAt: new Date().toISOString(),
    results
  });
}

module.exports = {
  freezeValidationResults,
  aggregateValidationResults,
  runAllGovernanceValidators,
  buildCertificationSummary
};
