const crypto = require('crypto');

function freezeDecisionSnapshot(snapshot = {}) {
  return Object.freeze({
    advisoryOnly: true,
    immutable: true,
    ...snapshot,
    frozenAt: new Date().toISOString()
  });
}

function buildAuthorizationSnapshot({
  decision,
  explanation = null,
  governanceVersion = '5.2'
} = {}) {
  return freezeDecisionSnapshot({
    snapshotId: crypto.randomUUID(),
    governanceVersion,
    decision,
    explanation,
    snapshotTimestamp: new Date().toISOString()
  });
}

function reconstructDecisionSnapshot(snapshot = {}) {
  return freezeDecisionSnapshot({
    ...snapshot,
    reconstructed: true,
    reconstructedAt: new Date().toISOString()
  });
}

function validateSnapshotIntegrity(snapshot = {}) {
  const valid = Boolean(snapshot.snapshotId);

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}

module.exports = {
  freezeDecisionSnapshot,
  buildAuthorizationSnapshot,
  reconstructDecisionSnapshot,
  validateSnapshotIntegrity
};
