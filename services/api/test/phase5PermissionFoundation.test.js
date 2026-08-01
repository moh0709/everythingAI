import test from 'node:test';
import assert from 'node:assert/strict';

import permissionGovernanceContract from '../src/governance/permissions/contracts/permissionGovernanceContract.js';
import { createPermissionModel } from '../src/governance/permissions/models/permissionModel.js';
import { createRolePermissionModel } from '../src/governance/permissions/models/rolePermissionModel.js';
import {
  buildPermissionContext,
  resolveEffectivePermissions,
} from '../src/governance/permissions/services/permissionResolutionService.js';
import { recordPermissionAudit } from '../src/governance/permissions/services/permissionAuditService.js';
import { publishPermissionEvent } from '../src/governance/permissions/observability/permissionEventPublisher.js';
import { normalizePermissionEvent } from '../src/governance/permissions/observability/permissionTelemetryService.js';
import { buildPermissionObservabilityView } from '../src/governance/permissions/observability/permissionObservabilityAggregator.js';
import {
  buildPermissionSnapshot,
  validatePermissionSnapshotConsistency,
} from '../src/governance/permissions/observability/permissionSnapshotBuilder.js';
import { validatePermissionDeterminism } from '../src/governance/permissions/validation/permissionDeterminismValidator.js';
import { validatePermissionInheritance } from '../src/governance/permissions/validation/permissionInheritanceValidator.js';
import { validatePermissionObservability } from '../src/governance/permissions/validation/permissionObservabilityValidator.js';
import { validatePermissionRuntimeIsolation } from '../src/governance/permissions/validation/permissionRuntimeIsolationValidator.js';

test('Phase 5.2 permission models persist only observational governance metadata', () => {
  const permission = createPermissionModel({
    permissionId: 'perm-read-knowledge',
    permissionKey: 'knowledge.read',
    permissionDomain: 'knowledge',
    createdAt: '2026-08-01T13:00:00.000Z',
  });
  const rolePermission = createRolePermissionModel({
    rolePermissionId: 'rp-001',
    roleId: 'role-observer',
    permissionKey: permission.permissionKey,
    source: 'direct',
    grantedAt: '2026-08-01T13:00:00.000Z',
  });

  for (const record of [permission, rolePermission]) {
    assert.equal(Object.isFrozen(record), true);
    assert.equal(record.mode, 'observational');
    assert.equal(record.governanceVersion, '5.2');
    assert.doesNotMatch(JSON.stringify(record), /authorize|deny|blockingCapability|executionAuthority/i);
  }
});

test('Phase 5.2 permission inheritance is deterministic and observational only', () => {
  const rolePermissions = [
    { roleId: 'role-admin', permissionKey: 'workspace.manage', inheritedFromRoleId: null },
    { roleId: 'role-observer', permissionKey: 'knowledge.read', inheritedFromRoleId: 'role-admin' },
    { roleId: 'role-observer', permissionKey: 'knowledge.read', inheritedFromRoleId: 'role-admin' },
    { roleId: 'role-observer', permissionKey: '' },
  ];

  const firstResult = resolveEffectivePermissions(rolePermissions);
  const secondResult = resolveEffectivePermissions(rolePermissions);
  const permissionContext = buildPermissionContext({
    operatorId: 'op-001',
    roleIds: ['role-observer', 'role-admin'],
    effectivePermissions: firstResult,
    traceContext: { correlationId: 'corr-perm-001' },
    resolutionTimestamp: '2026-08-01T13:00:00.000Z',
  });

  assert.deepEqual(firstResult.map((permission) => permission.permissionKey), [
    'knowledge.read',
    'workspace.manage',
  ]);
  assert.equal(permissionContext.mode, 'observational');
  assert.equal(permissionContext.enforcementLevel, 'L0');
  assert.equal(validatePermissionDeterminism({
    input: rolePermissions,
    firstResult,
    secondResult,
  }).valid, true);
  assert.equal(validatePermissionInheritance(firstResult).valid, true);
});

test('Phase 5.2 permission observability synchronizes telemetry audit and snapshots', () => {
  const event = publishPermissionEvent({
    eventType: 'PERMISSIONS_RESOLVED',
    operatorId: 'op-001',
    correlationId: 'corr-perm-001',
    metadata: { issue: 7 },
  });
  const telemetry = normalizePermissionEvent(event);
  const audit = recordPermissionAudit({
    auditId: 'perm-audit-001',
    operatorId: 'op-001',
    action: 'PERMISSIONS_RESOLVED',
    timestamp: '2026-08-01T13:00:00.000Z',
    metadata: { correlationId: 'corr-perm-001' },
  });
  const snapshot = buildPermissionSnapshot({
    permissions: [{ permissionKey: 'knowledge.read' }],
    rolePermissions: [{ rolePermissionId: 'rp-001' }],
    effectivePermissions: [{ permissionKey: 'knowledge.read' }],
    telemetry: [telemetry],
    auditArtifacts: [audit],
  });
  const view = buildPermissionObservabilityView({
    telemetry: [telemetry],
    auditArtifacts: [audit],
    snapshots: [snapshot],
  });

  assert.equal(view.telemetry.totalTelemetry, 1);
  assert.equal(view.auditArtifacts.totalAuditArtifacts, 1);
  assert.equal(view.snapshots.totalSnapshots, 1);
  assert.equal(validatePermissionSnapshotConsistency(snapshot).valid, true);
  assert.equal(validatePermissionObservability({
    telemetry: [telemetry],
    auditArtifacts: [audit],
    snapshots: [snapshot],
  }).valid, true);
});

test('Phase 5.2 permission contract preserves centralized architecture without enforcement activation', () => {
  assert.equal(permissionGovernanceContract.governanceDomain, 'permissions');
  assert.equal(permissionGovernanceContract.mode, 'observational');
  assert.equal(permissionGovernanceContract.enforcementLevel, 'L0');
  assert.equal(permissionGovernanceContract.blastRadius, 'BR-1');
  assert.equal(permissionGovernanceContract.centralAuthorizationArchitecture, true);
  assert.equal(permissionGovernanceContract.hiddenAuthorization, false);
  assert.equal(permissionGovernanceContract.forbiddenDependencies.includes('runtimeExecution'), true);
  assert.equal(permissionGovernanceContract.forbiddenDependencies.includes('enforcementBlocking'), true);
  assert.equal(validatePermissionRuntimeIsolation(permissionGovernanceContract).valid, true);
});
