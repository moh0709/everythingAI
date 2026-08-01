export function createAuthorizationSignalModel({
  signalId,
  sourceDomain,
  priority = 100,
  outcome = 'observed',
  rationale = 'Authorization signal observed for centralized shadow synthesis.',
  metadata = {},
} = {}) {
  if (!signalId) {
    throw new Error('authorization signal requires signalId');
  }
  if (!sourceDomain) {
    throw new Error('authorization signal requires sourceDomain');
  }

  return Object.freeze({
    signalId,
    sourceDomain,
    priority,
    outcome,
    rationale,
    metadata: Object.freeze({ ...metadata }),
    centralizedAuthorizationInput: true,
    shadowOnly: true,
    runtimeBlocking: false,
    lifecycleMutation: false,
    createdAt: new Date().toISOString(),
  });
}
