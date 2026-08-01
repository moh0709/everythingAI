import crypto from 'node:crypto';

export function buildRiskClassificationInput({
  subjectId,
  operationType,
  correlationId = null,
  signals = [],
  requestedAt = new Date().toISOString()
} = {}) {
  return Object.freeze({
    subjectId,
    operationType,
    correlationId,
    signals: Object.freeze([...signals]),
    requestedAt
  });
}

function sortSignals(signals = []) {
  return [...signals].sort((first, second) => (
    String(first.signalId || '').localeCompare(String(second.signalId || ''))
  ));
}

function classifyScore(score) {
  if (score >= 75) {
    return 'critical';
  }
  if (score >= 50) {
    return 'elevated';
  }
  if (score >= 25) {
    return 'moderate';
  }
  return 'low';
}

export function classifyOperationalRisk({ input = {} } = {}) {
  const sortedSignals = sortSignals(input.signals || []);
  const riskScore = sortedSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const riskFactors = sortedSignals.map((signal) => Object.freeze({
    signalId: signal.signalId,
    category: signal.category,
    severity: signal.severity,
    weight: signal.weight
  }));
  const explanations = sortedSignals.map((signal) => Object.freeze({
    signalId: signal.signalId,
    category: signal.category,
    severity: signal.severity,
    rationale: signal.rationale,
    contribution: signal.weight
  }));

  return Object.freeze({
    classificationId: crypto.randomUUID(),
    subjectId: input.subjectId || null,
    operationType: input.operationType || null,
    correlationId: input.correlationId || null,
    governanceVersion: '5.4',
    governanceDomain: 'risk',
    mode: 'advisory',
    enforcementLevel: 'L0',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    riskScore,
    riskLevel: classifyScore(riskScore),
    riskFactors,
    explanations,
    classifiedAt: new Date().toISOString()
  });
}
