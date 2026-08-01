const authorizationValidationRegistry = Object.freeze({
  authorizationDeterminism: {
    enabled: true,
    severity: 'AV-4',
  },
  shadowAuthorizationConsistency: {
    enabled: true,
    severity: 'AV-4',
  },
  authorizationExplainability: {
    enabled: true,
    severity: 'AV-3',
  },
  authorizationObservability: {
    enabled: true,
    severity: 'AV-3',
  },
  authorizationInvariants: {
    enabled: true,
    severity: 'AV-4',
  },
});

export default authorizationValidationRegistry;
