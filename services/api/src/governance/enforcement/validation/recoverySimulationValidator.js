export function validateRecoverySimulation(simulation = {}) {
  const valid = simulation.rollbackRestoredShadow === true
    && simulation.telemetryReplayed === true
    && simulation.snapshotsRebuilt === true
    && simulation.certificationRecovered === true;

  return Object.freeze({
    valid,
    severity: valid ? 'ENF-0' : 'ENF-4',
    validatedAt: new Date().toISOString(),
  });
}
