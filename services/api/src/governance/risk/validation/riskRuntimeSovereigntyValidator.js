export function validateRiskRuntimeSovereignty(contract = {}) {
  const forbidden = new Set(contract.forbiddenDependencies || []);
  const valid = contract.governanceDomain === 'risk'
    && contract.mode === 'advisory'
    && contract.enforcementLevel === 'L0'
    && contract.enforcementAuthority === false
    && contract.runtimeSovereigntyPreserved === true
    && forbidden.has('runtimeBlocking')
    && forbidden.has('runtimeLifecycleMutation')
    && forbidden.has('implicitEnforcement');

  return Object.freeze({
    valid,
    severity: valid ? 'RV-0' : 'RV-4'
  });
}
