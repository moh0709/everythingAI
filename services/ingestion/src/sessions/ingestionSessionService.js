const crypto = require('crypto');

function createIngestionSession(source = {}) {
  return Object.freeze({
    sessionId: crypto.randomUUID(),
    source,
    status: 'DISCOVERING',
    filesDiscovered: 0,
    filesProcessed: 0,
    errors: [],
    observability: {},
    reconstruction: {},
    createdAt: new Date().toISOString()
  });
}

function updateSessionStatus(session = {}, status = 'DISCOVERING') {
  return Object.freeze({
    ...session,
    status,
    updatedAt: new Date().toISOString()
  });
}

module.exports = {
  createIngestionSession,
  updateSessionStatus
};
