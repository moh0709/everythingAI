import test from 'node:test';
import assert from 'node:assert/strict';

import riskGovernanceContract from '../src/governance/risk/contracts/riskGovernanceContract.js';
import RiskEvents from '../src/governance/risk/telemetry/riskEvents.js';
import { createRiskSignalModel } from '../src/governance/risk/models/riskSignalModel.js';
import {
  buildRiskClassificationInput,
  classifyOperationalRisk,
} from '../src/governance/risk/services/riskClassificationService.js';
import { recommendRiskEscalation } from '../src/governance/risk/services/escalationRecommendationService.js';
import { publishRiskEvent } from '../src/governance/risk/observability/riskEventPublisher.js';
import { normalizeRiskEvent } from '../src/governance/risk/observability/riskTelemetryService.js';
import {
  buildRiskObservabilityView,
  buildRiskGovernanceEventTaxonomyView,
} from '../src/governance/risk/observability/riskObservabilityAggregator.js';
import {
  buildRiskSnapshot,
  validateRiskSnapshotConsistency,
} from '../src/governance/risk/observability/riskSnapshotBuilder.js';
import { validateRiskClassificationDeterminism } from '../src/governance/risk/validation/riskClassificationDeterminismValidator.js';
import { validateRiskObservabilitySynchronization } from '../src/governance/risk/validation/riskObservabilityValidator.js';
import { validateRiskRuntimeSovereignty } from '../src/governance/risk/validation/riskRuntimeSovereigntyValidator.js';
import { validateRiskGovernanceTaxonomy } from '../src/governance/risk/validation/riskGovernanceTaxonomyValidator.js';

test('Phase 5.4 risk classification is deterministic advisory and explainable', () => {
  const signals = [
    createRiskSignalModel({
      signalId: 'risk-signal-privilege',
      category: 'privilege',
      severity: 'high',
      weight: 40,
      rationale: 'Privileged operation requested.',
    }),
    createRiskSignalModel({
      signalId: 'risk-signal-data',
      category: 'data',
      severity: 'medium',
      weight: 25,
      rationale: 'Sensitive workspace metadata may be referenced.',
    }),
  ];
  const input = buildRiskClassificationInput({
    subjectId: 'operation-001',
    operationType: 'workspace.export',
    correlationId: 'corr-risk-001',
    signals,
  });

  const firstResult = classifyOperationalRisk({ input });
  const secondResult = classifyOperationalRisk({
    input: buildRiskClassificationInput({
      subjectId: 'operation-001',
      operationType: 'workspace.export',
      correlationId: 'corr-risk-001',
      signals: [...signals].reverse(),
    }),
  });

  assert.equal(firstResult.mode, 'advisory');
  assert.equal(firstResult.enforced, false);
  assert.equal(firstResult.runtimeBlocking, false);
  assert.equal(firstResult.lifecycleMutation, false);
  assert.equal(firstResult.riskLevel, 'elevated');
  assert.deepEqual(firstResult.riskFactors.map((factor) => factor.signalId), [
    'risk-signal-data',
    'risk-signal-privilege',
  ]);
  assert.equal(firstResult.explanations.length, 2);
  assert.equal(validateRiskClassificationDeterminism({ firstResult, secondResult }).valid, true);
});

test('Phase 5.4 escalation recommendations preserve runtime sovereignty', () => {
  const runtimeDecision = Object.freeze({
    action: 'continue',
    safeguard: 'runtime-supervisor',
    lifecycleState: 'RUNNING',
  });
  const classification = classifyOperationalRisk({
    input: buildRiskClassificationInput({
      subjectId: 'operation-002',
      operationType: 'bulk.delete.preview',
      correlationId: 'corr-risk-002',
      signals: [
        createRiskSignalModel({
          signalId: 'risk-signal-destructive',
          category: 'operation',
          severity: 'critical',
          weight: 80,
          rationale: 'Destructive operation requires human governance visibility.',
        }),
      ],
    }),
  });

  const recommendation = recommendRiskEscalation({ runtimeDecision, classification });

  assert.equal(recommendation.advisoryOnly, true);
  assert.equal(recommendation.runtimeDecision, runtimeDecision);
  assert.equal(recommendation.runtimeDecision.action, 'continue');
  assert.equal(recommendation.blockingEffect, false);
  assert.equal(recommendation.enforced, false);
  assert.equal(recommendation.lifecycleMutation, false);
  assert.equal(recommendation.recommendedEscalation, 'pm_review');
  assert.equal(validateRiskRuntimeSovereignty(riskGovernanceContract).valid, true);
});

test('Phase 5.4 risk observability synchronizes telemetry snapshots and taxonomy', () => {
  const event = publishRiskEvent({
    eventType: RiskEvents.RISK_CLASSIFIED,
    subjectId: 'operation-003',
    correlationId: 'corr-risk-003',
    metadata: { issue: 9 },
  });
  const telemetry = normalizeRiskEvent(event);
  const snapshot = buildRiskSnapshot({
    classifications: [{ classificationId: 'risk-classification-001' }],
    recommendations: [{ recommendationId: 'risk-recommendation-001' }],
    telemetry: [telemetry],
  });
  const observability = buildRiskObservabilityView({
    telemetry: [telemetry],
    snapshots: [snapshot],
  });
  const taxonomy = buildRiskGovernanceEventTaxonomyView([telemetry]);

  assert.equal(telemetry.governanceDomain, 'risk');
  assert.equal(telemetry.governanceVersion, '5.4');
  assert.equal(telemetry.taxonomyCategory, 'governance.risk.advisory');
  assert.equal(observability.telemetry.totalTelemetry, 1);
  assert.equal(observability.snapshots.totalSnapshots, 1);
  assert.equal(taxonomy.categories['governance.risk.advisory'], 1);
  assert.equal(validateRiskSnapshotConsistency(snapshot).valid, true);
  assert.equal(validateRiskObservabilitySynchronization({ telemetry: [telemetry], snapshots: [snapshot] }).valid, true);
  assert.equal(validateRiskGovernanceTaxonomy([telemetry]).valid, true);
});

test('Phase 5.4 risk contract remains additive without enforcement authority', () => {
  assert.equal(riskGovernanceContract.governanceDomain, 'risk');
  assert.equal(riskGovernanceContract.mode, 'advisory');
  assert.equal(riskGovernanceContract.enforcementLevel, 'L0');
  assert.equal(riskGovernanceContract.additiveRolloutOnly, true);
  assert.equal(riskGovernanceContract.enforcementAuthority, false);
  assert.equal(riskGovernanceContract.runtimeSovereigntyPreserved, true);
  assert.equal(riskGovernanceContract.forbiddenDependencies.includes('runtimeBlocking'), true);
  assert.equal(riskGovernanceContract.forbiddenDependencies.includes('runtimeLifecycleMutation'), true);
  assert.equal(validateRiskRuntimeSovereignty(riskGovernanceContract).valid, true);
});
