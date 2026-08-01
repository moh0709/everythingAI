export function buildPermissionAuditArtifact({
  auditId,
  operatorId,
  action,
  timestamp,
  governanceVersion = '5.2',
  metadata = {}
}) {
  return Object.freeze({
    auditId,
    artifactType: 'PERMISSION_AUDIT',
    operatorId,
    action,
    timestamp,
    immutable: true,
    governanceVersion,
    metadata
  });
}

export function recordPermissionAudit(input) {
  return buildPermissionAuditArtifact(input);
}
