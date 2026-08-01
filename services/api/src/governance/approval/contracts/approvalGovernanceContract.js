const approvalGovernanceContract = {
  governanceDomain: 'approval',
  governanceVersion: '5.5',
  mode: 'advisory',
  blastRadius: 'BR-1',
  enforcementLevel: 'L0',
  additiveRolloutOnly: true,
  enforcementAuthority: false,
  runtimeSafeguardSupremacy: true,
  immutableAuditArtifacts: true,
  explainableApprovalChains: true,
  hiddenApprovalBypasses: false,
  allowedDependencies: [
    'identity',
    'permissions',
    'policy',
    'risk',
    'observability',
    'telemetry',
    'validation'
  ],
  forbiddenDependencies: [
    'runtimeExecution',
    'runtimeLifecycleMutation',
    'runtimeBlocking',
    'enforcementBlocking',
    'safeguardBypass',
    'hiddenApprovalBypass',
    'implicitEnforcement'
  ],
  invariants: [
    'approval_lifecycle_determinism',
    'advisory_only',
    'immutable_audit_artifacts',
    'explainable_approval_chains',
    'runtime_safeguard_supremacy',
    'no_hidden_approval_bypasses',
    'observability_synchronization'
  ]
};

export default Object.freeze(approvalGovernanceContract);
