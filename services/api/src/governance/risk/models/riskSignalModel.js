const allowedSeverities = new Set(['low', 'medium', 'high', 'critical']);

export function createRiskSignalModel({
  signalId,
  category,
  severity = 'low',
  weight = 0,
  rationale,
  observedAt = new Date().toISOString()
} = {}) {
  if (!signalId) {
    throw new Error('risk signal requires signalId');
  }
  if (!allowedSeverities.has(severity)) {
    throw new Error(`unknown risk severity: ${severity}`);
  }

  return Object.freeze({
    signalId,
    category: category || 'operational',
    severity,
    weight: Number.isFinite(weight) ? weight : 0,
    rationale: rationale || 'Risk signal recorded for advisory governance classification.',
    mode: 'advisory',
    governanceVersion: '5.4',
    observedAt
  });
}
