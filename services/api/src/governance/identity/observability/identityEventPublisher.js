const crypto = require('crypto');
const IdentityEvents = require('../telemetry/identityEvents');

function publishIdentityEvent({
  eventType,
  operatorId = null,
  correlationId = null,
  metadata = {},
  governanceVersion = '5.1'
}) {
  if (!Object.values(IdentityEvents).includes(eventType)) {
    throw new Error(`Unknown identity event type: ${eventType}`);
  }

  return Object.freeze({
    eventId: crypto.randomUUID(),
    eventType,
    operatorId,
    correlationId,
    timestamp: new Date().toISOString(),
    governanceVersion,
    metadata
  });
}

module.exports = {
  publishIdentityEvent
};
