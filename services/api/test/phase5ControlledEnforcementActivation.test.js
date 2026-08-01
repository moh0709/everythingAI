import test from 'node:test';
import assert from 'node:assert/strict';

import enforcementActivationContract from '../src/governance/enforcement/contracts/enforcementActivationContract.js';
import EnforcementEvents from '../src/governance/enforcement/telemetry/enforcementEvents.js';
import {
  buildEnforcementActivationPlan,
  evaluateSoftEnforcementActivation,
  evaluateControlledAuthorizationBlocking,
  executeEnforcementRollback,
} from '../src/governance/enforcement/services/enforcementActivationService.js';
import { createEnforcementEvidenceArtifact } from '../src/governance/enforcement/services/enforcementEvidenceService.js';
import { publishEnforcementEvent } from '../src/governance/enforcement/observability/enforcementEventPublisher.js';
import { normalizeEnforcementEvent } from '../src/governance/enforcement/observability/enforcementTelemetryService.js';
import {
  buildEnforcementSnapshot,
  validateEnforcementSnapshotConsistency,
} from '../src/governance/enforcement/observability/enforcementSnapshotBuilder.js';
import { buildEnforcementObservabilityView } from '../src/governance/enforcement/observability/enforcementObservabilityAggregator.js';
import { certifyOperationalReadiness } from '../src/governance/enforcement/services/operationalCertificationService.js';
import { validateEnforcementRollback } from '../src/governance/enforcement/validation/enforcementRollbackValidator.js';
import { validateRuntimeCompatibility } from '../src/governance/enforcement/validation/runtimeCompatibilityValidator.js';
import { validateOperationalReadinessCertification } from '../src/governance/enforcement/validation/operationalReadinessCertificationValidator.js';
import { validateEnforcementInvariants } from '../src/governance/enforcement/validation/enforcementInvariantValidator.js';
import { validateGovernanceDrift } from '../src/governance/enforcement/validation/governanceDriftValidator.js';
import { validateRecoverySimulation } from '../src/governance/enforcement/validation/recoverySimulationValidator.js';
import { validateDueDiligenceReview } from '../src/governance/enforcement/validation/dueDiligenceReviewValidator.js';

test('Phase 5.8 activation plan is phased and starts with soft observable enforcement', () => {
  const plan = buildEnforcementActivationPlan({
    planId: 'enforcement-plan-001',
    authorizationDecisionId: 'authz-decision-001',
    correlationId: 'corr-enforce-001',
    requestedPhase: 'soft_enforcement',
    shadowMaturity: {
      minimumObservationsMet: true,
      deterministicReplayMet: true,
      driftFreeWindowMet: true,
      explainabilityCoverageMet: true,
    },
    rollback: {
      rollbackPlanId: 'rollback-001',
      verified: true,
      lastVerifiedAt: '2026-08-01T16:00:00.000Z',
    },
  });
  const softActivation = evaluateSoftEnforcementActivation({ plan });

  assert.equal(plan.governanceDomain, 'enforcement');
  assert.equal(plan.governanceVersion, '5.8');
  assert.equal(plan.phasedActivationOnly, true);
  assert.equal(plan.requestedPhase, 'soft_enforcement');
  assert.equal(plan.enforcementLevel, 'L1');
  assert.equal(plan.runtimeSafeguardSupremacy, true);
  assert.equal(plan.hiddenEscalation, false);
  assert.deepEqual(plan.phaseSequence, ['shadow', 'soft_enforcement', 'controlled_blocking']);
  assert.equal(softActivation.softEnforcementActive, true);
  assert.equal(softActivation.runtimeBlocking, false);
  assert.equal(softActivation.observable, true);
});

test('Phase 5.8 controlled authorization blocking requires maturity rollback explainability and runtime compatibility', () => {
  const plan = buildEnforcementActivationPlan({
    planId: 'enforcement-plan-002',
    authorizationDecisionId: 'authz-decision-002',
    correlationId: 'corr-enforce-002',
    requestedPhase: 'controlled_blocking',
    shadowMaturity: {
      minimumObservationsMet: true,
      deterministicReplayMet: true,
      driftFreeWindowMet: true,
      explainabilityCoverageMet: true,
    },
    rollback: {
      rollbackPlanId: 'rollback-002',
      verified: true,
      lastVerifiedAt: '2026-08-01T16:10:00.000Z',
    },
    runtimeCompatibility: {
      runtimeSafeguardsAuthoritative: true,
      noLifecycleMutation: true,
      boundedBlocking: true,
    },
    certification: {
      certified: true,
      certifiedBy: 'operations',
      evidenceIds: ['cert-001'],
    },
  });

  const blockingDecision = evaluateControlledAuthorizationBlocking({
    plan,
    authorizationDecision: {
      decisionId: 'authz-decision-002',
      shadowDecision: 'shadow_review',
      explanations: [{ rationale: 'High-risk export needs an explicit authorization hold.' }],
    },
  });

  assert.equal(blockingDecision.blockingAllowed, true);
  assert.equal(blockingDecision.enforcementLevel, 'L2');
  assert.equal(blockingDecision.explainableBlocking, true);
  assert.equal(blockingDecision.runtimeSafeguardSupremacy, true);
  assert.equal(blockingDecision.lifecycleMutation, false);
  assert.equal(blockingDecision.hiddenEscalation, false);
  assert.equal(validateRuntimeCompatibility(blockingDecision).valid, true);
  assert.equal(validateEnforcementInvariants(enforcementActivationContract).valid, true);
});

test('Phase 5.8 authorization blocking fails closed without shadow maturity or rollback proof', () => {
  const plan = buildEnforcementActivationPlan({
    planId: 'enforcement-plan-003',
    authorizationDecisionId: 'authz-decision-003',
    requestedPhase: 'controlled_blocking',
    shadowMaturity: {
      minimumObservationsMet: true,
      deterministicReplayMet: false,
      driftFreeWindowMet: true,
      explainabilityCoverageMet: true,
    },
    rollback: {
      rollbackPlanId: 'rollback-003',
      verified: false,
    },
  });

  const blockingDecision = evaluateControlledAuthorizationBlocking({
    plan,
    authorizationDecision: {
      decisionId: 'authz-decision-003',
      shadowDecision: 'shadow_review',
      explanations: [{ rationale: 'Review rationale exists but maturity is incomplete.' }],
    },
  });

  assert.equal(blockingDecision.blockingAllowed, false);
  assert.equal(blockingDecision.failClosed, true);
  assert.equal(blockingDecision.runtimeBlocking, false);
  assert.equal(blockingDecision.blockingReasonCodes.includes('SHADOW_MATURITY_REQUIRED'), true);
  assert.equal(blockingDecision.blockingReasonCodes.includes('ROLLBACK_REQUIRED'), true);
});

test('Phase 5.8 rollback returns enforcement to shadow without mutating runtime safeguards', () => {
  const rollbackResult = executeEnforcementRollback({
    rollbackPlanId: 'rollback-004',
    activationId: 'activation-004',
    reason: 'operator rollback drill',
    runtimeDecision: Object.freeze({
      action: 'continue',
      safeguard: 'runtime-supervisor',
    }),
  });

  assert.equal(rollbackResult.rollbackExecuted, true);
  assert.equal(rollbackResult.restoredPhase, 'shadow');
  assert.equal(rollbackResult.enforcementLevel, 'L0');
  assert.equal(rollbackResult.runtimeDecision.action, 'continue');
  assert.equal(rollbackResult.runtimeSafeguardSupremacy, true);
  assert.equal(rollbackResult.lifecycleMutation, false);
  assert.equal(validateEnforcementRollback(rollbackResult).valid, true);
});

test('Phase 5.8 enforcement observability correlates events evidence snapshots and certification', () => {
  const event = publishEnforcementEvent({
    eventType: EnforcementEvents.ENFORCEMENT_PHASE_EVALUATED,
    activationId: 'activation-005',
    correlationId: 'corr-enforce-005',
    metadata: { phase: 'soft_enforcement' },
  });
  const telemetry = normalizeEnforcementEvent(event);
  const evidenceArtifact = createEnforcementEvidenceArtifact({
    artifactId: 'enforcement-evidence-005',
    activationId: 'activation-005',
    correlationId: 'corr-enforce-005',
    eventType: EnforcementEvents.ENFORCEMENT_PHASE_EVALUATED,
    evidence: {
      phase: 'soft_enforcement',
      rollbackVerified: true,
    },
  });
  const snapshot = buildEnforcementSnapshot({
    activations: [{ activationId: 'activation-005' }],
    blockingDecisions: [],
    rollbacks: [],
    evidenceArtifacts: [evidenceArtifact],
    telemetry: [telemetry],
  });
  const observability = buildEnforcementObservabilityView({
    telemetry: [telemetry],
    snapshots: [snapshot],
    evidenceArtifacts: [evidenceArtifact],
  });

  assert.equal(telemetry.taxonomyCategory, 'governance.enforcement.activation');
  assert.equal(evidenceArtifact.observableEnforcement, true);
  assert.equal(snapshot.governanceDomain, 'enforcement');
  assert.equal(observability.telemetry.totalTelemetry, 1);
  assert.equal(validateEnforcementSnapshotConsistency(snapshot).valid, true);
  assert.throws(() => {
    evidenceArtifact.evidence.phase = 'controlled_blocking';
  }, TypeError);
});

test('Phase 5.8 certification drift recovery and due diligence validators must all pass before activation', () => {
  const certification = certifyOperationalReadiness({
    certificationId: 'cert-006',
    operatorId: 'ops-lead',
    evidenceIds: ['rollback-006', 'runtime-006', 'drift-006', 'recovery-006'],
    checks: {
      rollbackValidated: true,
      runtimeCompatibilityValidated: true,
      observabilityValidated: true,
      invariantValidationPassed: true,
      governanceDriftValidated: true,
      recoverySimulationValidated: true,
      dueDiligenceReviewed: true,
    },
  });

  assert.equal(certification.certified, true);
  assert.equal(validateOperationalReadinessCertification(certification).valid, true);
  assert.equal(validateGovernanceDrift({ baselineHash: 'abc', currentHash: 'abc' }).valid, true);
  assert.equal(validateRecoverySimulation({
    rollbackRestoredShadow: true,
    telemetryReplayed: true,
    snapshotsRebuilt: true,
    certificationRecovered: true,
  }).valid, true);
  assert.equal(validateDueDiligenceReview({
    acceptanceMatrixComplete: true,
    risksReviewed: true,
    validationEvidencePresent: true,
    noSecretsExposed: true,
    noDependentTasksReleased: true,
  }).valid, true);
});
