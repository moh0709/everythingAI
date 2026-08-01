const policyValidationRegistry = Object.freeze({
  policyDeterminism: {
    enabled: true,
    severity: 'PV-4'
  },
  shadowConsistency: {
    enabled: true,
    severity: 'PV-4'
  },
  runtimeCompatibility: {
    enabled: true,
    severity: 'PV-4'
  },
  policyInvariants: {
    enabled: true,
    severity: 'PV-4'
  },
  governanceObservability: {
    enabled: true,
    severity: 'PV-3'
  }
});

export default policyValidationRegistry;
