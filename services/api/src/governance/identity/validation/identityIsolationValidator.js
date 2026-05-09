function validateRuntimeIsolation(target = {}) {
  const forbiddenProperties = [
    'authorizeExecution',
    'denyExecution',
    'mutateRuntimeState',
    'executeRuntimeAction',
    'updateExecutionLifecycle'
  ];

  const violations = forbiddenProperties.filter(
    (property) => typeof target[property] === 'function'
  );

  return Object.freeze({
    valid: violations.length === 0,
    violations,
    severity: violations.length ? 'IV-4' : 'IV-0'
  });
}

module.exports = {
  validateRuntimeIsolation
};
