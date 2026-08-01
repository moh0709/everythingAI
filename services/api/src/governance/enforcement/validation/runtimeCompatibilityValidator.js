export function validateRuntimeCompatibility(candidate = {}) {
  const valid = candidate.runtimeSafeguardSupremacy === true
    && candidate.runtimeSafeguardsAuthoritative === true
    && candidate.lifecycleMutation === false
    && candidate.hiddenEscalation === false;

  return Object.freeze({
    valid,
    severity: valid ? 'ENF-0' : 'ENF-4',
    validatedAt: new Date().toISOString(),
  });
}
