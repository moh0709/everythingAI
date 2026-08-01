import test from 'node:test';
import assert from 'node:assert/strict';

import escalationGovernanceContract from '../src/governance/escalation/contracts/escalationGovernanceContract.js';
import EscalationEvents from '../src/governance/escalation/telemetry/escalationEvents.js';
import { createEscalationSignalModel } from '../src/governance/escalation/models/escalationSignalModel.js';
import { createEscalationRouteModel } from '../src/governance/escalation/models/escalationRouteModel.js';
import {
  buildEscalationRoutingInput,
  routeEscalationAdvisory,
} from '../src/governance/escalation/services/escalationRoutingService.js';
import { createEscalationAuditArtifact } from '../src/governance/escalation/services/escalationAuditService.js';
import { publishEscalationEvent } from '../src/governance/escalation/observability/escalationEventPublisher.js';
import { normalizeEscalationEvent } from '../src/governance/escalation/observability/escalationTelemetryService.js';
import { buildEscalationObservabilityView } from '../src/governance/escalation/observability/escalationObservabilityAggregator.js';
import {
  buildEscalationSnapshot,
  validateEscalationSnapshotConsistency,
} from '../src/governance/escalation/observability/escalationSnapshotBuilder.js';
import { validateEscalationRouting } from '../src/governance/escalation/validation/escalationRoutingValidator.js';
import { validateEscalationDeterminism } from '../src/governance/escalation/validation/escalationDeterminismValidator.js';
import { validateEscalationObservability } from '../src/governance/escalation/validation/escalationObservabilityValidator.js';
import { validateEscalationContract } from '../src/governance/escalation/validation/escalationContractValidator.js';

test('Phase 5.6 escalation routing is deterministic advisory and explainable', () => {
  const signals = [
    createEscalationSignalModel({
      signalId: 'escalation-signal-risk',
      sourceDomain: 'risk',
      severity: 'critical',
      weight: 90,
      rationale: 'Critical operational risk requires PM visibility.',
    }),
    createEscalationSignalModel({
      signalId: 'escalation-signal-approval',
      sourceDomain: 'approval',
      severity: 'high',
      weight: 50,
      rationale: 'Approval remains pending for a sensitive operation.',
    }),
  ];
  const routes = [
    createEscalationRouteModel({
      routeId: 'route-governance-review',
      targetRole: 'governance_reviewer',
      minimumSeverity: 'high',
      priority: 20,
      rationale: 'Governance reviewer receives high-severity advisory chains.',
    }),
    createEscalationRouteModel({
      routeId: 'route-pm-review',
      targetRole: 'pm_reviewer',
      minimumSeverity: 'critical',
      priority: 10,
      rationale: 'PM reviewer receives critical advisory chains.',
    }),
  ];
  const input = buildEscalationRoutingInput({
    subjectId: 'operation-esc-001',
    operationType: 'bulk.delete.preview',
    correlationId: 'corr-escalation-001',
    signals,
    routes,
  });

  const firstResult = routeEscalationAdvisory({ input });
  const secondResult = routeEscalationAdvisory({
    input: buildEscalationRoutingInput({
      subjectId: 'operation-esc-001',
      operationType: 'bulk.delete.preview',
      correlationId: 'corr-escalation-001',
      signals: [...signals].reverse(),
      routes: [...routes].reverse(),
    }),
  });

  assert.equal(firstResult.mode, 'advisory');
  assert.equal(firstResult.enforced, false);
  assert.equal(firstResult.runtimeBlocking, false);
  assert.equal(firstResult.lifecycleMutation, false);
  assert.deepEqual(firstResult.routeIds, ['route-pm-review', 'route-governance-review']);
  assert.deepEqual(firstResult.escalationChain.map((step) => step.targetRole), [
    'pm_reviewer',
    'governance_reviewer',
  ]);
  assert.equal(firstResult.explanations.length, 2);
  assert.equal(validateEscalationRouting(firstResult).valid, true);
  assert.equal(validateEscalationDeterminism({ firstResult, secondResult }).valid, true);
});

test('Phase 5.6 escalation audit artifacts are immutable and advisory only', () => {
  const artifact = createEscalationAuditArtifact({
    auditId: 'escalation-audit-001',
    escalationId: 'escalation-routing-001',
    eventType: 'escalation.routing_evaluated',
    actorId: 'operator-esc-001',
    evidence: {
      routeIds: ['route-pm-review'],
      advisoryOnly: true,
      runtimeDecisionId: 'runtime-decision-esc-001',
    },
    rationale: 'Escalation routing recorded for governance review without execution authority.',
  });

  assert.equal(artifact.governanceDomain, 'escalation');
  assert.equal(artifact.governanceVersion, '5.6');
  assert.equal(artifact.immutable, true);
  assert.equal(artifact.advisoryOnly, true);
  assert.equal(artifact.enforced, false);
  assert.throws(() => {
    artifact.evidence.routeIds.push('route-hidden');
  }, TypeError);
  assert.deepEqual(artifact.evidence.routeIds, ['route-pm-review']);
});

test('Phase 5.6 escalation observability synchronizes telemetry audit artifacts and snapshots', () => {
  const event = publishEscalationEvent({
    eventType: EscalationEvents.ESCALATION_ROUTING_EVALUATED,
    escalationId: 'escalation-routing-003',
    correlationId: 'corr-escalation-003',
    metadata: { issue: 11 },
  });
  const telemetry = normalizeEscalationEvent(event);
  const auditArtifact = createEscalationAuditArtifact({
    auditId: 'escalation-audit-003',
    escalationId: 'escalation-routing-003',
    eventType: EscalationEvents.ESCALATION_ROUTING_EVALUATED,
    actorId: 'operator-esc-003',
    evidence: { routeIds: ['route-pm-review'] },
  });
  const snapshot = buildEscalationSnapshot({
    routingDecisions: [{ escalationId: 'escalation-routing-003' }],
    escalationChains: [{ chainId: 'escalation-chain-003' }],
    auditArtifacts: [auditArtifact],
    telemetry: [telemetry],
  });
  const observability = buildEscalationObservabilityView({
    telemetry: [telemetry],
    snapshots: [snapshot],
    auditArtifacts: [auditArtifact],
  });

  assert.equal(telemetry.governanceDomain, 'escalation');
  assert.equal(telemetry.governanceVersion, '5.6');
  assert.equal(telemetry.taxonomyCategory, 'governance.escalation.advisory');
  assert.equal(observability.telemetry.totalTelemetry, 1);
  assert.equal(observability.snapshots.totalSnapshots, 1);
  assert.equal(observability.auditArtifacts.totalAuditArtifacts, 1);
  assert.equal(validateEscalationSnapshotConsistency(snapshot).valid, true);
  assert.equal(validateEscalationObservability({
    telemetry: [telemetry],
    snapshots: [snapshot],
    auditArtifacts: [auditArtifact],
  }).valid, true);
});

test('Phase 5.6 escalation contract preserves runtime sovereignty', () => {
  assert.equal(escalationGovernanceContract.governanceDomain, 'escalation');
  assert.equal(escalationGovernanceContract.mode, 'advisory');
  assert.equal(escalationGovernanceContract.enforcementLevel, 'L0');
  assert.equal(escalationGovernanceContract.additiveRolloutOnly, true);
  assert.equal(escalationGovernanceContract.enforcementAuthority, false);
  assert.equal(escalationGovernanceContract.runtimeSovereigntyPreserved, true);
  assert.equal(escalationGovernanceContract.hiddenEscalationExecutionAuthority, false);
  assert.equal(escalationGovernanceContract.forbiddenDependencies.includes('runtimeBlocking'), true);
  assert.equal(escalationGovernanceContract.forbiddenDependencies.includes('runtimeOrchestration'), true);
  assert.equal(escalationGovernanceContract.forbiddenDependencies.includes('executionBlocking'), true);
  assert.equal(validateEscalationContract(escalationGovernanceContract).valid, true);
});
