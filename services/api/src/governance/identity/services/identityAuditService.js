function buildIdentityAuditArtifact({
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

function recordIdentityAudit(input) {
  return buildIdentityAuditArtifact(input);
}

module.exports = {
  buildIdentityAuditArtifact,
  recordIdentityAudit
};
