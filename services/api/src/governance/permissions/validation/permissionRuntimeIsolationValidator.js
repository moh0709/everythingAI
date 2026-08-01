export function validatePermissionRuntimeIsolation(target = {}) {
  const forbiddenProperties = [
    'authorizeExecution',
    'denyExecution',
    'mutateRuntimeState',
    'executeRuntimeAction',
    'updateExecutionLifecycle',
    'blockRuntimeAction',
    'enforcePermission'
  ];

  const violations = forbiddenProperties.filter(
    (property) => typeof target[property] === 'function' || target[property] === true
  );

  return Object.freeze({
    valid: violations.length === 0,
    violations,
    severity: violations.length ? 'IV-4' : 'IV-0'
  });
}
