import crypto from 'node:crypto';

function recommendationForRiskLevel(riskLevel) {
  if (riskLevel === 'critical') {
    return 'pm_review';
  }
  if (riskLevel === 'elevated') {
    return 'governance_review';
  }
  if (riskLevel === 'moderate') {
    return 'operator_attention';
  }
  return 'none';
}

export function recommendRiskEscalation({
  runtimeDecision,
  classification,
  recommendedAt = new Date().toISOString()
} = {}) {
  return Object.freeze({
    recommendationId: crypto.randomUUID(),
    governanceVersion: '5.4',
    governanceDomain: 'risk',
    mode: 'advisory',
    advisoryOnly: true,
    enforced: false,
    blockingEffect: false,
    lifecycleMutation: false,
    runtimeDecision,
    runtimeDecisionPreserved: true,
    classification,
    recommendedEscalation: recommendationForRiskLevel(classification?.riskLevel),
    explanation: `Advisory escalation recommendation for ${classification?.riskLevel || 'unknown'} operational risk.`,
    recommendedAt
  });
}
