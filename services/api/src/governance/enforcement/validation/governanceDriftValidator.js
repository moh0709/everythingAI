export function validateGovernanceDrift({ baselineHash, currentHash } = {}) {
  const valid = Boolean(baselineHash) && baselineHash === currentHash;

  return Object.freeze({
    valid,
    driftDetected: !valid,
    severity: valid ? 'ENF-0' : 'ENF-4',
    validatedAt: new Date().toISOString(),
  });
}
