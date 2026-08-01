export function validateAuthorizationDeterminism({ firstResult, secondResult } = {}) {
  const firstComparable = JSON.stringify({
    shadowDecision: firstResult?.shadowDecision,
    signalIds: firstResult?.signalIds,
    runtimeBlocking: firstResult?.runtimeBlocking,
    lifecycleMutation: firstResult?.lifecycleMutation,
  });
  const secondComparable = JSON.stringify({
    shadowDecision: secondResult?.shadowDecision,
    signalIds: secondResult?.signalIds,
    runtimeBlocking: secondResult?.runtimeBlocking,
    lifecycleMutation: secondResult?.lifecycleMutation,
  });
  const valid = firstComparable === secondComparable;

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-4',
    validatedAt: new Date().toISOString(),
  });
}
