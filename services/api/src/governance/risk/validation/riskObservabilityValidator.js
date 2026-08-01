export function validateRiskObservabilitySynchronization({
  telemetry = [],
  snapshots = []
} = {}) {
  const telemetryValid = telemetry.every((event) => (
    event.governanceDomain === 'risk'
      && event.governanceVersion === '5.4'
      && event.taxonomyCategory === 'governance.risk.advisory'
  ));
  const snapshotsValid = snapshots.every((snapshot) => (
    snapshot.governanceDomain === 'risk'
      && Array.isArray(snapshot.telemetry)
  ));
  const valid = telemetry.length > 0 && snapshots.length > 0 && telemetryValid && snapshotsValid;

  return Object.freeze({
    valid,
    severity: valid ? 'RV-0' : 'RV-3'
  });
}
