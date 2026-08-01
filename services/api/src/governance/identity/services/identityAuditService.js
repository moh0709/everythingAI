export function buildIdentityAuditArtifact({
  auditId,
  operatorId,
  action,
  timestamp,
  governanceVersion = '5.1',
  metadata = {}
}) {
  return Object.freeze({
    auditId,
    artifactType: 'IDENTITY_AUDIT',
    operatorId,
    action,
    timestamp,
    immutable: true,
    governanceVersion,
    metadata
  });
}

export function recordIdentityAudit(input) {
  return buildIdentityAuditArtifact(input);
}
