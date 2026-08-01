import { deepFreeze } from './deepFreeze.js';

export function createEnforcementEvidenceArtifact({
  artifactId,
  activationId,
  correlationId = null,
  eventType = 'enforcement.evidence_recorded',
  evidence = {},
  rationale = 'Enforcement activation evidence recorded for operational governance review.',
  recordedAt = new Date().toISOString(),
} = {}) {
  if (!artifactId) {
    throw new Error('enforcement evidence artifact requires artifactId');
  }

  return deepFreeze({
    artifactId,
    activationId: activationId || null,
    correlationId,
    eventType,
    evidence,
    rationale,
    governanceDomain: 'enforcement',
    governanceVersion: '5.8',
    immutable: true,
    observableEnforcement: true,
    recoverableEnforcement: true,
    explainableBlockingOnly: true,
    hiddenEscalation: false,
    recordedAt,
  });
}
