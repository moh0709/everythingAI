const authorizationGovernanceContract = Object.freeze({
  governanceDomain: 'authorization',
  governanceVersion: '5.7',
  mode: 'shadow',
  enforcementLevel: 'L0',
  centralizedAuthorizationOnly: true,
  inlineRuntimeAuthorization: false,
  hiddenBlockingPaths: false,
  immutableAuthorizationEvidenceRequired: true,
  runtimeSafeguardSupremacy: true,
  runtimeExecutionAuthority: false,
  enforcementAuthority: false,
  runtimeBlocking: false,
  lifecycleMutation: false,
  additiveRolloutOnly: true,
  forbiddenDependencies: Object.freeze([
    'runtimeBlocking',
    'runtimeLifecycleMutation',
    'runtimeExecutionAuthority',
    'inlineRuntimeAuthorization',
    'hiddenBlockingPaths',
    'safeguardBypass',
  ]),
});

export default authorizationGovernanceContract;
