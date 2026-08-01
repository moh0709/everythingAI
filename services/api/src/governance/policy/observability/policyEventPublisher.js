import crypto from 'node:crypto';
import PolicyEvents from '../telemetry/policyEvents.js';

export function publishPolicyEvent({
  eventType,
  policyId = null,
  subjectId = null,
  correlationId = null,
  metadata = {},
  governanceVersion = '5.3'
} = {}) {
  if (!Object.values(PolicyEvents).includes(eventType)) {
    throw new Error(`Unknown policy event type: ${eventType}`);
  }

  return Object.freeze({
    eventId: crypto.randomUUID(),
    eventType,
    policyId,
    subjectId,
    correlationId,
    timestamp: new Date().toISOString(),
    governanceVersion,
    governanceDomain: 'policy',
    taxonomyCategory: 'governance.policy.shadow',
    metadata
  });
}
