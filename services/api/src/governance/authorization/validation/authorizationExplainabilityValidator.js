export function validateAuthorizationExplainability(chain = {}) {
  const explanations = chain.explanations || [];
  const valid = chain.governanceDomain === 'authorization'
    && chain.immutable === true
    && chain.shadowOnly === true
    && explanations.length > 0
    && explanations.every((item) => item.signalId && item.sourceDomain && item.rationale);

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-3',
    validatedAt: new Date().toISOString(),
  });
}
