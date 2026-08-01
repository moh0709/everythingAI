import test from 'node:test';
import assert from 'node:assert/strict';

import approvalGovernanceContract from '../src/governance/approval/contracts/approvalGovernanceContract.js';
import ApprovalEvents from '../src/governance/approval/telemetry/approvalEvents.js';
import { createApprovalRequestModel } from '../src/governance/approval/models/approvalRequestModel.js';
import { createApprovalChainStepModel } from '../src/governance/approval/models/approvalChainStepModel.js';
import {
  buildApprovalLifecycleInput,
  evaluateApprovalLifecycle,
} from '../src/governance/approval/services/approvalLifecycleService.js';
import { buildExplainableApprovalChain } from '../src/governance/approval/services/approvalChainService.js';
import { createApprovalAuditArtifact } from '../src/governance/approval/services/approvalAuditService.js';
import { publishApprovalEvent } from '../src/governance/approval/observability/approvalEventPublisher.js';
import { normalizeApprovalEvent } from '../src/governance/approval/observability/approvalTelemetryService.js';
import { buildApprovalObservabilityView } from '../src/governance/approval/observability/approvalObservabilityAggregator.js';
import {
  buildApprovalSnapshot,
  validateApprovalSnapshotConsistency,
} from '../src/governance/approval/observability/approvalSnapshotBuilder.js';
import { validateApprovalLifecycle } from '../src/governance/approval/validation/approvalLifecycleValidator.js';
import { validateApprovalDeterminism } from '../src/governance/approval/validation/approvalDeterminismValidator.js';
import { validateApprovalObservability } from '../src/governance/approval/validation/approvalObservabilityValidator.js';
import { validateApprovalInvariants } from '../src/governance/approval/validation/approvalInvariantValidator.js';

test('Phase 5.5 approval lifecycle is deterministic advisory and explainable', () => {
  const request = createApprovalRequestModel({
    approvalId: 'approval-request-001',
    subjectId: 'workspace-export-001',
    operationType: 'workspace.export',
    requestedBy: 'operator-001',
    rationale: 'Workspace export requires advisory approval chain visibility.',
  });
  const steps = [
    createApprovalChainStepModel({
      stepId: 'approval-step-security',
      approverRole: 'security_reviewer',
      state: 'reviewed',
      order: 20,
      rationale: 'Security review confirms runtime safeguards remain authoritative.',
    }),
    createApprovalChainStepModel({
      stepId: 'approval-step-owner',
      approverRole: 'workspace_owner',
      state: 'requested',
      order: 10,
      rationale: 'Workspace owner review is required for advisory governance visibility.',
    }),
  ];
  const input = buildApprovalLifecycleInput({
    request,
    chainSteps: steps,
    correlationId: 'corr-approval-001',
  });

  const firstResult = evaluateApprovalLifecycle({ input });
  const secondResult = evaluateApprovalLifecycle({
    input: buildApprovalLifecycleInput({
      request,
      chainSteps: [...steps].reverse(),
      correlationId: 'corr-approval-001',
    }),
  });
  const chain = buildExplainableApprovalChain({ request, chainSteps: steps });

  assert.equal(firstResult.mode, 'advisory');
  assert.equal(firstResult.enforced, false);
  assert.equal(firstResult.runtimeBlocking, false);
  assert.equal(firstResult.lifecycleMutation, false);
  assert.equal(firstResult.approvalState, 'pending');
  assert.deepEqual(firstResult.chainStepIds, ['approval-step-owner', 'approval-step-security']);
  assert.deepEqual(chain.explanations.map((item) => item.stepId), [
    'approval-step-owner',
    'approval-step-security',
  ]);
  assert.equal(validateApprovalLifecycle(firstResult).valid, true);
  assert.equal(validateApprovalDeterminism({ firstResult, secondResult }).valid, true);
});

test('Phase 5.5 approval audit artifacts are immutable and advisory only', () => {
  const artifact = createApprovalAuditArtifact({
    auditId: 'approval-audit-001',
    approvalId: 'approval-request-002',
    eventType: 'approval.lifecycle_evaluated',
    actorId: 'operator-002',
    evidence: {
      approvalState: 'pending',
      advisoryOnly: true,
      runtimeDecisionId: 'runtime-decision-001',
    },
    rationale: 'Lifecycle evaluation recorded for governance review without enforcement authority.',
  });

  assert.equal(artifact.governanceDomain, 'approval');
  assert.equal(artifact.governanceVersion, '5.5');
  assert.equal(artifact.immutable, true);
  assert.equal(artifact.advisoryOnly, true);
  assert.equal(artifact.enforced, false);
  assert.throws(() => {
    artifact.evidence.approvalState = 'approved';
  }, TypeError);
  assert.equal(artifact.evidence.approvalState, 'pending');
});

test('Phase 5.5 approval observability synchronizes telemetry audit artifacts and snapshots', () => {
  const event = publishApprovalEvent({
    eventType: ApprovalEvents.APPROVAL_LIFECYCLE_EVALUATED,
    approvalId: 'approval-request-003',
    correlationId: 'corr-approval-003',
    metadata: { issue: 10 },
  });
  const telemetry = normalizeApprovalEvent(event);
  const auditArtifact = createApprovalAuditArtifact({
    auditId: 'approval-audit-003',
    approvalId: 'approval-request-003',
    eventType: ApprovalEvents.APPROVAL_LIFECYCLE_EVALUATED,
    actorId: 'operator-003',
    evidence: { approvalState: 'pending' },
  });
  const snapshot = buildApprovalSnapshot({
    lifecycleEvaluations: [{ evaluationId: 'approval-evaluation-003' }],
    approvalChains: [{ chainId: 'approval-chain-003' }],
    auditArtifacts: [auditArtifact],
    telemetry: [telemetry],
  });
  const observability = buildApprovalObservabilityView({
    telemetry: [telemetry],
    snapshots: [snapshot],
    auditArtifacts: [auditArtifact],
  });

  assert.equal(telemetry.governanceDomain, 'approval');
  assert.equal(telemetry.governanceVersion, '5.5');
  assert.equal(telemetry.taxonomyCategory, 'governance.approval.advisory');
  assert.equal(observability.telemetry.totalTelemetry, 1);
  assert.equal(observability.snapshots.totalSnapshots, 1);
  assert.equal(observability.auditArtifacts.totalAuditArtifacts, 1);
  assert.equal(validateApprovalSnapshotConsistency(snapshot).valid, true);
  assert.equal(validateApprovalObservability({
    telemetry: [telemetry],
    snapshots: [snapshot],
    auditArtifacts: [auditArtifact],
  }).valid, true);
});

test('Phase 5.5 approval contract keeps runtime safeguards authoritative', () => {
  assert.equal(approvalGovernanceContract.governanceDomain, 'approval');
  assert.equal(approvalGovernanceContract.mode, 'advisory');
  assert.equal(approvalGovernanceContract.enforcementLevel, 'L0');
  assert.equal(approvalGovernanceContract.additiveRolloutOnly, true);
  assert.equal(approvalGovernanceContract.enforcementAuthority, false);
  assert.equal(approvalGovernanceContract.runtimeSafeguardSupremacy, true);
  assert.equal(approvalGovernanceContract.hiddenApprovalBypasses, false);
  assert.equal(approvalGovernanceContract.forbiddenDependencies.includes('runtimeBlocking'), true);
  assert.equal(approvalGovernanceContract.forbiddenDependencies.includes('runtimeLifecycleMutation'), true);
  assert.equal(approvalGovernanceContract.forbiddenDependencies.includes('safeguardBypass'), true);
  assert.equal(validateApprovalInvariants(approvalGovernanceContract).valid, true);
});
