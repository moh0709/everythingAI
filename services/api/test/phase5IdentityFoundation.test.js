import test from 'node:test';
import assert from 'node:assert/strict';

import identityGovernanceContract from '../src/governance/identity/contracts/identityGovernanceContract.js';
import { createIdentityMetadataModel } from '../src/governance/identity/models/identityMetadataModel.js';
import { createOperatorModel } from '../src/governance/identity/models/operatorModel.js';
import { createOperatorRoleModel } from '../src/governance/identity/models/operatorRoleModel.js';
import { createRoleModel } from '../src/governance/identity/models/roleModel.js';
import {
  buildIdentityContext,
  resolveOperator,
  resolveOperatorRoles,
} from '../src/governance/identity/services/identityResolutionService.js';
import { recordIdentityAudit } from '../src/governance/identity/services/identityAuditService.js';
import { publishIdentityEvent } from '../src/governance/identity/observability/identityEventPublisher.js';
import { normalizeIdentityEvent } from '../src/governance/identity/observability/identityTelemetryService.js';
import { buildGovernanceObservabilityView } from '../src/governance/identity/observability/identityObservabilityAggregator.js';
import { buildSnapshot, validateSnapshotConsistency } from '../src/governance/identity/observability/observabilitySnapshotBuilder.js';
import { validateIdentityObservability } from '../src/governance/identity/validation/identityObservabilityValidator.js';
import { validatePersistenceIsolation } from '../src/governance/identity/validation/persistenceIsolationValidator.js';
import { validateRuntimeIsolation } from '../src/governance/identity/validation/identityIsolationValidator.js';
import { validateIdentityDeterminism } from '../src/governance/identity/validation/identityDeterminismValidator.js';

test('Phase 5.1 identity models persist only observational governance metadata', () => {
  const operator = createOperatorModel({
    operatorId: 'op-001',
    displayName: 'Operations Lead',
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  });
  const role = createRoleModel({
    roleId: 'role-observer',
    roleName: 'governance-observer',
    createdAt: '2026-08-01T12:00:00.000Z',
  });
  const assignment = createOperatorRoleModel({
    assignmentId: 'assign-001',
    operatorId: operator.operatorId,
    roleId: role.roleId,
    assignedAt: '2026-08-01T12:00:00.000Z',
  });
  const metadata = createIdentityMetadataModel({
    metadataId: 'meta-001',
    operatorId: operator.operatorId,
    traceContext: { issue: 6, rollout: 'phase-5.1' },
    createdAt: '2026-08-01T12:00:00.000Z',
  });

  for (const record of [operator, role, assignment, metadata]) {
    assert.equal(Object.isFrozen(record), true);
    assert.equal(validatePersistenceIsolation(record).valid, true);
    assert.doesNotMatch(JSON.stringify(record), /authorize|deny|blockingCapability|executionAuthority/i);
  }
});

test('Phase 5.1 role resolution is deterministic and observational only', () => {
  const assignments = [
    { roleName: 'workspace-reviewer' },
    { roleName: 'governance-observer' },
    { roleName: '' },
  ];

  const firstRoles = resolveOperatorRoles(assignments);
  const secondRoles = resolveOperatorRoles(assignments);
  const identityContext = buildIdentityContext({
    operatorId: 'op-001',
    resolvedRoles: firstRoles,
    traceContext: { correlationId: 'corr-001' },
    resolutionTimestamp: '2026-08-01T12:00:00.000Z',
  });

  assert.deepEqual(resolveOperator({ operatorId: 'op-001', displayName: 'Operations Lead' }), {
    operatorId: 'op-001',
    displayName: 'Operations Lead',
    status: 'active',
  });
  assert.deepEqual(firstRoles, ['governance-observer', 'workspace-reviewer']);
  assert.equal(identityContext.mode, 'observational');
  assert.equal(validateIdentityDeterminism({
    input: assignments,
    firstResult: firstRoles,
    secondResult: secondRoles,
  }).valid, true);
});

test('Phase 5.1 observability synchronizes telemetry, audit, snapshots, and validation', () => {
  const event = publishIdentityEvent({
    eventType: 'IDENTITY_RESOLVED',
    operatorId: 'op-001',
    correlationId: 'corr-001',
    metadata: { issue: 6 },
  });
  const telemetry = normalizeIdentityEvent(event);
  const audit = recordIdentityAudit({
    auditId: 'audit-001',
    operatorId: 'op-001',
    action: 'IDENTITY_RESOLVED',
    timestamp: '2026-08-01T12:00:00.000Z',
    metadata: { correlationId: 'corr-001' },
  });
  const snapshot = buildSnapshot({
    operators: [{ operatorId: 'op-001' }],
    roles: [{ roleId: 'role-observer' }],
    assignments: [{ assignmentId: 'assign-001' }],
    telemetry: [telemetry],
    auditArtifacts: [audit],
  });
  const view = buildGovernanceObservabilityView({
    telemetry: [telemetry],
    auditArtifacts: [audit],
    correlationChains: [{ correlationId: 'corr-001' }],
  });

  assert.equal(view.telemetry.totalTelemetry, 1);
  assert.equal(view.auditArtifacts.totalAuditArtifacts, 1);
  assert.equal(view.correlationChains.totalCorrelationChains, 1);
  assert.equal(validateSnapshotConsistency(snapshot).valid, true);
  assert.equal(validateIdentityObservability({
    telemetry: [telemetry],
    auditArtifacts: [audit],
    snapshots: [snapshot],
  }).valid, true);
});

test('Phase 5.1 identity contract preserves runtime sovereignty and disables enforcement', () => {
  assert.equal(identityGovernanceContract.governanceDomain, 'identity');
  assert.equal(identityGovernanceContract.mode, 'observational');
  assert.equal(identityGovernanceContract.enforcementLevel, 'L0');
  assert.equal(identityGovernanceContract.blastRadius, 'BR-1');
  assert.equal(identityGovernanceContract.forbiddenDependencies.includes('runtimeExecution'), true);
  assert.equal(identityGovernanceContract.forbiddenDependencies.includes('enforcementBlocking'), true);
  assert.equal(validateRuntimeIsolation(identityGovernanceContract).valid, true);
});
