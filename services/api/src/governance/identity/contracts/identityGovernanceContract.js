const identityGovernanceContract = {
  governanceDomain: 'identity',
  governanceVersion: '5.1',
  mode: 'observational',
  blastRadius: 'BR-1',
  enforcementLevel: 'L0',
  allowedDependencies: [
    'permissions',
    'observability',
    'telemetry',
    'validation'
  ],
  forbiddenDependencies: [
    'runtimeExecution',
    'rollbackOrchestration',
    'enforcementBlocking',
    'policyExecution'
  ],
  invariants: [
    'identity_determinism',
    'runtime_isolation',
    'immutable_auditability',
    'observability_integrity'
  ]
};

export default identityGovernanceContract;
