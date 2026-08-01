function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}

export function createAuthorizationEvidenceArtifact({
  artifactId,
  decisionId,
  correlationId = null,
  eventType = 'authorization.evidence_recorded',
  evidence = {},
  rationale = 'Authorization evidence artifact recorded for centralized shadow governance review.',
  recordedAt = new Date().toISOString(),
} = {}) {
  if (!artifactId) {
    throw new Error('authorization evidence artifact requires artifactId');
  }

  return deepFreeze({
    artifactId,
    decisionId: decisionId || null,
    correlationId,
    eventType,
    evidence,
    rationale,
    governanceDomain: 'authorization',
    governanceVersion: '5.7',
    immutable: true,
    shadowOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    runtimeExecutionAuthority: false,
    recordedAt,
  });
}
