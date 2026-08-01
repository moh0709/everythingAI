export function validatePolicyObservability({
  telemetry = [],
  snapshots = []
} = {}) {
  const telemetryValid = telemetry.every((event) => (
    event.governanceDomain === 'policy'
      && event.governanceVersion === '5.3'
      && event.taxonomyCategory === 'governance.policy.shadow'
  ));
  const snapshotsValid = snapshots.every((snapshot) => (
    snapshot.governanceDomain === 'policy'
      && Array.isArray(snapshot.telemetry)
  ));
  const valid = telemetry.length > 0 && snapshots.length > 0 && telemetryValid && snapshotsValid;

  return Object.freeze({
    valid,
    severity: valid ? 'PV-0' : 'PV-3'
  });
}
