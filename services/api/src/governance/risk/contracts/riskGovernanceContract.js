const riskGovernanceContract = {
  governanceDomain: 'risk',
  governanceVersion: '5.4',
  mode: 'advisory',
  blastRadius: 'BR-1',
  enforcementLevel: 'L0',
  additiveRolloutOnly: true,
  enforcementAuthority: false,
  runtimeSovereigntyPreserved: true,
  observabilityBeforeEnforcement: true,
  allowedDependencies: [
    'identity',
    'permissions',
    'policy',
    'observability',
    'telemetry',
    'validation'
  ],
  forbiddenDependencies: [
    'runtimeExecution',
    'runtimeLifecycleMutation',
    'runtimeBlocking',
    'enforcementBlocking',
    'rollbackOrchestration',
    'hiddenEnforcement',
    'implicitEnforcement'
  ],
  invariants: [
    'risk_classification_determinism',
    'advisory_only',
    'runtime_sovereignty',
    'observability_synchronization',
    'governance_taxonomy_alignment',
    'explainable_outputs'
  ]
};

export default Object.freeze(riskGovernanceContract);
