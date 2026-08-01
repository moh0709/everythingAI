export function validateShadowConsistency(result = {}) {
  const valid = result.shadowMode === true
    && result.runtimeDecisionPreserved === true
    && result.lifecycleMutation === false
    && result.blockingEffect === false
    && result.enforced === false
    && Boolean(result.runtimeDecision);

  return Object.freeze({
    valid,
    severity: valid ? 'PV-0' : 'PV-4'
  });
}
