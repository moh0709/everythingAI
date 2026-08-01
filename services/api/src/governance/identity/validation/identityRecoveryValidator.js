export function validateIdentityRecovery({
  telemetryRebuilt = true,
  auditRebuilt = true,
  snapshotsRebuilt = true,
  correlationsRebuilt = true
} = {}) {
  const valid = telemetryRebuilt
    && auditRebuilt
    && snapshotsRebuilt
    && correlationsRebuilt;

  return Object.freeze({
    valid,
    telemetryRebuilt,
    auditRebuilt,
    snapshotsRebuilt,
    correlationsRebuilt,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
