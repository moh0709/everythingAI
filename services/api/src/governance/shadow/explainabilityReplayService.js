function freezeReplayArtifacts(artifacts = {}) {
  return Object.freeze({
    replayable: true,
    immutable: true,
    ...artifacts,
    replayedAt: new Date().toISOString()
  });
}

function replayDecisionExplanation(explanation = {}) {
  return freezeReplayArtifacts({
    replayType: 'decision',
    explanation
  });
}

function replayPolicyTrace(trace = {}) {
  return freezeReplayArtifacts({
    replayType: 'policy',
    trace
  });
}

function replayRiskTrace(trace = {}) {
  return freezeReplayArtifacts({
    replayType: 'risk',
    trace
  });
}

module.exports = {
  freezeReplayArtifacts,
  replayDecisionExplanation,
  replayPolicyTrace,
  replayRiskTrace
};
