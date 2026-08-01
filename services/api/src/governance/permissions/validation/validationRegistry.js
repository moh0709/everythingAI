const permissionValidationRegistry = Object.freeze({
  permissionDeterminism: {
    enabled: true,
    severity: 'PV-2'
  },
  permissionInheritance: {
    enabled: true,
    severity: 'PV-3'
  },
  runtimeIsolation: {
    enabled: true,
    severity: 'PV-4'
  },
  observabilitySynchronization: {
    enabled: true,
    severity: 'PV-2'
  }
});

export default permissionValidationRegistry;
