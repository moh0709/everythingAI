export function validatePermissionInheritance(effectivePermissions = []) {
  const seen = new Set();
  const duplicatePermissionKeys = [];

  for (const permission of effectivePermissions) {
    if (!permission || !permission.permissionKey) {
      continue;
    }

    if (seen.has(permission.permissionKey)) {
      duplicatePermissionKeys.push(permission.permissionKey);
    }

    seen.add(permission.permissionKey);
  }

  return Object.freeze({
    valid: duplicatePermissionKeys.length === 0,
    duplicatePermissionKeys,
    severity: duplicatePermissionKeys.length ? 'IV-4' : 'IV-0',
    validatedAt: new Date().toISOString()
  });
}
