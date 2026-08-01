export function validateAuthorizationObservability({
  telemetry = [],
  snapshots = [],
  evidenceArtifacts = [],
} = {}) {
  const valid = telemetry.every((item) => item.governanceDomain === 'authorization'
      && item.taxonomyCategory === 'governance.authorization.shadow'
      && item.runtimeBlocking === false)
    && snapshots.every((item) => item.governanceDomain === 'authorization'
      && item.shadowOnly === true
      && item.runtimeBlocking === false)
    && evidenceArtifacts.every((item) => item.governanceDomain === 'authorization'
      && item.immutable === true
      && item.runtimeBlocking === false);

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-3',
    validatedAt: new Date().toISOString(),
  });
}
