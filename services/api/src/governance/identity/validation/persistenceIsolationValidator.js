export const FORBIDDEN_PERSISTENCE_FIELDS = Object.freeze([
  'runtimeState',
  'executionAuthority',
  'lifecycleOwnership',
  'blockingCapability',
  'executionPrivileges'
]);

export function validatePersistenceIsolation(target = {}) {
  const violations = FORBIDDEN_PERSISTENCE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(target, field)
  );

  return Object.freeze({
    valid: violations.length === 0,
    violations,
    severity: violations.length ? 'IV-4' : 'IV-0',
    validatedAt: new Date().toISOString()
  });
}
