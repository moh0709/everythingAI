function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}

export function createApprovalAuditArtifact({
  auditId,
  approvalId,
  eventType,
  actorId,
  evidence = {},
  rationale = 'Approval audit artifact recorded for advisory governance review.',
  recordedAt = new Date().toISOString()
} = {}) {
  if (!auditId) {
    throw new Error('approval audit artifact requires auditId');
  }

  return deepFreeze({
    auditId,
    approvalId: approvalId || null,
    eventType: eventType || 'approval.audit_recorded',
    actorId: actorId || null,
    evidence,
    rationale,
    governanceVersion: '5.5',
    governanceDomain: 'approval',
    immutable: true,
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    recordedAt
  });
}
