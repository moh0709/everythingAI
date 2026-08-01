export function validateEscalationContract(contract = {}) {
  const forbidden = new Set(contract.forbiddenDependencies || []);
  const valid = contract.governanceDomain === 'escalation'
    && contract.mode === 'advisory'
    && contract.enforcementLevel === 'L0'
    && contract.additiveRolloutOnly === true
    && contract.enforcementAuthority === false
    && contract.runtimeSovereigntyPreserved === true
    && contract.immutableAuditArtifacts === true
    && contract.explainableEscalationChains === true
    && contract.hiddenEscalationExecutionAuthority === false
    && forbidden.has('runtimeBlocking')
    && forbidden.has('runtimeLifecycleMutation')
    && forbidden.has('runtimeOrchestration')
    && forbidden.has('executionBlocking');

  return Object.freeze({
    valid,
    severity: valid ? 'EV-0' : 'EV-4'
  });
}
