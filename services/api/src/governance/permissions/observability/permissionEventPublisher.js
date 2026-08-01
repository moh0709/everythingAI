import crypto from 'node:crypto';
import PermissionEvents from '../telemetry/permissionEvents.js';

export function publishPermissionEvent({
  eventType,
  operatorId = null,
  correlationId = null,
  metadata = {},
  governanceVersion = '5.2'
}) {
  if (!Object.values(PermissionEvents).includes(eventType)) {
    throw new Error(`Unknown permission event type: ${eventType}`);
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
