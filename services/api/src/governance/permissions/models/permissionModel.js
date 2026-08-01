export function createPermissionModel({
  permissionId,
  permissionKey,
  permissionDomain = 'governance',
  permissionDescription = null,
  governanceVersion = '5.2',
  createdAt = new Date().toISOString()
}) {
  return Object.freeze({
    permissionId,
    permissionKey,
    permissionDomain,
    permissionDescription,
    governanceVersion,
    createdAt,
    mode: 'observational'
  });
}
