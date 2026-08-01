export function validatePolicyInvariants(target = {}) {
  const violations = [];

  if (target.mode !== 'shadow') {
    violations.push('shadow_mode_only');
  }
  if (target.eligibilityOnly !== true) {
    violations.push('eligibility_only');
  }
  if (target.enforced !== false) {
    violations.push('no_hidden_enforcement');
  }
  if (target.runtimeBlocking !== false) {
    violations.push('no_runtime_blocking');
  }
  if (target.lifecycleMutation !== false) {
    violations.push('no_runtime_lifecycle_mutation');
  }

  return Object.freeze({
    valid: violations.length === 0,
    violations,
    severity: violations.length ? 'PV-4' : 'PV-0'
  });
}
