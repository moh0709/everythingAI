const {
  simulateAuthorizationDecision
} = require('./shadowDecisionSimulationService');
const {
  buildDecisionExplanation
} = require('./governanceExplainabilityService');
const {
  buildAuthorizationSnapshot
} = require('./authorizationDecisionSnapshotBuilder');

function freezeEvaluationArtifacts(artifacts = {}) {
  return Object.freeze({
    advisoryOnly: true,
    ...artifacts,
    frozenAt: new Date().toISOString()
  });
}

function aggregateSimulationResults(results = []) {
  return freezeEvaluationArtifacts({
    totalResults: results.length,
    results
  });
}

function buildShadowEvaluationSummary(results = {}) {
  return freezeEvaluationArtifacts({
    summaryGenerated: true,
    results,
    generatedAt: new Date().toISOString()
  });
}

function runShadowEvaluation(context = {}) {
  const simulation = simulateAuthorizationDecision(context);

  const explanation = buildDecisionExplanation({
    decision: simulation.decision,
    reason: 'Advisory governance simulation'
  });

  const snapshot = buildAuthorizationSnapshot({
    decision: simulation.decision,
    explanation
  });

  return freezeEvaluationArtifacts({
    simulation,
    explanation,
    snapshot
  });
}

module.exports = {
  freezeEvaluationArtifacts,
  aggregateSimulationResults,
  buildShadowEvaluationSummary,
  runShadowEvaluation
};
