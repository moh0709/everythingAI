const escalationGovernanceContract = {
  governanceDomain: 'escalation',
  governanceVersion: '5.6',
  mode: 'advisory',
  blastRadius: 'BR-1',
  enforcementLevel: 'L0',
  additiveRolloutOnly: true,
  enforcementAuthority: false,
  runtimeSovereigntyPreserved: true,
  immutableAuditArtifacts: true,
  explainableEscalationChains: true,
  hiddenEscalationExecutionAuthority: false,
  allowedDependencies: [
    'identity',
    'permissions',
    'policy',
    'risk',
    'approval',
    'observability',
    'telemetry',
    'validation'
  ],
  forbiddenDependencies: [
    'runtimeExecution',
    'runtimeLifecycleMutation',
    'runtimeBlocking',
    'runtimeOrchestration',
    'executionBlocking',
    'enforcementBlocking',
    'hiddenEscalationExecutionAuthority',
    'implicitEnforcement'
  ],
  invariants: [
    'escalation_routing_determinism',
    'advisory_only',
    'immutable_escalation_audit_artifacts',
    'explainable_escalation_chains',
    'runtime_sovereignty_preserved',
    'no_hidden_escalation_execution_authority',
    'observability_synchronization'
  ]
};

export default Object.freeze(escalationGovernanceContract);
