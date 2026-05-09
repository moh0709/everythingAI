const validationRegistry = Object.freeze({
  identityDeterminism: {
    enabled: true,
    severity: 'IV-2'
  },
  runtimeIsolation: {
    enabled: true,
    severity: 'IV-4'
  },
  telemetryIntegrity: {
    enabled: true,
    severity: 'IV-2'
  },
  auditImmutability: {
    enabled: true,
    severity: 'IV-4'
  }
});

module.exports = validationRegistry;
