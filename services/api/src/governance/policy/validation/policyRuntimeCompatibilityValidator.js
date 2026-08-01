export function validatePolicyRuntimeCompatibility(target = {}) {
  const forbiddenProperties = [
    'authorizeExecution',
    'denyExecution',
    'mutateRuntimeState',
    'executeRuntimeAction',
    'updateExecutionLifecycle',
    'blockRuntimeAction',
    'enforcePolicy',
    'inlineRuntimePolicyExecution'
  ];
  const violations = forbiddenProperties.filter(
    (property) => typeof target[property] === 'function' || target[property] === true
  );
  const contractViolations = [];

  if (target.enforcementLevel !== 'L0') {
    contractViolations.push('enforcementLevel');
  }
  if (target.runtimeSafeguardSupremacy !== true) {
    contractViolations.push('runtimeSafeguardSupremacy');
  }
  if (target.hiddenEnforcement !== false) {
    contractViolations.push('hiddenEnforcement');
  }

  return Object.freeze({
    valid: violations.length === 0 && contractViolations.length === 0,
    violations: [...violations, ...contractViolations],
    severity: violations.length || contractViolations.length ? 'PV-4' : 'PV-0'
  });
}
