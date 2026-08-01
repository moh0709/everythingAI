import crypto from 'node:crypto';

export function freezePermissionSnapshot(snapshot = {}) {
  return Object.freeze({
    ...snapshot,
    frozenAt: new Date().toISOString()
  });
}

export function buildPermissionSnapshot({
  permissions = [],
  rolePermissions = [],
  effectivePermissions = [],
  telemetry = [],
  auditArtifacts = [],
  governanceVersion = '5.2'
} = {}) {
  return freezePermissionSnapshot({
    snapshotId: crypto.randomUUID(),
    governanceVersion,
    permissions,
    rolePermissions,
    effectivePermissions,
    telemetry,
    auditArtifacts,
    snapshotTimestamp: new Date().toISOString()
  });
}

export function validatePermissionSnapshotConsistency(snapshot = {}) {
  const valid = Boolean(snapshot.snapshotId)
    && Array.isArray(snapshot.permissions)
    && Array.isArray(snapshot.rolePermissions)
    && Array.isArray(snapshot.effectivePermissions);

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
