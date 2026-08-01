import crypto from 'node:crypto';
import RiskEvents from '../telemetry/riskEvents.js';

export function publishRiskEvent({
  eventType,
  subjectId = null,
  correlationId = null,
  metadata = {},
  governanceVersion = '5.4'
} = {}) {
  if (!Object.values(RiskEvents).includes(eventType)) {
    throw new Error(`Unknown risk event type: ${eventType}`);
  }

  return Object.freeze({
    eventId: crypto.randomUUID(),
    eventType,
    subjectId,
    correlationId,
    timestamp: new Date().toISOString(),
    governanceVersion,
    governanceDomain: 'risk',
    taxonomyCategory: 'governance.risk.advisory',
    metadata
  });
}
