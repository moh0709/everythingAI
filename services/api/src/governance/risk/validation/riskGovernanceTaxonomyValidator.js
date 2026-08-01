export function validateRiskGovernanceTaxonomy(events = []) {
  const valid = events.length > 0 && events.every((event) => (
    event.governanceDomain === 'risk'
      && event.governanceVersion === '5.4'
      && event.taxonomyCategory === 'governance.risk.advisory'
  ));

  return Object.freeze({
    valid,
    severity: valid ? 'RV-0' : 'RV-3'
  });
}
