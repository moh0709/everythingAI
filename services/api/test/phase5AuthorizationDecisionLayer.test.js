import test from 'node:test';
import assert from 'node:assert/strict';

import authorizationGovernanceContract from '../src/governance/authorization/contracts/authorizationGovernanceContract.js';
import AuthorizationEvents from '../src/governance/authorization/telemetry/authorizationEvents.js';
import { createAuthorizationSignalModel } from '../src/governance/authorization/models/authorizationSignalModel.js';
import {
  buildAuthorizationDecisionInput,
  synthesizeAuthorizationDecision,
} from '../src/governance/authorization/services/authorizationDecisionService.js';
import { buildExplainableAuthorizationChain } from '../src/governance/authorization/services/authorizationChainService.js';
import { createAuthorizationEvidenceArtifact } from '../src/governance/authorization/services/authorizationEvidenceService.js';
import { executeShadowAuthorizationEvaluation } from '../src/governance/authorization/services/shadowAuthorizationEvaluationService.js';
import { publishAuthorizationEvent } from '../src/governance/authorization/observability/authorizationEventPublisher.js';
import { normalizeAuthorizationEvent } from '../src/governance/authorization/observability/authorizationTelemetryService.js';
import { buildAuthorizationObservabilityView } from '../src/governance/authorization/observability/authorizationObservabilityAggregator.js';
import {
  buildAuthorizationSnapshot,
  validateAuthorizationSnapshotConsistency,
} from '../src/governance/authorization/observability/authorizationSnapshotBuilder.js';
import { validateAuthorizationDeterminism } from '../src/governance/authorization/validation/authorizationDeterminismValidator.js';
import { validateShadowAuthorizationConsistency } from '../src/governance/authorization/validation/shadowAuthorizationConsistencyValidator.js';
import { validateAuthorizationExplainability } from '../src/governance/authorization/validation/authorizationExplainabilityValidator.js';
import { validateAuthorizationObservability } from '../src/governance/authorization/validation/authorizationObservabilityValidator.js';
import { validateAuthorizationInvariants } from '../src/governance/authorization/validation/authorizationInvariantValidator.js';

test('Phase 5.7 authorization synthesis is centralized deterministic shadow-only and explainable', () => {
  const signals = [
    createAuthorizationSignalModel({
      signalId: 'authz-signal-policy',
      sourceDomain: 'policy',
      priority: 30,
      outcome: 'shadow_eligible',
      rationale: 'Policy shadow evaluation keeps the workspace eligible.',
    }),
    createAuthorizationSignalModel({
      signalId: 'authz-signal-permission',
      sourceDomain: 'permission',
      priority: 10,
      outcome: 'permission_observed',
      rationale: 'Permission grant is observed as governance metadata only.',
    }),
    createAuthorizationSignalModel({
      signalId: 'authz-signal-risk',
      sourceDomain: 'risk',
      priority: 20,
      outcome: 'risk_review',
      rationale: 'Risk classification recommends advisory review.',
    }),
  ];
  const input = buildAuthorizationDecisionInput({
    subjectId: 'workspace-authorization-001',
    operationType: 'workspace.export',
    signals,
    correlationId: 'corr-authz-001',
  });

  const firstResult = synthesizeAuthorizationDecision({ input });
  const secondResult = synthesizeAuthorizationDecision({
    input: buildAuthorizationDecisionInput({
      subjectId: 'workspace-authorization-001',
      operationType: 'workspace.export',
      signals: [...signals].reverse(),
      correlationId: 'corr-authz-001',
    }),
  });
  const chain = buildExplainableAuthorizationChain({ decision: firstResult, signals });

  assert.equal(firstResult.mode, 'shadow');
  assert.equal(firstResult.centralizedAuthority, true);
  assert.equal(firstResult.enforced, false);
  assert.equal(firstResult.runtimeBlocking, false);
  assert.equal(firstResult.lifecycleMutation, false);
  assert.equal(firstResult.runtimeExecutionAuthority, false);
  assert.equal(firstResult.shadowDecision, 'shadow_review');
  assert.deepEqual(firstResult.signalIds, [
    'authz-signal-permission',
    'authz-signal-risk',
    'authz-signal-policy',
  ]);
  assert.deepEqual(chain.explanations.map((item) => item.signalId), [
    'authz-signal-permission',
    'authz-signal-risk',
    'authz-signal-policy',
  ]);
  assert.equal(validateAuthorizationDeterminism({ firstResult, secondResult }).valid, true);
  assert.equal(validateAuthorizationExplainability(chain).valid, true);
});

test('Phase 5.7 authorization shadow evaluation preserves runtime safeguards and decisions', () => {
  const runtimeDecision = Object.freeze({
    action: 'continue',
    safeguard: 'runtime-supervisor',
    lifecycleState: 'RUNNING',
  });
  const authorizationDecision = synthesizeAuthorizationDecision({
    input: buildAuthorizationDecisionInput({
      subjectId: 'workspace-authorization-002',
      operationType: 'workspace.sync',
      signals: [
        createAuthorizationSignalModel({
          signalId: 'authz-signal-policy-002',
          sourceDomain: 'policy',
          priority: 10,
          outcome: 'shadow_authorized',
          rationale: 'Policy signal is observed in shadow mode.',
        }),
      ],
      correlationId: 'corr-authz-002',
    }),
  });

  const shadowResult = executeShadowAuthorizationEvaluation({
    runtimeDecision,
    authorizationDecision,
  });

  assert.equal(shadowResult.shadowMode, true);
  assert.equal(shadowResult.runtimeDecision, runtimeDecision);
  assert.equal(shadowResult.runtimeDecision.action, 'continue');
  assert.equal(shadowResult.runtimeSafeguardSupremacy, true);
  assert.equal(shadowResult.lifecycleMutation, false);
  assert.equal(shadowResult.blockingEffect, false);
  assert.equal(shadowResult.runtimeExecutionAuthority, false);
  assert.equal(validateShadowAuthorizationConsistency(shadowResult).valid, true);
});

test('Phase 5.7 authorization evidence artifacts are immutable and correlated', () => {
  const artifact = createAuthorizationEvidenceArtifact({
    artifactId: 'authz-evidence-001',
    decisionId: 'authz-decision-001',
    correlationId: 'corr-authz-003',
    eventType: AuthorizationEvents.AUTHORIZATION_DECISION_SYNTHESIZED,
    evidence: {
      shadowDecision: 'shadow_review',
      signalIds: ['authz-signal-risk'],
      runtimeDecisionId: 'runtime-decision-003',
    },
    rationale: 'Centralized authorization evidence recorded for PM review.',
  });

  assert.equal(artifact.governanceDomain, 'authorization');
  assert.equal(artifact.governanceVersion, '5.7');
  assert.equal(artifact.immutable, true);
  assert.equal(artifact.shadowOnly, true);
  assert.equal(artifact.enforced, false);
  assert.equal(artifact.runtimeBlocking, false);
  assert.equal(artifact.correlationId, 'corr-authz-003');
  assert.throws(() => {
    artifact.evidence.shadowDecision = 'blocked';
  }, TypeError);
  assert.equal(artifact.evidence.shadowDecision, 'shadow_review');
});

test('Phase 5.7 authorization observability synchronizes telemetry artifacts and snapshots', () => {
  const event = publishAuthorizationEvent({
    eventType: AuthorizationEvents.AUTHORIZATION_DECISION_SYNTHESIZED,
    decisionId: 'authz-decision-004',
    correlationId: 'corr-authz-004',
    metadata: { issue: 12 },
  });
  const telemetry = normalizeAuthorizationEvent(event);
  const evidenceArtifact = createAuthorizationEvidenceArtifact({
    artifactId: 'authz-evidence-004',
    decisionId: 'authz-decision-004',
    correlationId: 'corr-authz-004',
    eventType: AuthorizationEvents.AUTHORIZATION_DECISION_SYNTHESIZED,
    evidence: { shadowDecision: 'shadow_authorized' },
  });
  const snapshot = buildAuthorizationSnapshot({
    decisions: [{ decisionId: 'authz-decision-004' }],
    shadowEvaluations: [{ shadowEvaluationId: 'authz-shadow-004' }],
    evidenceArtifacts: [evidenceArtifact],
    telemetry: [telemetry],
  });
  const observability = buildAuthorizationObservabilityView({
    telemetry: [telemetry],
    snapshots: [snapshot],
    evidenceArtifacts: [evidenceArtifact],
  });

  assert.equal(telemetry.governanceDomain, 'authorization');
  assert.equal(telemetry.governanceVersion, '5.7');
  assert.equal(telemetry.taxonomyCategory, 'governance.authorization.shadow');
  assert.equal(observability.telemetry.totalTelemetry, 1);
  assert.equal(observability.snapshots.totalSnapshots, 1);
  assert.equal(observability.evidenceArtifacts.totalEvidenceArtifacts, 1);
  assert.equal(validateAuthorizationSnapshotConsistency(snapshot).valid, true);
  assert.equal(validateAuthorizationObservability({
    telemetry: [telemetry],
    snapshots: [snapshot],
    evidenceArtifacts: [evidenceArtifact],
  }).valid, true);
});

test('Phase 5.7 authorization contract keeps runtime safeguard supremacy and forbids hidden blocking', () => {
  assert.equal(authorizationGovernanceContract.governanceDomain, 'authorization');
  assert.equal(authorizationGovernanceContract.mode, 'shadow');
  assert.equal(authorizationGovernanceContract.enforcementLevel, 'L0');
  assert.equal(authorizationGovernanceContract.centralizedAuthorizationOnly, true);
  assert.equal(authorizationGovernanceContract.inlineRuntimeAuthorization, false);
  assert.equal(authorizationGovernanceContract.hiddenBlockingPaths, false);
  assert.equal(authorizationGovernanceContract.immutableAuthorizationEvidenceRequired, true);
  assert.equal(authorizationGovernanceContract.runtimeSafeguardSupremacy, true);
  assert.equal(authorizationGovernanceContract.runtimeExecutionAuthority, false);
  assert.equal(authorizationGovernanceContract.enforcementAuthority, false);
  assert.equal(authorizationGovernanceContract.forbiddenDependencies.includes('runtimeBlocking'), true);
  assert.equal(authorizationGovernanceContract.forbiddenDependencies.includes('runtimeLifecycleMutation'), true);
  assert.equal(authorizationGovernanceContract.forbiddenDependencies.includes('inlineRuntimeAuthorization'), true);
  assert.equal(validateAuthorizationInvariants(authorizationGovernanceContract).valid, true);
});
