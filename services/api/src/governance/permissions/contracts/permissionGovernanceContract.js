const permissionGovernanceContract = {
  governanceDomain: 'permissions',
  governanceVersion: '5.2',
  mode: 'observational',
  blastRadius: 'BR-1',
  enforcementLevel: 'L0',
  centralAuthorizationArchitecture: true,
  hiddenAuthorization: false,
  allowedDependencies: [
    'identity',
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
    'permission_determinism',
    'permission_inheritance_integrity',
    'runtime_isolation',
    'observability_integrity'
  ]
};

export default permissionGovernanceContract;
