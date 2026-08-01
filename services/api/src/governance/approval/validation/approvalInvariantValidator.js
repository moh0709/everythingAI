export function validateApprovalInvariants(contract = {}) {
  const forbidden = new Set(contract.forbiddenDependencies || []);
  const valid = contract.governanceDomain === 'approval'
    && contract.mode === 'advisory'
    && contract.enforcementLevel === 'L0'
    && contract.additiveRolloutOnly === true
    && contract.enforcementAuthority === false
    && contract.runtimeSafeguardSupremacy === true
    && contract.immutableAuditArtifacts === true
    && contract.explainableApprovalChains === true
    && contract.hiddenApprovalBypasses === false
    && forbidden.has('runtimeBlocking')
    && forbidden.has('runtimeLifecycleMutation')
    && forbidden.has('safeguardBypass')
    && forbidden.has('hiddenApprovalBypass');

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-4'
  });
}
