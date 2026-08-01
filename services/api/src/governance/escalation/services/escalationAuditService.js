function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}

export function createEscalationAuditArtifact({
  auditId,
  escalationId,
  eventType,
  actorId,
  evidence = {},
  rationale = 'Escalation audit artifact recorded for advisory governance review.',
  recordedAt = new Date().toISOString()
} = {}) {
  if (!auditId) {
    throw new Error('escalation audit artifact requires auditId');
  }

  return deepFreeze({
    auditId,
    escalationId: escalationId || null,
    eventType: eventType || 'escalation.audit_recorded',
    actorId: actorId || null,
    evidence,
    rationale,
    governanceVersion: '5.6',
    governanceDomain: 'escalation',
    immutable: true,
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    orchestrationAuthority: false,
    executionBlockingAuthority: false,
    recordedAt
  });
}
