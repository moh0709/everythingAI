export function createRolePermissionModel({
  rolePermissionId,
  roleId,
  permissionKey,
  source = 'direct',
  inheritedFromRoleId = null,
  governanceVersion = '5.2',
  grantedAt = new Date().toISOString()
}) {
  return Object.freeze({
    rolePermissionId,
    roleId,
    permissionKey,
    source,
    inheritedFromRoleId,
    governanceVersion,
    grantedAt,
    mode: 'observational'
  });
}
