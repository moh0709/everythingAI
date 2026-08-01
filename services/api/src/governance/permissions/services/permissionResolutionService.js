export function buildPermissionContext({
  operatorId,
  roleIds = [],
  effectivePermissions = [],
  governanceVersion = '5.2',
  traceContext = {},
  resolutionTimestamp = new Date().toISOString()
}) {
  return Object.freeze({
    operatorId,
    roleIds: [...roleIds].filter(Boolean).sort(),
    effectivePermissions: [...effectivePermissions],
    governanceVersion,
    traceContext,
    resolutionTimestamp,
    mode: 'observational',
    enforcementLevel: 'L0'
  });
}

export function resolveEffectivePermissions(rolePermissions = []) {
  const byPermissionKey = new Map();

  for (const rolePermission of rolePermissions) {
    if (!rolePermission || !rolePermission.permissionKey) {
      continue;
    }

    const existing = byPermissionKey.get(rolePermission.permissionKey);
    const candidate = Object.freeze({
      permissionKey: rolePermission.permissionKey,
      roleId: rolePermission.roleId || null,
      inheritedFromRoleId: rolePermission.inheritedFromRoleId || null,
      source: rolePermission.inheritedFromRoleId ? 'inherited' : rolePermission.source || 'direct',
      mode: 'observational'
    });

    if (!existing || JSON.stringify(candidate).localeCompare(JSON.stringify(existing)) < 0) {
      byPermissionKey.set(rolePermission.permissionKey, candidate);
    }
  }

  return Object.freeze(
    [...byPermissionKey.values()].sort((first, second) => (
      first.permissionKey.localeCompare(second.permissionKey)
    ))
  );
}
