import test from 'node:test';
import assert from 'node:assert/strict';

import policyGovernanceContract from '../src/governance/policy/contracts/policyGovernanceContract.js';
import PolicyEvents from '../src/governance/policy/telemetry/policyEvents.js';
import { createPolicyRuleModel } from '../src/governance/policy/models/policyRuleModel.js';
import {
  evaluateEligibilityPolicies,
  buildPolicyEvaluationInput,
} from '../src/governance/policy/services/policyEvaluationService.js';
import { executeShadowPolicyTrack } from '../src/governance/policy/services/shadowPolicyExecutionService.js';
import { publishPolicyEvent } from '../src/governance/policy/observability/policyEventPublisher.js';
import { normalizePolicyEvent } from '../src/governance/policy/observability/policyTelemetryService.js';
import {
  buildPolicyObservabilityView,
  buildGovernanceEventTaxonomyView,
} from '../src/governance/policy/observability/policyObservabilityAggregator.js';
import {
  buildPolicySnapshot,
  validatePolicySnapshotConsistency,
} from '../src/governance/policy/observability/policySnapshotBuilder.js';
import { validatePolicyDeterminism } from '../src/governance/policy/validation/policyDeterminismValidator.js';
import { validateShadowConsistency } from '../src/governance/policy/validation/shadowConsistencyValidator.js';
import { validatePolicyRuntimeCompatibility } from '../src/governance/policy/validation/policyRuntimeCompatibilityValidator.js';
import { validatePolicyInvariants } from '../src/governance/policy/validation/policyInvariantValidator.js';
import { validatePolicyObservability } from '../src/governance/policy/validation/policyObservabilityValidator.js';

test('Phase 5.3 policy rules are deterministic explainable and eligibility-only', () => {
  const rules = [
    createPolicyRuleModel({
      policyId: 'policy-risk-escalation',
      priority: 20,
      eligibilitySignal: 'riskLevel',
      expectedValue: 'high',
      outcome: 'shadow_escalate',
      explanation: 'High risk requires governance review eligibility signal.',
    }),
    createPolicyRuleModel({
      policyId: 'policy-default-eligible',
      priority: 90,
      eligibilitySignal: 'workspaceStatus',
      expectedValue: 'active',
      outcome: 'shadow_eligible',
      explanation: 'Active workspace remains eligible in shadow mode.',
    }),
  ];
  const input = buildPolicyEvaluationInput({
    subjectId: 'workspace-001',
    eligibilityContext: { riskLevel: 'high', workspaceStatus: 'active' },
    correlationId: 'corr-policy-001',
  });

  const firstResult = evaluateEligibilityPolicies({ rules, input });
  const secondResult = evaluateEligibilityPolicies({ rules: [...rules].reverse(), input });

  assert.equal(firstResult.mode, 'shadow');
  assert.equal(firstResult.enforced, false);
  assert.equal(firstResult.runtimeBlocking, false);
  assert.equal(firstResult.lifecycleMutation, false);
  assert.equal(firstResult.eligibilityOnly, true);
  assert.deepEqual(firstResult.eligibleOutcomes, ['shadow_escalate', 'shadow_eligible']);
  assert.deepEqual(firstResult.explanations.map((item) => item.policyId), [
    'policy-risk-escalation',
    'policy-default-eligible',
  ]);
  assert.equal(validatePolicyDeterminism({ firstResult, secondResult }).valid, true);
  assert.equal(validatePolicyInvariants(firstResult).valid, true);
});

test('Phase 5.3 shadow execution preserves runtime decisions and lifecycle state', () => {
  const runtimeDecision = Object.freeze({
    action: 'continue',
    safeguard: 'runtime-supervisor',
    lifecycleState: 'RUNNING',
  });
  const evaluation = evaluateEligibilityPolicies({
    rules: [
      createPolicyRuleModel({
        policyId: 'policy-default-eligible',
        eligibilitySignal: 'workspaceStatus',
        expectedValue: 'active',
        outcome: 'shadow_eligible',
        explanation: 'Active workspace remains eligible in shadow mode.',
      }),
    ],
    input: buildPolicyEvaluationInput({
      subjectId: 'workspace-001',
      eligibilityContext: { workspaceStatus: 'active' },
      correlationId: 'corr-policy-002',
    }),
  });

  const shadowResult = executeShadowPolicyTrack({ runtimeDecision, evaluation });

  assert.equal(shadowResult.shadowMode, true);
  assert.equal(shadowResult.runtimeDecision, runtimeDecision);
  assert.equal(shadowResult.runtimeDecision.action, 'continue');
  assert.equal(shadowResult.lifecycleMutation, false);
  assert.equal(shadowResult.blockingEffect, false);
  assert.equal(validateShadowConsistency(shadowResult).valid, true);
  assert.equal(validatePolicyRuntimeCompatibility(policyGovernanceContract).valid, true);
});

test('Phase 5.3 policy observability emits taxonomy-aligned governance evidence', () => {
  const event = publishPolicyEvent({
    eventType: PolicyEvents.POLICY_EVALUATED,
    policyId: 'policy-default-eligible',
    subjectId: 'workspace-001',
    correlationId: 'corr-policy-003',
    metadata: { issue: 8 },
  });
  const telemetry = normalizePolicyEvent(event);
  const snapshot = buildPolicySnapshot({
    evaluations: [{ evaluationId: 'eval-001' }],
    shadowExecutions: [{ shadowExecutionId: 'shadow-001' }],
    telemetry: [telemetry],
  });
  const observability = buildPolicyObservabilityView({
    telemetry: [telemetry],
    snapshots: [snapshot],
  });
  const taxonomy = buildGovernanceEventTaxonomyView([telemetry]);

  assert.equal(telemetry.governanceDomain, 'policy');
  assert.equal(telemetry.governanceVersion, '5.3');
  assert.equal(telemetry.taxonomyCategory, 'governance.policy.shadow');
  assert.equal(observability.telemetry.totalTelemetry, 1);
  assert.equal(observability.snapshots.totalSnapshots, 1);
  assert.equal(taxonomy.categories['governance.policy.shadow'], 1);
  assert.equal(validatePolicySnapshotConsistency(snapshot).valid, true);
  assert.equal(validatePolicyObservability({ telemetry: [telemetry], snapshots: [snapshot] }).valid, true);
});

test('Phase 5.3 policy contract keeps observability before enforcement', () => {
  assert.equal(policyGovernanceContract.governanceDomain, 'policy');
  assert.equal(policyGovernanceContract.mode, 'shadow');
  assert.equal(policyGovernanceContract.enforcementLevel, 'L0');
  assert.equal(policyGovernanceContract.observabilityBeforeEnforcement, true);
  assert.equal(policyGovernanceContract.hiddenEnforcement, false);
  assert.equal(policyGovernanceContract.runtimeSafeguardSupremacy, true);
  assert.equal(policyGovernanceContract.forbiddenDependencies.includes('runtimeLifecycleMutation'), true);
  assert.equal(policyGovernanceContract.forbiddenDependencies.includes('runtimeBlocking'), true);
  assert.equal(validatePolicyRuntimeCompatibility(policyGovernanceContract).valid, true);
});
